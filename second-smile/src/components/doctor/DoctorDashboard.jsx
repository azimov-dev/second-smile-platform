import { useEffect, useState } from "react";
import { CalendarCheck, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

function formatTime(dateStr) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("uz-UZ", {
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

  if (s === "in_progress" || s === "active") {
    bg = "bg-amber-100 text-amber-700";
    text = t("common.inProgress") || "Jarayonda";
  } else if (s === "completed" || s === "done") {
    bg = "bg-emerald-100 text-emerald-700";
    text = t("common.completed") || "Yakunlangan";
  } else if (s === "cancelled") {
    bg = "bg-red-100 text-red-700";
    text = t("common.cancelled") || "Bekor qilingan";
  }

  return (
    <span
      className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${bg}`}
    >
      {text}
    </span>
  );
}

function StatCard({ label, value, hint, icon, bg }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 ${
        bg || "bg-white"
      } p-6 shadow-md hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-3 text-4xl font-bold text-slate-900">{value}</p>
          <p className="mt-3 text-sm text-slate-500">{hint}</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DoctorDashboard() {
  const { t } = useLanguage();
  const { token, user } = useAuth();

  const doctorId = user && user.id ? user.id : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [totalToday, setTotalToday] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);

  useEffect(() => {
    if (!token || !doctorId) {
      setError(t("errors.loginRequired") || "Iltimos, tizimga kiring");
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await apiClient(`/appointments?date=${today}`, { token });
        const allAppointments = Array.isArray(res) ? res : [];

        const myAppointments = allAppointments.filter(
          (a) => (a.doctor_id || (a.doctor && a.doctor.id)) === doctorId,
        );

        const sorted = myAppointments
          .sort(
            (a, b) =>
              new Date(a.appointment_date) - new Date(b.appointment_date),
          )
          .slice(0, 8);

        setTodayAppointments(sorted);
        setTotalToday(myAppointments.length);

        const active = myAppointments.filter((a) =>
          ["in_progress", "active"].includes((a.status || "").toLowerCase()),
        ).length;

        const completed = myAppointments.filter((a) =>
          ["completed", "done"].includes((a.status || "").toLowerCase()),
        ).length;

        setActiveToday(active);
        setCompletedToday(completed);
      } catch (err) {
        console.error(err);
        setError(
          err.message || t("errors.loadData") || "Ma'lumotlarni yuklashda xato",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, doctorId, t]);

  const completionRate =
    totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t("doctorPanel") || "Doktor paneli"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            {t("dashboard.subtitle") ||
              "Bugungi qabullar va davolashlar umumiy ko'rinishi"}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-4 text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard
          label={t("appointments.title") || "Bugungi qabullar"}
          value={totalToday}
          hint={
            t("dashboard.appointmentsHint") || "Sizga belgilangan qabullar soni"
          }
          icon={<CalendarCheck className="h-8 w-8 text-sky-600" />}
          bg="bg-sky-50"
        />
        <StatCard
          label={t("common.active") || "Jarayonda"}
          value={activeToday}
          hint={t("common.inProgressHint") || "Hozirda davolanayotgan bemorlar"}
          icon={<Clock className="h-8 w-8 text-amber-600" />}
          bg="bg-amber-50"
        />
        <StatCard
          label={t("common.completed") || "Yakunlangan"}
          value={completedToday}
          hint={t("common.completedHint") || "Bugun yakunlangan davolashlar"}
          icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
          bg="bg-emerald-50"
        />
      </div>

      {/* Daily Progress Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {t("dashboard.dailyProgress") || "Kunlik bajarilish"}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {completedToday} / {totalToday}{" "}
              {t("dashboard.completedToday") || "yakunlandi"}
            </p>
          </div>
          <span className="text-3xl font-bold text-sky-600">
            {completionRate}%
          </span>
        </div>
        <div className="h-6 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t("dashboard.upcomingAppointments") || "Yaqin qabullar"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {t("dashboard.upcomingHint") || "Bugungi navbatdagi qabullar"}
              </p>
            </div>
            <Link
              to="/doctor/queue"
              className="text-sm font-medium text-sky-600 hover:text-sky-700 transition"
            >
              {t("common.viewAll") || "Barchasini ko'rish →"}
            </Link>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              {t("common.loading") || "Yuklanmoqda..."}
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg text-slate-600">
                {t("noAppointments") || "Bugun qabul yo'q"}
              </p>
            </div>
          ) : (
            todayAppointments.map((a) => {
              let patientName = t("common.unknownPatient") || "Noma'lum bemor";
              if (a.patient && a.patient.first_name && a.patient.last_name) {
                patientName =
                  `${a.patient.first_name} ${a.patient.last_name}`.trim();
              }

              let servicesList =
                t("appointments.noServices") || "Xizmatlar yo'q";
              if (a.items && Array.isArray(a.items) && a.items.length > 0) {
                servicesList = a.items
                  .map((i) =>
                    i.service && i.service.name ? i.service.name : "",
                  )
                  .filter(Boolean)
                  .join(", ");
              }

              return (
                <div key={a.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Clock className="w-6 h-6 text-sky-600" />
                      <span className="text-2xl font-bold text-slate-900">
                        {formatTime(a.appointment_date)}
                      </span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-500">
                        {t("common.patient") || "Bemor"}
                      </p>
                      <p className="font-semibold text-slate-900">
                        {patientName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">
                        {t("common.services") || "Xizmatlar"}
                      </p>
                      <p className="text-slate-700">{servicesList}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-sm font-medium text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">{t("common.time") || "Vaqt"}</th>
                <th className="px-6 py-4">{t("common.patient") || "Bemor"}</th>
                <th className="px-6 py-4">
                  {t("common.services") || "Xizmatlar"}
                </th>
                <th className="px-6 py-4">{t("common.status") || "Holati"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    {t("common.loading") || "Yuklanmoqda..."}
                  </td>
                </tr>
              ) : todayAppointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    {t("noAppointments") || "Bugun qabul yo'q"}
                  </td>
                </tr>
              ) : (
                todayAppointments.map((a) => {
                  let patientName =
                    t("common.unknownPatient") || "Noma'lum bemor";
                  if (
                    a.patient &&
                    a.patient.first_name &&
                    a.patient.last_name
                  ) {
                    patientName =
                      `${a.patient.first_name} ${a.patient.last_name}`.trim();
                  }

                  let servicesList =
                    t("appointments.noServices") || "Xizmatlar yo'q";
                  if (a.items && Array.isArray(a.items) && a.items.length > 0) {
                    servicesList = a.items
                      .map((i) =>
                        i.service && i.service.name ? i.service.name : "",
                      )
                      .filter(Boolean)
                      .join(", ");
                  }

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {formatTime(a.appointment_date)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {patientName}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate"
                        title={servicesList}
                      >
                        {servicesList}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={a.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
