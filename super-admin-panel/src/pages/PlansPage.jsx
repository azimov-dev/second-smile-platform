import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function PlansPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return { name: "", slug: "", price_monthly: "", price_yearly: "", max_doctors: "", max_patients: "", max_appointments_per_month: "", trial_days: "14", is_active: true };
  }

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    try {
      const data = await adminApi("/plans", { token });
      setPlans(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function startEdit(plan) {
    setEditing(plan.id);
    setForm({
      name: plan.name,
      slug: plan.slug,
      price_monthly: String(plan.price_monthly),
      price_yearly: String(plan.price_yearly || ""),
      max_doctors: String(plan.max_doctors),
      max_patients: String(plan.max_patients),
      max_appointments_per_month: String(plan.max_appointments_per_month),
      trial_days: String(plan.trial_days || 14),
      is_active: plan.is_active,
    });
  }

  function startCreate() {
    setEditing("new");
    setForm(emptyForm());
  }

  async function handleSave(e) {
    e.preventDefault();
    const body = {
      ...form,
      price_monthly: Number(form.price_monthly),
      price_yearly: Number(form.price_yearly) || null,
      max_doctors: Number(form.max_doctors),
      max_patients: Number(form.max_patients),
      max_appointments_per_month: Number(form.max_appointments_per_month),
      trial_days: Number(form.trial_days) || 14,
    };

    try {
      if (editing === "new") {
        await adminApi("/plans", { method: "POST", token, body });
      } else {
        await adminApi(`/plans/${editing}`, { method: "PUT", token, body });
      }
      setEditing(null);
      loadPlans();
    } catch (err) { console.error(err); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
        <button onClick={startCreate} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition">
          <Plus className="h-4 w-4" /> Add Plan
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="mb-6 rounded-xl bg-white border p-5 space-y-4">
          <h3 className="font-semibold">{editing === "new" ? "New Plan" : "Edit Plan"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <input name="name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="slug" placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="price_monthly" placeholder="Price Monthly (UZS)" type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="price_yearly" placeholder="Price Yearly (UZS)" type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
            <input name="max_doctors" placeholder="Max Doctors" type="number" value={form.max_doctors} onChange={(e) => setForm({ ...form, max_doctors: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="max_patients" placeholder="Max Patients" type="number" value={form.max_patients} onChange={(e) => setForm({ ...form, max_patients: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="max_appointments_per_month" placeholder="Max Appointments/Month" type="number" value={form.max_appointments_per_month} onChange={(e) => setForm({ ...form, max_appointments_per_month: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="trial_days" placeholder="Trial Days" type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition">Save</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-xl bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Monthly</th>
              <th className="px-4 py-3 font-medium">Doctors</th>
              <th className="px-4 py-3 font-medium">Patients</th>
              <th className="px-4 py-3 font-medium">Appts/mo</th>
              <th className="px-4 py-3 font-medium">Trial</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.price_monthly?.toLocaleString()} UZS</td>
                <td className="px-4 py-3">{p.max_doctors}</td>
                <td className="px-4 py-3">{p.max_patients}</td>
                <td className="px-4 py-3">{p.max_appointments_per_month}</td>
                <td className="px-4 py-3">{p.trial_days || 14} days</td>
                <td className="px-4 py-3">
                  <button onClick={() => startEdit(p)} className="rounded p-1 hover:bg-gray-100">
                    <Pencil className="h-4 w-4 text-gray-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
