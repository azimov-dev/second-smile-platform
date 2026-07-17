import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { CreditCard, RefreshCw } from "lucide-react";

export default function SubscriptionsPage() {
  const { token } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showAssign, setShowAssign] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [duration, setDuration] = useState("30");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [clinicsData, plansData] = await Promise.all([
        adminApi("/clinics", { token }),
        adminApi("/plans", { token }),
      ]);
      setClinics(clinicsData);
      setPlans(plansData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(clinicId) {
    if (!selectedPlan) return;
    setActionLoading(clinicId);
    try {
      await adminApi(`/clinics/${clinicId}/subscription`, {
        method: "POST",
        token,
        body: { plan_id: Number(selectedPlan), duration_days: Number(duration) },
      });
      setShowAssign(null);
      setSelectedPlan("");
      setDuration("30");
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(clinicId) {
    if (!confirm("Cancel this clinic's subscription?")) return;
    setActionLoading(clinicId);
    try {
      await adminApi(`/clinics/${clinicId}/subscription`, {
        method: "DELETE",
        token,
      });
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <button onClick={loadData} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="rounded-xl bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Clinic</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Period End</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clinics.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.subscription?.plan?.name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.subscription?.status === "active" ? "bg-green-100 text-green-700" :
                    c.subscription?.status === "trial" ? "bg-blue-100 text-blue-700" :
                    !c.subscription ? "bg-gray-100 text-gray-600" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {c.subscription?.status || "No subscription"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {c.subscription?.current_period_end
                    ? new Date(c.subscription.current_period_end).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAssign(showAssign === c.id ? null : c.id)}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                    >
                      {c.subscription ? "Change" : "Assign"}
                    </button>
                    {c.subscription && (
                      <button
                        onClick={() => handleCancel(c.id)}
                        disabled={actionLoading === c.id}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {showAssign === c.id && (
                    <div className="mt-3 rounded-lg border bg-gray-50 p-3 space-y-2">
                      <select
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                      >
                        <option value="">Select plan</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} — {p.price_monthly?.toLocaleString()} UZS/mo</option>
                        ))}
                      </select>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full rounded border px-2 py-1.5 text-sm"
                      >
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="180">180 days</option>
                        <option value="365">365 days (1 year)</option>
                      </select>
                      <button
                        onClick={() => handleAssign(c.id)}
                        disabled={!selectedPlan || actionLoading === c.id}
                        className="w-full rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
                      >
                        {actionLoading === c.id ? "Saving..." : "Activate Subscription"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
