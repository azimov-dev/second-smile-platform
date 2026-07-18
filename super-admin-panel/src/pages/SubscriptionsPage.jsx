import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { RefreshCw, AlertTriangle, Search } from "lucide-react";

export default function SubscriptionsPage() {
  const { token } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showAssign, setShowAssign] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [duration, setDuration] = useState("30");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trial");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

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
        body: { plan_id: Number(selectedPlan), duration_days: Number(duration), status: subscriptionStatus },
      });
      setShowAssign(null);
      setSelectedPlan("");
      setDuration("30");
      setSubscriptionStatus("trial");
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

  const getDaysRemaining = (subscription) => {
    if (!subscription?.current_period_end) return null;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  };

  const getRowStyle = (clinic) => {
    const days = getDaysRemaining(clinic.subscription);
    if (days !== null && days <= 0) return "bg-red-50";
    if (days !== null && days <= 7) return "bg-red-50";
    if (days !== null && days <= 30) return "bg-yellow-50";
    return "";
  };

  // Filter clinics
  const filteredClinics = clinics.filter((clinic) => {
    const searchMatch =
      !search || clinic.name?.toLowerCase().includes(search.toLowerCase());

    let statusMatch = true;
    const status = clinic.subscription?.status;
    const days = getDaysRemaining(clinic.subscription);

    if (statusFilter === "active") {
      statusMatch = status === "active";
    } else if (statusFilter === "trial") {
      statusMatch = status === "trial";
    } else if (statusFilter === "expiring") {
      statusMatch = (status === "active" || status === "trial") && days !== null && days <= 30;
    } else if (statusFilter === "expired") {
      statusMatch = days !== null && days <= 0;
    } else if (statusFilter === "none") {
      statusMatch = !clinic.subscription;
    }

    return searchMatch && statusMatch;
  });

  // Stats
  const stats = {
    total: clinics.length,
    active: clinics.filter((c) => c.subscription?.status === "active").length,
    trial: clinics.filter((c) => c.subscription?.status === "trial").length,
    expiring: clinics.filter((c) => {
      const days = getDaysRemaining(c.subscription);
      return days !== null && days > 0 && days <= 30;
    }).length,
    noSub: clinics.filter((c) => !c.subscription).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage clinic subscription plans
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg bg-white border p-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-xs text-green-600">Active</p>
          <p className="text-xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-600">Trial</p>
          <p className="text-xl font-bold text-blue-700">{stats.trial}</p>
        </div>
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-xs text-yellow-600">Expiring</p>
          <p className="text-xl font-bold text-yellow-700">{stats.expiring}</p>
        </div>
        <div className="rounded-lg bg-gray-50 border p-3">
          <p className="text-xs text-gray-500">No Sub</p>
          <p className="text-xl font-bold text-gray-700">{stats.noSub}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clinic..."
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
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expiring">Expiring (30 days)</option>
          <option value="expired">Expired</option>
          <option value="none">No Subscription</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Clinic</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Period End</th>
              <th className="px-4 py-3 font-medium">Days Left</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredClinics.map((c) => {
              const days = getDaysRemaining(c.subscription);
              return (
                <tr key={c.id} className={getRowStyle(c)}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.subscription?.plan?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.subscription?.status === "active"
                          ? "bg-green-100 text-green-700"
                          : c.subscription?.status === "trial"
                          ? "bg-blue-100 text-blue-700"
                          : !c.subscription
                          ? "bg-gray-100 text-gray-600"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {c.subscription?.status || "No subscription"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.subscription?.current_period_end
                      ? new Date(c.subscription.current_period_end).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {days !== null ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            days <= 0
                              ? "text-red-600"
                              : days <= 7
                              ? "text-red-600"
                              : days <= 30
                              ? "text-yellow-600"
                              : "text-gray-600"
                          }`}
                        >
                          {days <= 0 ? "Expired" : `${days} days`}
                        </span>
                        {days <= 7 && days > 0 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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
                            <option key={p.id} value={p.id}>
                              {p.name} — {p.price_monthly?.toLocaleString()} UZS/mo
                            </option>
                          ))}
                        </select>
                        <select
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-full rounded border px-2 py-1.5 text-sm"
                        >
                          <option value="14">14 days (trial)</option>
                          <option value="30">30 days</option>
                          <option value="90">90 days</option>
                          <option value="180">180 days</option>
                          <option value="365">365 days (1 year)</option>
                        </select>
                        <select
                          value={subscriptionStatus}
                          onChange={(e) => setSubscriptionStatus(e.target.value)}
                          className="w-full rounded border px-2 py-1.5 text-sm"
                        >
                          <option value="trial">Trial (free period)</option>
                          <option value="active">Active (paid)</option>
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
              );
            })}
          </tbody>
        </table>
        {filteredClinics.length === 0 && (
          <p className="text-center py-8 text-gray-500">No clinics found</p>
        )}
      </div>
    </div>
  );
}
