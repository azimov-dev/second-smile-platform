import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Plus, Building2, Search, AlertTriangle } from "lucide-react";

export default function ClinicsPage() {
  const { token } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    adminApi("/clinics", { token })
      .then(setClinics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const toggleActive = async (clinic) => {
    try {
      const updated = await adminApi(`/clinics/${clinic.id}`, {
        method: "PUT",
        token,
        body: { is_active: !clinic.is_active },
      });
      setClinics((prev) => prev.map((c) => (c.id === clinic.id ? { ...c, ...updated } : c)));
    } catch (err) {
      alert("Failed to update clinic");
    }
  };

  const getDaysRemaining = (subscription) => {
    if (!subscription?.current_period_end) return null;
    const endDate = new Date(subscription.current_period_end);
    const now = new Date();
    return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  };

  const getSubscriptionStatus = (clinic) => {
    const sub = clinic.subscription;
    if (!sub) return "none";
    if (sub.status === "active" || sub.status === "trial") {
      const days = getDaysRemaining(sub);
      if (days !== null && days <= 7) return "expiring";
      return sub.status;
    }
    return sub.status;
  };

  // Filter clinics
  const filteredClinics = clinics.filter((clinic) => {
    const searchMatch =
      !search ||
      clinic.name?.toLowerCase().includes(search.toLowerCase()) ||
      clinic.slug?.toLowerCase().includes(search.toLowerCase());

    let statusMatch = true;
    if (statusFilter === "active") {
      statusMatch = clinic.is_active && getSubscriptionStatus(clinic) === "active";
    } else if (statusFilter === "trial") {
      statusMatch = getSubscriptionStatus(clinic) === "trial";
    } else if (statusFilter === "expiring") {
      statusMatch = getSubscriptionStatus(clinic) === "expiring";
    } else if (statusFilter === "suspended") {
      statusMatch = !clinic.is_active;
    } else if (statusFilter === "no_subscription") {
      statusMatch = getSubscriptionStatus(clinic) === "none";
    }

    return searchMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredClinics.length} of {clinics.length} clinics
          </p>
        </div>
        <Link
          to="/clinics/new"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Add Clinic
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or slug..."
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
          <option value="expiring">Expiring Soon</option>
          <option value="suspended">Suspended</option>
          <option value="no_subscription">No Subscription</option>
        </select>
      </div>

      {/* Clinics Table */}
      <div className="rounded-xl bg-white border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Clinic</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    No clinics found
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic) => {
                  const days = getDaysRemaining(clinic.subscription);
                  const subStatus = getSubscriptionStatus(clinic);

                  return (
                    <tr key={clinic.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-sky-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{clinic.name}</p>
                            <p className="text-xs text-gray-500">{clinic.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            clinic.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {clinic.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {clinic.subscription ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                subStatus === "expiring"
                                  ? "bg-red-100 text-red-700"
                                  : subStatus === "trial"
                                  ? "bg-blue-100 text-blue-700"
                                  : subStatus === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {clinic.subscription.plan?.name || "—"}
                            </span>
                            {subStatus === "expiring" && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No subscription</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {clinic.subscription?.current_period_end ? (
                          <div>
                            <p className="text-sm text-gray-900">
                              {new Date(clinic.subscription.current_period_end).toLocaleDateString()}
                            </p>
                            {days !== null && (
                              <p
                                className={`text-xs ${
                                  days <= 7 ? "text-red-600 font-medium" : "text-gray-500"
                                }`}
                              >
                                {days <= 0 ? "Expired" : `${days} days left`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/clinics/${clinic.id}`}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => toggleActive(clinic)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              clinic.is_active
                                ? "border border-red-200 text-red-600 hover:bg-red-50"
                                : "border border-green-200 text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {clinic.is_active ? "Suspend" : "Activate"}
                          </button>
                        </div>
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
