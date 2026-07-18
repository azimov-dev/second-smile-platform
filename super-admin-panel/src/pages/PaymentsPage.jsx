import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Search, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { BarChart, ChartCard } from "../components/Charts.jsx";

export default function PaymentsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [revenueStats, setRevenueStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const paymentsData = await adminApi("/payments", { token });
        setPayments(paymentsData);
      } catch (err) {
        console.error("Payments load error:", err);
      }

      try {
        const statsData = await adminApi("/stats/revenue", { token });
        setRevenueStats(statsData);
      } catch (err) {
        console.error("Revenue stats not available:", err);
      }

      setLoading(false);
    };

    loadData();
  }, [token]);

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const searchMatch =
      !search ||
      p.clinic_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.click_trans_id?.includes(search);

    const statusMatch = statusFilter === "all" || p.status === statusFilter;

    return searchMatch && statusMatch;
  });

  // Calculate stats
  const totalCompleted = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === "completed").length,
    pending: payments.filter((p) => p.status === "pending").length,
    failed: payments.filter((p) => p.status === "failed").length,
  };

  // Prepare chart data
  const monthlyData = (revenueStats?.monthly_revenue || []).map((r) => ({
    name: formatMonth(r.month),
    revenue: Number(r.revenue) / 1000000, // Convert to millions
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Subscription payment history and analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100">
              <TrendingUp className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">
                {(totalCompleted / 1000000).toFixed(1)}M UZS
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Failed</p>
              <p className="text-lg font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {monthlyData.length > 0 && (
        <ChartCard title="Monthly Revenue" subtitle="Revenue in millions UZS">
          <BarChart data={monthlyData} dataKey="revenue" color="#0ea5e9" height={200} />
        </ChartCard>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by clinic or transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Clinic</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Click Trans ID</th>
              <th className="px-4 py-3 font-medium">Paid At</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">#{p.id}</td>
                  <td className="px-4 py-3 font-medium">{p.clinic_name || p.clinic_id}</td>
                  <td className="px-4 py-3 font-medium">
                    {p.amount?.toLocaleString()} UZS
                  </td>
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
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {p.click_trans_id || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatMonth(monthStr) {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}
