import { useEffect, useState } from "react";
import { Activity, Package, Users, Calendar } from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

export function AdminDashboard() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientsCount, setPatientsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [appointmentsDoneToday, setAppointmentsDoneToday] = useState(0);
  const [latestAppointments, setLatestAppointments] = useState([]);

  useEffect(() => {
    if (!token) return;

    const today = new Date().toISOString().slice(0, 10);

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [patientsRes, servicesRes, appointmentsRes] = await Promise.all([
          apiClient("/patients", { token }),
          apiClient("/services", { token }),
          apiClient(`/appointments?date=${today}`, { token }),
        ]);

        const patients = Array.isArray(patientsRes) ? patientsRes : [];
        const services = Array.isArray(servicesRes) ? servicesRes : [];
        const appointments = Array.isArray(appointmentsRes)
          ? appointmentsRes
          : [];

        setPatientsCount(patients.length);
        setServicesCount(services.length);
        setAppointmentsToday(appointments.length);

        const doneToday = appointments.filter((a) => {
          const status = (a.status || "").toLowerCase();
          return status === "done" || status === "completed";
        }).length;

        setAppointmentsDoneToday(doneToday);

        const sortedAppointments = [...appointments]
          .sort((a, b) => {
            const dateA = new Date(a.appointment_date || 0).getTime();
            const dateB = new Date(b.appointment_date || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 6);

        setLatestAppointments(sortedAppointments);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError(
          err.message ||
            t("errors.loadDashboard") ||
            "Ma'lumotlarni yuklashda xato",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token, t]);

  const completedRatio =
    appointmentsToday > 0
      ? Math.round((appointmentsDoneToday / appointmentsToday) * 100)
      : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getPatientName = (appt) => {
    if (appt.patient) {
      return `${appt.patient.first_name} ${appt.patient.last_name}`.trim();
    }
    return "-";
  };

  const getServicesList = (appt) => {
    if (appt.items && appt.items.length > 0) {
      return appt.items
        .map((i) => i.service?.name || "")
        .filter(Boolean)
        .join(", ");
    }
    return "-";
  };

  const getStatusText = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "done" || s === "completed")
      return t("common.completed") || "Yakunlangan";
    if (s === "cancelled") return t("common.cancelled") || "Bekor qilingan";
    if (s === "in_progress") return t("common.inProgress") || "Jarayonda";
    return t("common.confirmed") || "Tasdiqlangan";
  };

  const getStatusClass = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "done" || s === "completed")
      return "bg-emerald-100 text-emerald-800";
    if (s === "cancelled") return "bg-red-100 text-red-800";
    if (s === "in_progress") return "bg-amber-100 text-amber-800";
    return "bg-sky-100 text-sky-800";
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("dashboard.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm">
            <Users className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-900">{patientsCount}</span>
            <span className="text-slate-600">
              {t("patients.title").toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm">
            <Package className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-900">{servicesCount}</span>
            <span className="text-slate-600">
              {t("services").toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm">
            <Calendar className="h-5 w-5 text-slate-600" />
            <span className="font-medium text-slate-900">
              {appointmentsToday}
            </span>
            <span className="text-slate-600">
              {t("appointments.title").toLowerCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label={t("patients.title")}
          value={patientsCount}
          icon={<Users className="h-8 w-8 text-blue-600" />}
        />
        <StatCard
          label={t("services")}
          value={servicesCount}
          icon={<Package className="h-8 w-8 text-purple-600" />}
        />
        <StatCard
          label={t("appointments.title")}
          value={appointmentsToday}
          icon={<Calendar className="h-8 w-8 text-orange-600" />}
        />
        <ProgressCard
          label={t("treatments")}
          done={appointmentsDoneToday}
          total={appointmentsToday}
          percent={completedRatio}
        />
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mini Charts */}
        <div className="space-y-4">
          <MiniChartCard
            title={t("dashboard.todayOccupancy")}
            percent={appointmentsToday >= 10 ? 100 : appointmentsToday * 10}
            description={t("dashboard.todayOccupancyDesc")}
          />
          <MiniChartCard
            title={t("dashboard.completedTreatments")}
            percent={completedRatio}
            description={t("dashboard.completedTreatmentsDesc")}
          />
        </div>

        {/* Latest Appointments */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("todaysAppointments")}
            </h2>
            <p className="text-sm text-slate-600">
              {t("dashboard.latestPatients")}
            </p>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left">
                    {t("common.time") || "Vaqt"}
                  </th>
                  <th className="px-5 py-3 text-left">
                    {t("common.patient") || "Bemor"}
                  </th>
                  <th className="px-5 py-3 text-left">
                    {t("common.doctor") || "Doktor"}
                  </th>
                  <th className="px-5 py-3 text-left">
                    {t("common.status") || "Holati"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {latestAppointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {formatDate(a.appointment_date)}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">
                      {getPatientName(a)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-900">
                      {a.doctor?.full_name || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100">
            {latestAppointments.map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    {getPatientName(a)}
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {formatDate(a.appointment_date)}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {a.doctor?.full_name || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable Components */

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">{icon}</div>
      </div>
    </div>
  );
}

function ProgressCard({ label, done, total, percent }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-600">{label}</p>
        <span className="text-2xl font-bold text-slate-900">{percent}%</span>
      </div>
      <div className="text-sm text-slate-600 mb-2">
        {done} / {total}
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MiniChartCard({ title, percent, description }) {
  const safePercent = Math.max(0, Math.min(100, percent || 0));

  return (
    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <div className="mt-4 flex items-end justify-between">
        <div className="flex h-20 items-end gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-sky-400/70 transition-all"
              style={{
                height: `${10 + (safePercent / 100) * 60 * ((i + 1) / 10)}px`,
              }}
            />
          ))}
        </div>
        <span className="text-3xl font-bold text-sky-600">{safePercent}%</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const s = (status || "").toLowerCase();

  let className = "inline-flex rounded-full px-3 py-1 text-xs font-medium ";
  let text = t("common.confirmed") || "Tasdiqlangan";

  if (s === "completed" || s === "done") {
    className += "bg-emerald-100 text-emerald-800";
    text = t("common.completed") || "Yakunlangan";
  } else if (s === "cancelled") {
    className += "bg-red-100 text-red-800";
    text = t("common.cancelled") || "Bekor qilingan";
  } else if (s === "in_progress") {
    className += "bg-amber-100 text-amber-800";
    text = t("common.inProgress") || "Jarayonda";
  } else {
    className += "bg-sky-100 text-sky-800";
  }

  return <span className={className}>{text}</span>;
}
