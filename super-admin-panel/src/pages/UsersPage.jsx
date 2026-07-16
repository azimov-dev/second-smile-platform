import { useState, useEffect } from "react";
import { adminApi } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Plus, Trash2 } from "lucide-react";

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clinic_id: "", full_name: "", phone: "", password: "", role: "admin" });
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi("/clinics", { token }).then(setClinics).catch(console.error);
    loadUsers();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [selectedClinic]);

  async function loadUsers() {
    try {
      const query = selectedClinic ? `?clinic_id=${selectedClinic}` : "";
      const data = await adminApi(`/users${query}`, { token });
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await adminApi("/users", { method: "POST", token, body: form });
      setShowForm(false);
      setForm({ clinic_id: "", full_name: "", phone: "", password: "", role: "admin" });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(userId) {
    if (!confirm("Delete this user?")) return;
    try {
      await adminApi(`/users/${userId}`, { method: "DELETE", token });
      loadUsers();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Filter by clinic */}
      <div className="mb-4">
        <select
          value={selectedClinic}
          onChange={(e) => setSelectedClinic(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All clinics</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Create User Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl bg-white border p-5 space-y-4">
          <h3 className="font-semibold">New User</h3>
          <div className="grid grid-cols-2 gap-4">
            <select name="clinic_id" value={form.clinic_id} onChange={(e) => setForm({ ...form, clinic_id: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required>
              <option value="">Select clinic</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select name="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border px-3 py-2 text-sm">
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="reception">Reception</option>
            </select>
            <input name="full_name" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="phone" placeholder="Phone (login)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
            <input name="password" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" required />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="rounded-xl bg-white border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Clinic</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3">{u.phone}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.role === "admin" ? "bg-purple-100 text-purple-700" :
                    u.role === "doctor" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.clinic_name || u.clinic_id}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(u.id)} className="rounded p-1 hover:bg-gray-100" title="Delete">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center py-8 text-gray-500">No users found</p>
        )}
      </div>
    </div>
  );
}
