import { useEffect, useState } from "react";
import {
  Plus,
  Calendar,
  Loader2,
  X,
  Trash2,
  Clock,
  User,
  Stethoscope,
} from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { PatientSuggest } from "../shared/PatientSuggest.jsx";
import { extractUzLocalDigits, toUzPhone } from "../../utils/uzPhone.js";

function formatTimeRange(startDateStr, duration = 30) {
  if (!startDateStr) return "-";
  try {
    const start = new Date(startDateStr);
    const end = new Date(start.getTime() + duration * 60000);
    const format = (date) =>
      date.toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return `${format(start)} - ${format(end)}`;
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

export function Appointments() {
  const { t } = useLanguage();

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    birthDate: "",
    address: "",
    notes: "",
    doctorId: "",
    time: "",
    duration: 30, // Default 30 minutes
    treatmentPlanId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [createNewPlan, setCreateNewPlan] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const getLocale = () => {
    const localeMap = { uz: "uz-UZ", uz_cyr: "uz-Cyrl-UZ", uz_new: "uz-UZ", ru: "ru-RU", en: "en-US" };
    const lang = localStorage.getItem("lang") || "uz";
    return localeMap[lang] || "uz-UZ";
  };

  // Format selected date for display
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const locale = getLocale();
    const weekday = date.toLocaleDateString(locale, { weekday: "long" });
    const rest = date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const weekdayCap = weekday
      ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`
      : "";
    return weekdayCap ? `${weekdayCap}, ${rest}` : rest;
  };

  const todayFormatted = formatDisplayDate(selectedDate);

  useEffect(() => {
    if (!showAddModal || !selectedPatientId) {
      setTreatmentPlans([]);
      return;
    }

    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        const plans = await apiClient(
          `/treatment-plans?patient_id=${selectedPatientId}&status=active`,
          { token },
        );
        setTreatmentPlans(Array.isArray(plans) ? plans : []);
      } catch {
        setTreatmentPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, [selectedPatientId, showAddModal, token]);

  // Load appointments
  const loadAppointments = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiClient(`/appointments?date=${selectedDate}`, {
        token,
      });
      const list = Array.isArray(data) ? data : [];

      const normalized = list.map((a) => {
        const timeRange = formatTimeRange(a.appointment_date, a.duration || 30);
        let patientName = t("common.unknown") || "Noma'lum bemor";
        if (a.patient?.first_name && a.patient?.last_name) {
          patientName = `${a.patient.first_name} ${a.patient.last_name}`.trim();
        }

        const doctorName =
          a.doctor?.full_name || t("common.unknownDoctor") || "Noma'lum doktor";

        return {
          id: a.id,
          timeRange,
          patient: patientName,
          doctor: doctorName,
          status: a.status || "pending",
          rawDuration: a.duration || 30,
          notes: a.notes || "",
        };
      });

      setAppointments(normalized);
    } catch (err) {
      setError(
        err.message ||
          t("errors.loadAppointments") ||
          "Qabullarni yuklashda xato",
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load doctors
  const loadDoctors = async () => {
    if (!token) return;
    try {
      const data = await apiClient("/admin/users", { token });
      const allUsers = Array.isArray(data) ? data : [];
      const doctorsOnly = allUsers.filter((u) => u?.role === "doctor");
      setDoctors(
        doctorsOnly.map((d) => ({
          id: d.id,
          fullName: d.full_name || "Doktor",
        })),
      );
    } catch (err) {
      console.error("Failed to load doctors:", err);
    }
  };

  useEffect(() => {
    if (token) {
      loadAppointments();
      loadDoctors();
    }
  }, [token, selectedDate]);

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const required = [
      "firstName",
      "lastName",
      "phone",
      "birthDate",
      "doctorId",
      "time",
    ];
    const missing = required.find((f) => !formData[f]?.trim());
    if (missing) {
      setError(
        t("errors.fillAllFields") || "Barcha majburiy maydonlarni to'ldiring",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");
    let patientId = selectedPatientId;

    try {
      const fullPhone = toUzPhone(formData.phone);

      if (!patientId) {
        // Search patient by phone
        const searchRes = await apiClient(
          `/patients?phone=${encodeURIComponent(fullPhone)}`,
          { token },
        );
        const existing = Array.isArray(searchRes) ? searchRes : [];
        if (existing.length > 0) {
          patientId = existing[0].id;
        } else {
          // Create new patient
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

      // Create appointment with duration
      const appointmentDateTime = `${selectedDate}T${formData.time}:00`;
      let planId = formData.treatmentPlanId || "";

      if (createNewPlan) {
        const planTitle =
          `${formData.firstName.trim()} ${formData.lastName.trim()} - ${selectedDate}`.trim();
        const plan = await apiClient("/treatment-plans", {
          method: "POST",
          token,
          body: {
            patient_id: Number(patientId),
            doctor_id: Number(formData.doctorId) || null,
            title: planTitle || null,
          },
        });
        planId = plan?.id ? String(plan.id) : "";
      }

      await apiClient("/appointments", {
        method: "POST",
        token,
        body: {
          patient_id: Number(patientId),
          doctor_id: Number(formData.doctorId),
          appointment_date: new Date(appointmentDateTime).toISOString(),
          duration: Number(formData.duration),
          notes: formData.notes?.trim() || null,
          treatment_plan_id: planId ? Number(planId) : null,
        },
      });

      await loadAppointments();
      setShowAddModal(false);
      setSelectedPatientId(null);
      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        birthDate: "",
        address: "",
        notes: "",
        doctorId: "",
        time: "",
        duration: 30,
        treatmentPlanId: "",
      });
      setCreateNewPlan(false);
    } catch (err) {
      console.error("Create appointment error:", err);
      setError(
        err.message || t("errors.createFailed") || "Qabul yaratishda xato",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAppointment = async (appointment) => {
    try {
      if (!appointment?.id) return;

      // Always delete the appointment instead of cancelling
      await apiClient(`/appointments/${appointment.id}`, {
        method: "DELETE",
        token,
      });

      setShowCancelConfirm(null);
      await loadAppointments();
    } catch (err) {
      setError(
        err.message || t("errors.deleteFailed") || "Amal bajarishda xato",
      );
    }
  };

  const canCancel = (status) => {
    const s = (status || "").toLowerCase();
    return !["completed", "cancelled"].includes(s);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("appointments.title") || "Qabullar"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("appointments.subtitle") || "Barcha qabullarni boshqarish"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setSelectedPatientId(null);
              setCreateNewPlan(false);
              setFormData((prev) => ({ ...prev, treatmentPlanId: "" }));
              setShowAddModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition"
          >
            <Plus className="w-5 h-5" />
            <span>{t("appointments.newAppointment") || "Yangi qabul"}</span>
          </button>
        </div>
      </div>

      {/* Date Display */}
      {todayFormatted && (
        <div className="text-center text-lg font-medium text-gray-700">
          {todayFormatted}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                  {t("common.time") || "Vaqt"}
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                  {t("common.patient") || "Bemor"}
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                  {t("common.doctor") || "Doktor"}
                </th>
                {/* services column removed */}
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                  {t("common.status") || "Holati"}
                </th>
                <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">
                  {t("actions") || "Amallar"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-16 text-center text-gray-500"
                  >
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {t("noAppointments") || "Bu kunda qabul yo'q"}
                    </p>
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {appt.timeRange}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>{appt.patient}</div>
                        {appt.notes && (
                          <div
                            className="text-xs text-gray-500 line-clamp-1"
                            title={appt.notes}
                          >
                            {appt.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {appt.doctor}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {canCancel(appt.status) && (
                        <button
                          onClick={() => setShowCancelConfirm(appt)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title={
                            t("common.delete") ||
                            t("common.cancel") ||
                            "O'chirish"
                          }
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-gray-400" />
            <p className="mt-3 text-gray-500">
              {t("common.loading") || "Yuklanmoqda..."}
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-600">
              {t("noAppointments") || "Bu kunda qabul yo'q"}
            </p>
          </div>
        ) : (
          appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span className="font-bold text-lg text-gray-900">
                    {appt.timeRange}
                  </span>
                </div>
                {canCancel(appt.status) && (
                  <button
                    onClick={() => setShowCancelConfirm(appt)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t("common.patient") || "Bemor"}
                    </p>
                    <p className="font-medium text-gray-900">{appt.patient}</p>
                    {appt.notes && (
                      <p
                        className="text-sm text-gray-500 line-clamp-2"
                        title={appt.notes}
                      >
                        {appt.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">
                      {t("common.doctor") || "Doktor"}
                    </p>
                    <p className="font-medium text-gray-900">{appt.doctor}</p>
                  </div>
                </div>
                {/* services removed - not used */}
                <div className="flex justify-center">
                  <StatusBadge status={appt.status} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t("appointments.confirmDelete") || "Qabulni o'chirish"}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("appointments.confirmDeleteText") ||
                "Haqiqatan ham ushbu qabulni o'chirmoqchimisiz?"}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
              >
                {t("common.no") || "Yo'q"}
              </button>
              <button
                onClick={() => handleRemoveAppointment(showCancelConfirm)}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
              >
                {t("common.yesDelete") || "Ha, o'chirish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Appointment Modal with Duration */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {t("appointments.newAppointment") || "Yangi qabul"}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="Ism"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="Familiya"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full border border-gray-300 rounded-lg pl-16 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full max-w-[240px] sm:max-w-none border border-gray-300 rounded-lg bg-white text-gray-900 text-left appearance-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("patients.form.address") || "Manzil"}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Manzil (ixtiyoriy)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("common.notes") || "Izoh"}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder={t("common.notes") || "Izoh (ixtiyoriy)"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("common.doctor") || "Doktor"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.doctorId}
                    onChange={(e) =>
                      setFormData({ ...formData, doctorId: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">
                      {t("common.selectDoctor") || "Doktor tanlang"}
                    </option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("common.time") || "Boshlanish vaqti"}{" "}
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
                    className="w-full max-w-[240px] sm:max-w-none border border-gray-300 rounded-lg bg-white text-gray-900 text-left appearance-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("schedule.duration") || "Davomiylik"}
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value={30}>
                      30 {t("common.minutes") || "minutes"}
                    </option>
                    <option value={45}>
                      45 {t("common.minutes") || "minutes"}
                    </option>
                    <option value={60}>1 {t("common.hours") || "hours"}</option>
                    <option value={90}>
                      1.5 {t("common.hours") || "hours"}
                    </option>
                    <option value={120}>
                      2 {t("common.hours") || "hours"}
                    </option>
                  </select>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("treatment.plan") || "Davolash rejasi"}
                    </label>
                    <select
                      value={formData.treatmentPlanId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          treatmentPlanId: e.target.value,
                        })
                      }
                      disabled={
                        isSubmitting ||
                        createNewPlan ||
                        !selectedPatientId ||
                        loadingPlans
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    >
                      <option value="">
                        {loadingPlans
                          ? t("common.loading") || "Yuklanmoqda..."
                          : t("treatment.planNone") || "Reja tanlanmagan"}
                      </option>
                      {treatmentPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.title || `#${plan.id}`}
                        </option>
                      ))}
                    </select>
                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={createNewPlan}
                        onChange={(e) => {
                          setCreateNewPlan(e.target.checked);
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              treatmentPlanId: "",
                            }));
                          }
                        }}
                        disabled={isSubmitting || !selectedPatientId}
                      />
                      {t("treatment.planCreate") ||
                        "Yangi davolash rejasi yaratish"}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 ${
                    isSubmitting
                      ? "bg-blue-400 text-white cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting
                    ? t("common.saving") || "Saqlanmoqda..."
                    : t("common.save") || "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
