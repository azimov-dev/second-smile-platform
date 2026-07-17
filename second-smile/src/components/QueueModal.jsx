import { useEffect, useState } from "react";
import { Calendar, Loader2, Clock, User, FileText, X } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client.js";
import { useAuth } from "../features/auth/useAuth.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export function QueueModal() {
  const { t } = useLanguage();
  const { token, user } = useAuth();

  const doctorId = user && user.id ? user.id : null;

  const [queue, setQueue] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Format selected date safely using localStorage lang
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const localeMap = { uz: "uz-UZ", uz_cyr: "uz-Cyrl-UZ", uz_new: "uz-UZ", ru: "ru-RU", en: "en-US" };
    const lang = localStorage.getItem("lang") || "uz";
    const locale = localeMap[lang] || "uz-UZ";
    const options = {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString(locale, options);
  };

  const todayFormatted = formatDisplayDate(selectedDate);

  const loadQueue = async () => {
    if (!token || !doctorId) {
      setError(t("errors.loginRequired") || "Iltimos, tizimga kiring");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await apiClient(`/appointments?date=${selectedDate}`, {
        token,
      });
      const list = Array.isArray(data) ? data : [];

      const filtered = list.filter((appt) => {
        const apptDoctorId = appt.doctor_id || (appt.doctor && appt.doctor.id);
        const status = (appt.status || "").toLowerCase();
        return (
          apptDoctorId === doctorId && ["pending", "confirmed"].includes(status)
        );
      });

      const sorted = filtered.sort(
        (a, b) => new Date(a.appointment_date) - new Date(b.appointment_date),
      );

      const mapped = sorted.map((appt) => {
        const dt = new Date(appt.appointment_date);
        const time = dt.toTimeString().slice(0, 5);

        let patientName = t("common.unknownPatient") || "Noma'lum bemor";
        if (appt.patient && appt.patient.first_name && appt.patient.last_name) {
          patientName =
            `${appt.patient.first_name} ${appt.patient.last_name}`.trim();
        }

        return {
          id: appt.id,
          time,
          patient: patientName,
          status: appt.status || "pending",
        };
      });

      setQueue(mapped);
    } catch (err) {
      console.error(err);
      setError(
        err.message || t("errors.loadQueue") || "Navbatni yuklashda xato",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [selectedDate, token, doctorId, t]);

  const getStatusColor = () => "bg-sky-100 text-sky-800 border-sky-200";

  const getStatusText = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return t("common.pending") || "Kutilmoqda";
    return t("common.confirmed") || "Tasdiqlangan";
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (
      !window.confirm(
        t("queue.confirmCancel") || "Bu qabulni bekor qilishni tasdiqlaysizmi?",
      )
    ) {
      return;
    }

    try {
      await apiClient(`/appointments/${appointmentId}/status`, {
        method: "PATCH",
        token,
        body: { status: "cancelled" },
      });
      setQueue((prev) => prev.filter((item) => item.id !== appointmentId));
    } catch (err) {
      alert(
        err.message || t("errors.cancelAppointment") || "Bekor qilishda xato",
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t("queue.title") || "Mening navbatim"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            {t("queue.subtitle") || "Bugun meni kutayotgan bemorlar"}
          </p>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-4">
          <Calendar className="w-6 h-6 text-slate-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-5 py-3.5 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Selected Date */}
      {todayFormatted && (
        <div className="text-center text-xl font-semibold text-slate-700">
          {todayFormatted}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700">
          {error}
        </div>
      )}

      {/* Queue Cards - Fully Responsive Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto text-slate-400" />
            <p className="mt-4 text-lg text-slate-500">
              {t("common.loading") || "Yuklanmoqda..."}
            </p>
          </div>
        ) : queue.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <Calendar className="w-24 h-24 mx-auto mb-6 text-slate-300" />
            <p className="text-2xl font-medium text-slate-600">
              {t("queue.empty") || "Bugun navbatda bemor yo'q"}
            </p>
            <p className="mt-4 text-lg text-slate-500">
              {t("queue.emptyHint") || "Dam oling yoki yangi qabul yarating"}
            </p>
          </div>
        ) : (
          queue.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 hover:shadow-md transition-all duration-200"
            >
              {/* Time & Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-sky-600" />
                  <span className="text-2xl font-semibold text-slate-900">
                    {appt.time}
                  </span>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor()}`}
                >
                  {getStatusText(appt.status)}
                </span>
              </div>

              {/* Patient Info */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500">
                      {t("common.patient") || "Bemor"}
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {appt.patient}
                    </p>
                  </div>
                </div>

                {/* services removed - not used */}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Link
                  to={`/doctor/treatment/start/${appt.id}`}
                  className="flex-1 py-2 rounded-md bg-sky-600 text-white text-center font-medium hover:bg-sky-700 transition"
                >
                  {t("queue.startTreatment") || "Davolashni boshlash"}
                </Link>

                <button
                  onClick={() => handleCancelAppointment(appt.id)}
                  className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                  title={t("queue.cancelAppointment") || "Bekor qilish"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
