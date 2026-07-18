import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ClinicFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { token } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    owner_phone: "",
    address: "",
    logo_url: "",
    is_active: true,
  });
  const [adminForm, setAdminForm] = useState({
    admin_full_name: "",
    admin_phone: "",
    admin_password: "",
  });
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trial");
  const [trialDays, setTrialDays] = useState("14");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi("/plans", { token }).then(setPlans).catch(console.error);
    if (isEdit) {
      adminApi(`/clinics/${id}`, { token })
        .then((data) => {
          setForm({
            name: data.name || "",
            slug: data.slug || "",
            owner_phone: data.owner_phone || "",
            address: data.address || "",
            logo_url: data.logo_url || "",
            is_active: data.is_active ?? true,
          });
          if (data.subscription?.plan_id) {
            setSelectedPlan(String(data.subscription.plan_id));
          }
        })
        .catch(console.error);
    }
  }, [id]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handleAdminChange(e) {
    const { name, value } = e.target;
    setAdminForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isEdit) {
        await adminApi(`/clinics/${id}`, { method: "PUT", token, body: form });
      } else {
        const body = { ...form, ...adminForm };
        if (selectedPlan) {
          body.plan_id = Number(selectedPlan);
          body.subscription_status = subscriptionStatus;
          body.trial_days = Number(trialDays);
        }
        await adminApi("/clinics", { method: "POST", token, body });
      }
      navigate("/clinics");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? "Edit Clinic" : "Create Clinic"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white border p-6">
        <Field label="Clinic Name" name="name" value={form.name} onChange={handleChange} required />
        <Field
          label="Slug (subdomain)"
          name="slug"
          value={form.slug}
          onChange={handleChange}
          required
          placeholder="e.g. medstar"
        />
        <Field label="Owner Phone" name="owner_phone" value={form.owner_phone} onChange={handleChange} />
        <Field label="Address" name="address" value={form.address} onChange={handleChange} />
        <Field label="Logo URL" name="logo_url" value={form.logo_url} onChange={handleChange} />

        {!isEdit && (
          <>
            <hr className="my-4" />
            <h3 className="font-semibold text-gray-800">Clinic Admin Account</h3>
            <Field label="Admin Full Name" name="admin_full_name" value={adminForm.admin_full_name} onChange={handleAdminChange} required />
            <Field label="Admin Phone (login)" name="admin_phone" value={adminForm.admin_phone} onChange={handleAdminChange} required placeholder="e.g. 901234567" />
            <Field label="Admin Password" name="admin_password" type="password" value={adminForm.admin_password} onChange={handleAdminChange} required />

            <hr className="my-4" />
            <h3 className="font-semibold text-gray-800">Subscription Plan</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">No plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.price_monthly?.toLocaleString()} UZS/mo</option>
                ))}
              </select>
            </div>
            {selectedPlan && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="trial">Trial (free period)</option>
                    <option value="active">Active (paid)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                  <select
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">365 days (1 year)</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
            id="is_active"
            className="rounded"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-sky-300 transition"
          >
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/clinics")}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, type = "text", ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        {...props}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
      />
    </div>
  );
}
