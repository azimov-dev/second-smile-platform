import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { PatientSuggest } from "../shared/PatientSuggest.jsx";
import { extractUzLocalDigits, toUzPhone } from "../../utils/uzPhone.js";
import {
  Plus,
  Calendar,
  Loader2,
  X,
  Clock,
  User,
  Stethoscope,
} from "lucide-react";

function formatTime(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const s = (status || "").toLowerCase();
  let bg = "bg-sky-100 text-sky-700";
  let text = t("common.active") || "Jarayonda";
  if (s === "completed" || s === "done") {
    bg = "bg-emerald-100 text-emerald-700";
    text = t("common.completed") || "Yakunlangan";
  } else if (s === "cancelled") {
    bg = "bg-red-100 text-red-700";
    text = t("common.cancelled") || "Bekor qilingan";
  }
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${bg}`}
    >
      {text}
    </span>
  );
}

export function ReceptionDashboard() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [doctors, setDoctors] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    birthDate: "",
    address: "",
    notes: "",
    time: "",
    duration: 30,
  });

  const today = new Date().toISOString().slice(0, 10);
  const lang = localStorage.getItem("lang") || "uz";
  const localeMap = { uz: "uz-UZ", uz_cyr: "uz-Cyrl-UZ", uz_new: "uz-UZ", ru: "ru-RU", en: "en-US" };
  const todayFormatted = new Date(today).toLocaleDateString(
    localeMap[lang] || "uz-UZ",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const appointmentsByDoctor = useMemo(() => {
    const map = new Map();
    todayAppointments.forEach((appt) => {
      const doctorId = appt.doctor_id || appt.doctor?.id;
      if (doctorId) {
        map.set(doctorId, (map.get(doctorId) || 0) + 1);
      }
    });
    return map;
  }, [todayAppointments]);

  const upcomingFive = useMemo(() => {
    return [...todayAppointments]
      .sort((a, b) =>
        (a.appointment_date || "").localeCompare(b.appointment_date || ""),
      )
      .slice(0, 5);
  }, [todayAppointments]);

  const loadTodayData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const [appointmentsRes, patientsRes] = await Promise.all([
        apiClient(`/appointments?date=${today}`, { token }),
        apiClient("/patients", { token }),
      ]);

      setTodayAppointments(
        Array.isArray(appointmentsRes) ? appointmentsRes : [],
      );
      setTotalPatients((Array.isArray(patientsRes) ? patientsRes : []).length);
    } catch (err) {
      setError(err.message || "Ma'lumotlarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    if (!token) return;
    try {
      const data = await apiClient("/admin/users", { token });
      const doctorsOnly = (Array.isArray(data) ? data : []).filter(
        (u) => u.role === "doctor",
      );
      setDoctors(
        doctorsOnly.map((d) => ({
          id: d.id,
          fullName: d.full_name || "Doktor",
        })),
      );
    } catch (err) {
      console.error("Failed to load doctors:", err);
      setError("Doktorlarni yuklashda xato");
    }
  };

  useEffect(() => {
    if (token) {
      loadTodayData();
      loadDoctors();
    }
  }, [token]);

  const openModalForDoctor = (doctorId) => {
    setSelectedDoctorId(doctorId);
    setSelectedPatientId(null);
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      birthDate: "",
      address: "",
      notes: "",
      time: "",
      duration: 30,
    });
    setShowModal(true);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const required = ["firstName", "lastName", "phone", "birthDate", "time"];
    if (required.some((f) => !formData[f].trim())) {
      setError("Barcha majburiy maydonlarni to'ldiring");
      return;
    }

    setIsSubmitting(true);
    setError("");
    let patientId = selectedPatientId;

    try {
      const fullPhone = toUzPhone(formData.phone);

      if (!patientId) {
        const searchRes = await apiClient(
          `/patients?phone=${encodeURIComponent(fullPhone)}`,
          { token },
        );
        const existing = Array.isArray(searchRes) ? searchRes : [];
        if (existing.length > 0) {
          patientId = existing[0].id;
        } else {
          const newPatient = await apiClient("/patients", {
            method: "POST",
            token,
            body: {
              first_name: formData.firstName.trim(),
              last_name: formData.lastName.trim(),
              phone: fullPhone,
              birth_date: formData.birthDate,
              address: formData.address.trim() || null,
            },
          });
          patientId = newPatient.id;
        }
      }

      await apiClient("/appointments", {
        method: "POST",
        token,
        body: {
          patient_id: Number(patientId),
          doctor_id: Number(selectedDoctorId),
          appointment_date: new Date(
            `${today}T${formData.time}:00`,
          ).toISOString(),
          duration: Number(formData.duration),
          notes: formData.notes?.trim() || null,
        },
      });

      await loadTodayData();
      setShowModal(false);
      setSelectedPatientId(null);
    } catch (err) {
      setError(err.message || "Qabul yaratishda xato");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("receptionPanel") || "Qabulxona"}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{todayFormatted}</p>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Doctor Queue Cards */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {t("queue.table") || "Bugungi navbat"}
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {doctors.map((doctor) => {
              const count = appointmentsByDoctor.get(doctor.id) || 0;
              return (
                <button
                  key={doctor.id}
                  onClick={() => openModalForDoctor(doctor.id)}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 text-center shadow-md hover:shadow-lg transition-shadow relative overflow-hidden"
                >
                  <p className="font-medium text-green-900 mb-2 truncate">
                    {doctor.fullName}
                  </p>
                  <p className="text-4xl font-bold text-green-800">{count}</p>
                  <p className="text-xs text-green-700 mt-1">
                    {count === 1 ? t("queue.patient") : t("queue.patients")}
                  </p>
                  <div className="absolute inset-0 bg-blue-600/90 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                    <Plus className="w-12 h-12 text-white" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {doctors.length === 0 && !loading && (
          <p className="text-center text-gray-500 py-8">
            {t("noDoctorsFound") || "Doktorlar topilmadi."}
          </p>
        )}
      </div>

      {/* Upcoming Appointments - Card List */}
      <div className="px-4 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {t("dashboard.upcomingAppointments") || "Yaqin qabullar"}
          </h2>
          <Link
            to="/reception/appointments"
            className="text-sm font-medium text-sky-600"
          >
            {t("common.all")} →
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-gray-500" />
          </div>
        ) : upcomingFive.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">{t("noAppointments")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingFive.map((a) => {
              const patientName =
                a.patient?.first_name && a.patient?.last_name
                  ? `${a.patient.first_name} ${a.patient.last_name}`
                  : t("common.unknownPatient") || "Noma'lum bemor";

              const doctorName =
                a.doctor?.full_name ||
                doctors.find((d) => d.id === a.doctor_id)?.fullName ||
                t("common.unknown") + " " + t("common.doctor");

              return (
                <div
                  key={a.id}
                  className="bg-white rounded-2xl shadow-md p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 text-2xl font-bold text-slate-800">
                      <Clock className="w-6 h-6 text-sky-600" />
                      {formatTime(a.appointment_date)}
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-gray-500" />
                      <span className="font-medium">{patientName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Stethoscope className="w-5 h-5 text-gray-500" />
                      <span>{doctorName}</span>
                    </div>
                    {a.notes && (
                      <div
                        className="text-gray-500 line-clamp-2"
                        title={a.notes}
                      >
                        {a.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 px-4 mt-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center shadow-md">
          <p className="text-sm text-blue-700">{t("todaysAppointments")}</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">
            {todayAppointments.length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 text-center shadow-md">
          <p className="text-sm text-green-700">
            {t("dashboard.patientsHint")}
          </p>
          <p className="text-3xl font-bold text-green-900 mt-2">
            {totalPatients}
          </p>
        </div>
      </div>

      {/* Modal - Improved positioning for mobile */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold">
                {t("appointments.addAppointment") || "Yangi qabul qo'shish"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
                className="text-white/80 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={handleCreateAppointment}
              className="p-5 sm:p-6 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t("patients.form.firstName") || "Ism"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => {
                      setSelectedPatientId(null);
                      setFormData({ ...formData, firstName: e.target.value });
                    }}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                    placeholder={t("patients.form.firstName") || "Ism"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t("patients.form.lastName") || "Familiya"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => {
                      setSelectedPatientId(null);
                      setFormData({ ...formData, lastName: e.target.value });
                    }}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                    placeholder={t("patients.form.lastName") || "Familiya"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t("patients.form.phone") || "Telefon"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setSelectedPatientId(null);
                        setFormData({
                          ...formData,
                          phone: extractUzLocalDigits(e.target.value),
                        });
                      }}
                      disabled={isSubmitting}
                      className="w-full border border-gray-300 rounded-xl pl-16 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      placeholder="__ ___ __ __"
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={9}
                    />

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 select-none">
                      +998
                    </span>

                    <PatientSuggest
                      token={token}
                      disabled={isSubmitting}
                      t={t}
                      query={`${formData.firstName} ${
                        formData.lastName
                      } ${toUzPhone(formData.phone)}`}
                      onSelect={(p) => {
                        setSelectedPatientId(p.id);
                        setFormData((prev) => ({
                          ...prev,
                          firstName: p.firstName,
                          lastName: p.lastName,
                          phone: extractUzLocalDigits(p.phone),
                          birthDate: p.birthDate || prev.birthDate,
                          address: p.address || prev.address,
                        }));
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t("patients.form.birthDate") || "Tug'ilgan sana"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("patients.form.address") || "Manzil"}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  placeholder={t("patients.form.address") || "Manzil"}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t("common.notes") || "Izoh"}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  placeholder={t("common.notes") || "Izoh (ixtiyoriy)"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t("schedule.startTime") || "Vaqt"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="time"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    disabled={isSubmitting}
                    min="08:00"
                    max="18:30"
                    step="1800"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t("schedule.duration") || "Davomiyligi"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: Number(e.target.value),
                      })
                    }
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  >
                    <option value={30}>30 {t("common.minutes")}</option>
                    <option value={45}>45 {t("common.minutes")}</option>
                    <option value={60}>1 {t("common.hour")}</option>
                    <option value={90}>1.5 {t("common.hour")}</option>
                    <option value={120}>2 {t("common.hour")}</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 shadow-md transition ${
                    isSubmitting
                      ? "bg-blue-400 text-white cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t("common.saving") || "Saqlanmoqda..."}
                    </>
                  ) : (
                    t("common.save") || "Saqlash"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
