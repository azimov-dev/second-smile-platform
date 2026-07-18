import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Download, TrendingUp, Users, Building2, Calendar } from "lucide-react";
import { AreaChart, BarChart, DonutChart, LineChart, ChartCard, StatCard } from "../components/Charts.jsx";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi("/stats/overview", { token }),
      adminApi("/stats/revenue", { token }),
      adminApi("/stats/subscriptions", { token }),
      adminApi("/stats/activity", { token }),
    ])
      .then(([overviewData, revenueData, subsData, activityData]) => {
        setOverview(overviewData);
        setRevenue(revenueData);
        setSubscriptions(subsData);
        setActivity(activityData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const exportToCSV = (data, filename) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => row[h] ?? "").join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  // Prepare chart data
  const revenueData = (revenue?.monthly_revenue || []).map((r) => ({
    name: formatMonth(r.month),
    revenue: Number(r.revenue) / 1000000,
  }));

  const clinicsGrowthData = (overview?.clinics_growth || []).map((c) => ({
    name: formatMonth(c.month),
    clinics: Number(c.count) || 0,
  }));

  const subscriptionStatusData = (subscriptions?.status_breakdown || []).map((s) => ({
    name: capitalizeStatus(s.status),
    value: Number(s.count) || 0,
    color: getStatusColor(s.status),
  }));

  const planPopularityData = (subscriptions?.plan_popularity || []).map((p) => ({
    name: p.name,
    subscribers: Number(p.subscriber_count) || 0,
  }));

  const activityTrendData = (activity?.activity_trend || []).map((a) => ({
    name: formatMonth(a.month),
    appointments: Number(a.appointments) || 0,
  }));

  const churnData = (subscriptions?.churn_data || []).map((c) => ({
    name: formatMonth(c.month),
    cancellations: Number(c.cancellations) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Detailed platform metrics and insights
          </p>
        </div>
        <button
          onClick={() => exportToCSV(revenue?.monthly_revenue, "revenue-data")}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          <Download className="h-4 w-4" />
          Export Revenue
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp className="h-6 w-6 text-sky-600" />}
          label="Total Revenue"
          value={`${((revenue?.total_revenue || 0) / 1000000).toFixed(1)}M UZS`}
        />
        <StatCard
          icon={<Building2 className="h-6 w-6 text-green-600" />}
          label="Active Clinics"
          value={overview?.active_clinics || 0}
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-purple-600" />}
          label="Total Patients"
          value={(activity?.total_patients || 0).toLocaleString()}
        />
        <StatCard
          icon={<Calendar className="h-6 w-6 text-amber-600" />}
          label="Total Appointments"
          value={(activity?.total_appointments || 0).toLocaleString()}
        />
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Revenue Trend" subtitle="Monthly subscription revenue (M UZS)">
          {revenueData.length > 0 ? (
            <AreaChart data={revenueData} dataKey="revenue" color="#0ea5e9" height={280} />
          ) : (
            <p className="text-gray-400 text-center py-10">No data available</p>
          )}
        </ChartCard>

        <ChartCard title="Revenue by Plan" subtitle="Total revenue per subscription plan">
          {(revenue?.revenue_by_plan || []).length > 0 ? (
            <div className="space-y-3">
              {revenue.revenue_by_plan.map((plan, index) => {
                const maxRevenue = Math.max(...revenue.revenue_by_plan.map((p) => Number(p.total_revenue)));
                const percentage = maxRevenue > 0 ? (Number(plan.total_revenue) / maxRevenue) * 100 : 0;
                return (
                  <div key={plan.plan_name || index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{plan.plan_name}</span>
                      <span className="text-sm text-gray-500">
                        {(Number(plan.total_revenue) / 1000000).toFixed(1)}M UZS
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-10">No data available</p>
          )}
        </ChartCard>
      </div>

      {/* Subscriptions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Subscription Status" subtitle="Current distribution">
          {subscriptionStatusData.length > 0 ? (
            <DonutChart data={subscriptionStatusData} height={220} />
          ) : (
            <p className="text-gray-400 text-center py-10">No data available</p>
          )}
        </ChartCard>

        <ChartCard title="Plan Popularity" subtitle="Active subscribers per plan">
          {planPopularityData.length > 0 ? (
            <BarChart data={planPopularityData} dataKey="subscribers" xKey="name" color="#8b5cf6" height={220} />
          ) : (
            <p className="text-gray-400 text-center py-10">No data available</p>
          )}
        </ChartCard>

        <ChartCard title="Subscription Alerts" subtitle="Upcoming expirations">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
              <span className="text-sm text-red-700">Expiring in 7 days</span>
              <span className="text-lg font-bold text-red-600">
                {subscriptions?.expiring_in_7_days || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <span className="text-sm text-yellow-700">Expiring in 30 days</span>
              <span className="text-lg font-bold text-yellow-600">
                {subscriptions?.expiring_in_30_days || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <span className="text-sm text-green-700">Payment Success Rate</span>
              <span className="text-lg font-bold text-green-600">
                {revenue?.success_rate || 0}%
              </span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Growth & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Clinic Growth" subtitle="New clinics per month">
          {clinicsGrowthData.length > 0 ? (
            <BarChart data={clinicsGrowthData} dataKey="clinics" color="#22c55e" height={250} />
          ) : (
            <p className="text-gray-400 text-center py-10">No data available</p>
          )}
        </ChartCard>

        <ChartCard title="Platform Activity" subtitle="Appointments per month">
          {activityTrendData.length > 0 ? (
            <AreaChart data={activityTrendData} dataKey="appointments" color="#8b5cf6" height={250} />
          ) : (
            <p className="text-gray-400 text-center py-10">No data available</p>
          )}
        </ChartCard>
      </div>

      {/* Churn Analysis */}
      <ChartCard title="Subscription Cancellations" subtitle="Monthly churn">
        {churnData.length > 0 ? (
          <BarChart data={churnData} dataKey="cancellations" color="#ef4444" height={200} />
        ) : (
          <p className="text-gray-400 text-center py-10">No cancellation data</p>
        )}
      </ChartCard>

      {/* Most Active Clinics */}
      <ChartCard title="Most Active Clinics" subtitle="By total activity">
        {(activity?.most_active_clinics || []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Clinic</th>
                  <th className="px-3 py-2 font-medium text-right">Patients</th>
                  <th className="px-3 py-2 font-medium text-right">Appointments</th>
                  <th className="px-3 py-2 font-medium text-right">Treatments</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activity.most_active_clinics.map((clinic, index) => (
                  <tr key={clinic.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{clinic.name}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{clinic.patients}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{clinic.appointments}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{clinic.treatments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-10">No clinic data</p>
        )}
      </ChartCard>
    </div>
  );
}

function formatMonth(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
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
