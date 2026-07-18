import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Calendar,
  UserCheck,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { AreaChart, BarChart, DonutChart, ChartCard, StatCard } from "../components/Charts.jsx";

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi("/dashboard", { token }),
      adminApi("/stats/overview", { token }),
    ])
      .then(([dashData, overviewData]) => {
        setStats(dashData);
        setOverview(overviewData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-gray-500">Failed to load dashboard</p>;

  // Prepare chart data
  const revenueData = (overview?.revenue_trend || []).map((r) => ({
    name: formatMonth(r.month),
    revenue: Number(r.revenue) || 0,
  }));

  const clinicsGrowthData = (overview?.clinics_growth || []).map((c) => ({
    name: formatMonth(c.month),
    clinics: Number(c.count) || 0,
  }));

  const subscriptionStatusData = (overview?.subscription_status || []).map((s) => ({
    name: capitalizeStatus(s.status),
    value: Number(s.count) || 0,
    color: getStatusColor(s.status),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-6 w-6 text-sky-600" />}
          label="Total Clinics"
          value={overview?.total_clinics || stats.total_clinics || 0}
        />
        <StatCard
          icon={<Building2 className="h-6 w-6 text-green-600" />}
          label="Active Clinics"
          value={overview?.active_clinics || stats.active_clinics || 0}
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-purple-600" />}
          label="Total Users"
          value={overview?.total_users || stats.total_users || 0}
        />
        <StatCard
          icon={<CreditCard className="h-6 w-6 text-amber-600" />}
          label="MRR"
          value={`${((overview?.mrr || stats.mrr || 0) / 1000000).toFixed(1)}M UZS`}
        />
      </div>

      {/* Second row of KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<UserCheck className="h-6 w-6 text-indigo-600" />}
          label="Total Patients"
          value={(overview?.total_patients || 0).toLocaleString()}
        />
        <StatCard
          icon={<Calendar className="h-6 w-6 text-teal-600" />}
          label="Total Appointments"
          value={(overview?.total_appointments || 0).toLocaleString()}
        />
        <StatCard
          icon={<Activity className="h-6 w-6 text-pink-600" />}
          label="Avg Patients/Clinic"
          value={
            overview?.total_clinics > 0
              ? Math.round(overview.total_patients / overview.total_clinics)
              : 0
          }
        />
        <StatCard
          icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
          label="Expiring Soon"
          value={overview?.expiring_soon?.length || 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <ChartCard title="Revenue Trend" subtitle="Monthly subscription revenue">
          {revenueData.length > 0 ? (
            <AreaChart data={revenueData} dataKey="revenue" color="#0ea5e9" height={250} />
          ) : (
            <p className="text-gray-400 text-center py-10">No revenue data</p>
          )}
        </ChartCard>

        {/* Subscription Status */}
        <ChartCard title="Subscription Status" subtitle="Distribution by status">
          {subscriptionStatusData.length > 0 ? (
            <DonutChart data={subscriptionStatusData} height={250} />
          ) : (
            <p className="text-gray-400 text-center py-10">No subscription data</p>
          )}
        </ChartCard>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Clinic Growth */}
        <ChartCard title="Clinic Growth" subtitle="New clinics per month">
          {clinicsGrowthData.length > 0 ? (
            <BarChart data={clinicsGrowthData} dataKey="clinics" color="#22c55e" height={250} />
          ) : (
            <p className="text-gray-400 text-center py-10">No growth data</p>
          )}
        </ChartCard>

        {/* Top Clinics */}
        <ChartCard title="Top Clinics" subtitle="By appointment count">
          {overview?.top_clinics?.length > 0 ? (
            <div className="space-y-3">
              {overview.top_clinics.map((clinic, index) => (
                <div
                  key={clinic.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                          ? "bg-gray-200 text-gray-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{clinic.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {clinic.appointments_count} appointments
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">No clinic data</p>
          )}
        </ChartCard>
      </div>

      {/* Expiring Soon Alert */}
      {overview?.expiring_soon?.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">
              Subscriptions Expiring Soon
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-red-700">
                <tr>
                  <th className="px-3 py-2 font-medium">Clinic</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium">Days Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {overview.expiring_soon.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {sub.clinic_name}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{sub.plan_name}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {new Date(sub.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          sub.days_left <= 3
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {sub.days_left} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {stats.recent_payments?.length > 0 && (
        <div className="rounded-xl bg-white border overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Clinic</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recent_payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.clinic_name || p.clinic_id}
                    </td>
                    <td className="px-4 py-3">{p.amount?.toLocaleString()} UZS</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : p.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatMonth(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

function capitalizeStatus(status) {
  if (!status) return "";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusColor(status) {
  switch (status) {
    case "active":
      return "#22c55e";
    case "trial":
      return "#0ea5e9";
    case "cancelled":
      return "#ef4444";
    case "expired":
      return "#f59e0b";
    case "past_due":
      return "#f97316";
    default:
      return "#64748b";
  }
}
