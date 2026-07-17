// src/pages/Services.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

export function Services() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Form
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t("errors.noToken") || "Tizimga kirish kerak");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const [servicesRes, categoriesRes] = await Promise.all([
          apiClient("/services", { token }),
          apiClient("/service-categories", { token }),
        ]);

        setServices(Array.isArray(servicesRes) ? servicesRes : []);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
      } catch (err) {
        setError(
          err.message ||
            t("errors.loadServices") ||
            "Xizmatlarni yuklashda xato",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, t]);

  const categoriesById = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = c));
    return map;
  }, [categories]);

  const totalPages = Math.max(1, Math.ceil(services.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = services.length ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, services.length);
  const pagedServices = services.slice((page - 1) * pageSize, page * pageSize);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setCategoryId("");
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const startEdit = (service) => {
    setEditing(service);
    setName(service.name || "");
    setPrice(service.price?.toString() || "");
    setCategoryId(service.category_id || service.categoryId || "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("errors.nameRequired") || "Xizmat nomi kiritilmagan");
      return;
    }
    if (!price || Number(price) < 0) {
      setError(t("errors.priceInvalid") || "Narx noto'g'ri");
      return;
    }

    const payload = {
      name: name.trim(),
      price: Number(price),
      category_id: categoryId || null,
    };

    try {
      setSaving(true);
      setError("");

      if (editing) {
        const updated = await apiClient(`/services/${editing.id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        setServices((prev) =>
          prev.map((s) => (s.id === editing.id ? updated : s)),
        );
      } else {
        const created = await apiClient("/services", {
          method: "POST",
          token,
          body: payload,
        });
        setServices((prev) => [...prev, created]);
      }

      closeModal();
    } catch (err) {
      setError(err.message || t("errors.saveFailed") || "Saqlashda xato");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (service) => {
    if (
      !window.confirm(
        t("service.confirmDelete", { name: service.name }) ||
          `"${service.name}" xizmatini o'chirishni tasdiqlaysizmi?`,
      )
    ) {
      return;
    }

    try {
      await apiClient(`/services/${service.id}`, { method: "DELETE", token });
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch (err) {
      setError(err.message || t("errors.deleteFailed") || "O'chirishda xato");
    }
  };

  const getCategoryInfo = (service) => {
    const category = categoriesById[service.category_id || service.categoryId];
    if (!category) return { name: "-", color: "#94a3b8" };
    return { name: category.name, color: category.color_hex || "#6366f1" };
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t("services") || "Xizmatlar"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            {t("listOfServices") ||
              "Klinikada taqdim etiladigan barcha xizmatlar ro'yxati"}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-white font-semibold hover:bg-sky-700 transition"
        >
          {t("addServices") || "Yangi xizmat qo'shish"}
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
                {t("services") || "Xizmatlar"}
              </h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {services.length} ta
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">
                    {t("services") || "Xizmat nomi"}
                  </th>
                  <th className="px-4 py-2">
                    {t("categories") || "Kategoriya"}
                  </th>
                  <th className="px-4 py-2 text-right">
                    {t("price") || "Narx"}
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
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-lg font-medium text-gray-600">
                        {t("noServices") || "Hozircha xizmat yo'q"}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        {t("addServices") || "Yangi xizmat qo'shing"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pagedServices.map((service, index) => {
                    const { name: catName, color: catColor } =
                      getCategoryInfo(service);
                    return (
                      <tr
                        key={service.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {(page - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {service.name}
                        </td>
                        <td className="px-4 py-2">
                          {catName !== "-" ? (
                            <span
                              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${catColor}20`,
                                color: catColor,
                              }}
                            >
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: catColor }}
                              />
                              {catName}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                          {new Intl.NumberFormat("uz-UZ").format(service.price)}{" "}
                          so'm
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => startEdit(service)}
                              className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 transition"
                            >
                              {t("common.edit") || "Tahrirlash"}
                            </button>
                            <button
                              onClick={() => handleDelete(service)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 transition"
                            >
                              {t("common.delete") || "O'chirish"}
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

          {/* Pagination */}
          {!loading && services.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pageStart}-{pageEnd} / {services.length}
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

      {/* Mobile */}
      <div className="lg:hidden space-y-6">
        {/* Services List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("services") || "Xizmatlar"} ({services.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">
                {t("common.loading") || "Yuklanmoqda..."}
              </div>
            ) : services.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-lg font-medium text-gray-600">
                  {t("noServices") || "Xizmat yo'q"}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Yuqoridan yangi xizmat qo'shing
                </p>
              </div>
            ) : (
              pagedServices.map((service, index) => {
                const { name: catName, color: catColor } =
                  getCategoryInfo(service);
                return (
                  <div
                    key={service.id}
                    className="px-6 py-5 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          #{(page - 1) * pageSize + index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {service.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {catName !== "-" ? (
                              <span
                                className="inline-flex items-center gap-1.5"
                                style={{ color: catColor }}
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full inline-block"
                                  style={{ backgroundColor: catColor }}
                                />
                                {catName}
                              </span>
                            ) : (
                              "Kategoriyasiz"
                            )}
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {new Intl.NumberFormat("uz-UZ").format(service.price)}{" "}
                        so'm
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(service)}
                        className="flex-1 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700"
                      >
                        {t("common.edit") || "Tahrirlash"}
                      </button>
                      <button
                        onClick={() => handleDelete(service)}
                        className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                      >
                        {t("common.delete") || "O'chirish"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {!loading && services.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pageStart}-{pageEnd} / {services.length}
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
                  ? t("editService") || "Xizmatni tahrirlash"
                  : t("addServices") || "Yangi xizmat qo'shish"}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("nameOfService") || "Xizmat nomi"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("nameOfService") || "Xizmat nomi"}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("price") || "Narx (so'm)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="150000"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("categories") || "Kategoriya"}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">
                      {t("category.selectCategory") || "Kategoriyasiz"}
                    </option>
                    {categories
                      .filter((c) => c.is_active)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
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
                  disabled={
                    saving || !name.trim() || !price || Number(price) < 0
                  }
                  className="px-6 py-3 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed transition"
                >
                  {saving
                    ? t("common.saving") + "..."
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
