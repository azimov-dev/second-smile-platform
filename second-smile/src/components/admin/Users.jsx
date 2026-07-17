import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Shield, X } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { getErrorMessage } from "../../utils/errorMessage.js";

const ROLES = ["admin", "doctor", "reception"];

export function Users() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    role: "doctor",
    password: "",
  });

  // Load users
  useEffect(() => {
    if (!token) return;

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiClient("/admin/users", { method: "GET", token });
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("loadUsers error", err);
        setError(err.message || "Foydalanuvchilarni yuklashda xatolik.");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [token, t]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ full_name: "", phone: "", role: "doctor", password: "" });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || "",
      phone: user.phone || "",
      role: user.role || "doctor",
      password: "",
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setSaving(false);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.full_name.trim() ||
      !formData.phone.trim() ||
      !formData.role
    ) {
      setError(
        t("usersPage.requiredFields") || "Ism, telefon va rol majburiy.",
      );
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setError(
        t("usersPage.passwordRequired") ||
          "Yangi foydalanuvchi uchun parol kiriting.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingUser) {
        const updated = await apiClient(`/admin/users/${editingUser.id}`, {
          method: "PUT",
          token,
          body: {
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            role: formData.role,
          },
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? updated : u)),
        );
        toast.success("Foydalanuvchi yangilandi");
      } else {
        const created = await apiClient("/admin/users", {
          method: "POST",
          token,
          body: {
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            role: formData.role,
            password: formData.password,
          },
        });
        setUsers((prev) => [...prev, created]);
        toast.success("Foydalanuvchi yaratildi");
      }

      closeModal();
    } catch (err) {
      console.error("save user error", err);
      const msg = getErrorMessage(err, t);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    const userName = user.full_name;

    let confirmMessage = `"${userName}" | ${t("usersPage.confirmDelete")}`;

    try {
      // If your i18n supports object interpolation (like i18next)
      const translated = t("usersPage.confirmDelete", { name: userName });
      if (translated && translated !== "usersPage.confirmDelete") {
        confirmMessage = translated;
      }
    } catch (e) {
      // Fallback to simple string if interpolation fails
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await apiClient(`/admin/users/${user.id}`, { method: "DELETE", token });
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error("delete user error", err);
      const msg = getErrorMessage(err, t);
      setError(msg);
      toast.error(msg);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: "bg-purple-100 text-purple-800",
      doctor: "bg-blue-100 text-blue-800",
      reception: "bg-green-100 text-green-800",
    };
    const colorClass = colors[role] || "bg-gray-100 text-gray-800";

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${colorClass}`}
      >
        <Shield className="h-4 w-4" />
        {t(`common.${role}`) || role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t("usersPage.title") || "Foydalanuvchilar"}
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            {t("usersPage.subtitle") ||
              "Doktorlar va registratorlarni boshqarish"}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3.5 rounded-xl shadow-md transition"
        >
          <Plus className="h-5 w-5" />
          {t("usersPage.addUser") || "Yangi foydalanuvchi"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700">
          {error}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t("usersPage.fullName") || "Ism Familiya"}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t("usersPage.phone") || "Telefon"}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t("usersPage.role") || "Rol"}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  {t("actions") || "Amallar"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    {t("common.loading") || "Yuklanmoqda..."}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <p className="text-lg font-medium text-slate-600">
                      {t("usersPage.noUsers") || "Hozircha foydalanuvchi yo'q"}
                    </p>
                    <p className="mt-3 text-slate-500">
                      {t("usersPage.addFirst") ||
                        "Yuqoridagi tugma orqali birinchi xodimni qo'shing"}
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {user.full_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteUser(user)}
                          className="rounded-lg bg-red-600 p-2.5 text-white hover:bg-red-700 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-5">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="text-slate-500">
              {t("common.loading") || "Yuklanmoqda..."}
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
            <p className="text-xl font-medium text-slate-600">
              {t("usersPage.noUsers") || "Foydalanuvchi yo'q"}
            </p>
            <p className="mt-4 text-slate-500">
              {t("usersPage.addFirst") ||
                "Yuqoridagi tugma orqali yangi xodim qo'shing"}
            </p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {user.full_name}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">{user.phone}</p>
                </div>
                {getRoleBadge(user.role)}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => openEditModal(user)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
                >
                  <Edit2 className="h-5 w-5" />
                  {t("common.edit") || "Tahrirlash"}
                </button>
                <button
                  onClick={() => deleteUser(user)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                  <Trash2 className="h-5 w-5" />
                  {t("common.delete") || "O'chirish"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h3 className="text-xl font-bold text-slate-900">
                {editingUser
                  ? t("usersPage.editTitle") || "Foydalanuvchini tahrirlash"
                  : t("usersPage.addTitle") || "Yangi foydalanuvchi qo'shish"}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 hover:bg-slate-100 transition"
              >
                <X className="h-6 w-6 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t("usersPage.fullName") || "Ism Familiya"}
                </label>
                <input
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t("usersPage.phone") || "Telefon"}
                </label>
                <input
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t("usersPage.role") || "Rol"}
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`common.${role}`) ||
                        role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("common.initialPassword") || "Dastlabki parol"}
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!editingUser}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-8 py-3.5 rounded-xl border border-slate-300 font-medium hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-8 py-3.5 rounded-xl font-medium transition ${
                    saving
                      ? "bg-indigo-400 text-white cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {saving
                    ? t("common.saving") || "Saqlanmoqda..."
                    : editingUser
                    ? t("common.save") || "Saqlash"
                    : t("common.create") || "Yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
