import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

export default function CategoriesPage() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Form state
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState("#3B82F6");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadCategories = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiClient("/service-categories", {
          method: "GET",
          token,
        });
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err.message ||
            t("common.errorLoading") ||
            "Ma'lumotlarni yuklashda xato",
        );
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [token, t]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setColorHex("#3B82F6");
    setIsActive(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const startEdit = (cat) => {
    setEditing(cat);
    setName(cat.name || "");
    setColorHex(cat.color_hex || "#3B82F6");
    setIsActive(!!cat.is_active);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      color_hex: colorHex,
      is_active: isActive,
    };

    try {
      setSaving(true);
      setError("");

      if (editing) {
        const updated = await apiClient(`/service-categories/${editing.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        setCategories((prev) =>
          prev.map((c) => (c.id === editing.id ? updated : c)),
        );
      } else {
        const created = await apiClient("/service-categories", {
          method: "POST",
          token,
          body: payload,
        });
        setCategories((prev) => [...prev, created]);
      }

      closeModal();
    } catch (err) {
      setError(err.message || t("common.errorSaving") || "Saqlashda xato");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (
      !window.confirm(
        t("category.confirmDelete", { name: cat.name }) ||
          `${cat.name} kategoriyasini o'chirishni tasdiqlaysizmi?`,
      )
    ) {
      return;
    }

    try {
      await apiClient(`/service-categories/${cat.id}`, {
        method: "DELETE",
        token,
      });
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      setError(err.message || t("common.errorDeleting") || "O'chirishda xato");
    }
  };

  const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = categories.length ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, categories.length);
  const pagedCategories = categories.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t("categories") || "Xizmat kategoriyalari"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            {t("category.subtitle") ||
              "Xizmatlarni guruhlash uchun kategoriyalarni boshqaring"}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-white font-semibold hover:bg-sky-700 transition"
        >
          {t("category.addTitle") || "Yangi kategoriya qo'shish"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700">
          {error}
        </div>
      )}

      {/* Desktop */}
      <div className="hidden lg:block">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {t("categories") || "Kategoriyalar"}
              </h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {categories.length} ta
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">{t("category.name") || "Nomi"}</th>
                  <th className="px-4 py-2">{t("category.color") || "Rang"}</th>
                  <th className="px-4 py-2">
                    {t("common.status") || "Holati"}
                  </th>
                  <th className="px-4 py-2 text-right whitespace-nowrap">
                    {t("actions") || "Amallar"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {t("common.loading") || "Yuklanmoqda..."}
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-lg font-medium text-gray-600">
                        {t("category.noCategory") || "Hozircha kategoriya yo'q"}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        Yangi kategoriya qo'shing
                      </p>
                    </td>
                  </tr>
                ) : (
                  pagedCategories.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {cat.name}
                      </td>
                      <td className="px-4 py-2">
                        <div
                          className="h-9 w-20 rounded-lg border border-gray-300 shadow-inner"
                          style={{ backgroundColor: cat.color_hex || "#ccc" }}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            cat.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {cat.is_active
                            ? t("common.active") || "Faol"
                            : t("common.inactive") || "Faol emas"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            onClick={() => startEdit(cat)}
                            className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 transition"
                          >
                            {t("common.edit") || "Tahrirlash"}
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 transition"
                          >
                            {t("common.delete") || "O'chirish"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && categories.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pageStart}-{pageEnd} / {categories.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium disabled:opacity-50"
                >
                  {t("common.prev") || "Oldingi"}
                </button>
                <div className="px-3 text-sm text-gray-700">
                  {page} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium disabled:opacity-50"
                >
                  {t("common.next") || "Keyingi"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Stacked Layout */}
      <div className="lg:hidden space-y-6">
        {/* Categories List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("categories") || "Kategoriyalar"} ({categories.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">
                {t("common.loading") || "Yuklanmoqda..."}
              </div>
            ) : categories.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-medium text-gray-600">
                  {t("category.noCategory") || "Kategoriya yo'q"}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Yuqoridan yangi kategoriya qo'shing
                </p>
              </div>
            ) : (
              pagedCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="px-6 py-5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        #{(page - 1) * pageSize + idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cat.is_active
                            ? t("common.active") || "Faol"
                            : t("common.inactive") || "Faol emas"}
                        </p>
                      </div>
                    </div>
                    <div
                      className="h-10 w-16 rounded-lg border border-gray-300 shadow-inner"
                      style={{ backgroundColor: cat.color_hex || "#ccc" }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(cat)}
                      className="flex-1 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
                    >
                      {t("common.edit") || "Tahrirlash"}
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                    >
                      {t("common.delete") || "O'chirish"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && categories.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pageStart}-{pageEnd} / {categories.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium disabled:opacity-50"
                >
                  {t("common.prev") || "Oldingi"}
                </button>
                <div className="px-3 text-sm text-gray-700">
                  {page} / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium disabled:opacity-50"
                >
                  {t("common.next") || "Keyingi"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing
                  ? t("category.editTitle") || "Kategoriyani tahrirlash"
                  : t("category.addTitle") || "Yangi kategoriya qo'shish"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-white/80 hover:text-white"
                aria-label={t("common.close") || "Yopish"}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("category.name") || "Kategoriya nomi"}
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    t("category.namePlaceholder") || "Masalan: Terapiya"
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("category.color") || "Rang"}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="h-12 w-20 cursor-pointer rounded-lg border-2 border-gray-300"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) =>
                        setColorHex(e.target.value.toUpperCase())
                      }
                      placeholder="#3B82F6"
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("common.status") || "Holati"}
                  </label>
                  <select
                    value={isActive ? "1" : "0"}
                    onChange={(e) => setIsActive(e.target.value === "1")}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="1">{t("common.active") || "Faol"}</option>
                    <option value="0">
                      {t("common.inactive") || "Faol emas"}
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-5 py-3 rounded-lg border border-gray-300 bg-white font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-6 py-3 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed transition"
                >
                  {saving
                    ? (t("common.saving") || "Saqlanmoqda") + "..."
                    : t("common.save") || "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
