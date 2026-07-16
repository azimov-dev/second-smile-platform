import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Building2, Users, CreditCard, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi("/dashboard", { token })
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-gray-500">Failed to load dashboard</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-6 w-6 text-sky-600" />}
          label="Total Clinics"
          value={stats.total_clinics}
        />
        <StatCard
          icon={<Building2 className="h-6 w-6 text-green-600" />}
          label="Active Clinics"
          value={stats.active_clinics}
        />
        <StatCard
          icon={<Users className="h-6 w-6 text-purple-600" />}
          label="Total Users"
          value={stats.total_users}
        />
        <StatCard
          icon={<CreditCard className="h-6 w-6 text-amber-600" />}
          label="MRR (UZS)"
          value={stats.mrr?.toLocaleString() || "0"}
        />
      </div>

      {stats.recent_payments?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
          <div className="rounded-xl bg-white border overflow-hidden">
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
                    <td className="px-4 py-3">{p.clinic_name || p.clinic_id}</td>
                    <td className="px-4 py-3 font-medium">{p.amount?.toLocaleString()} UZS</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "completed" ? "bg-green-100 text-green-700" :
                        p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
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

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-white border p-5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
