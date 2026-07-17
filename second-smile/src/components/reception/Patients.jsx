import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  User,
  Phone,
  Calendar,
  MapPin,
  Loader2,
  X,
  FileText,
} from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

export function Patients() {
  const { t } = useLanguage();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    birthDate: "",
    address: "",
    medicalHistory: "",
  });

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch patients
  const fetchPatients = async () => {
    if (!token) {
      setError(t("errors.noToken") || "Iltimos, tizimga kiring");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const data = await apiClient("/patients", { token });
      const normalized = data.map((p) => ({
        id: p.id,
        firstName: p.first_name || "",
        lastName: p.last_name || "",
        phone: p.phone || "",
        // normalize birth_date to YYYY-MM-DD so <input type="date"> accepts it
        birthDate:
          p.birth_date && !Number.isNaN(new Date(p.birth_date).getTime())
            ? new Date(p.birth_date).toISOString().slice(0, 10)
            : "",
        address: p.address || "",
        medicalHistory: p.medical_history || "",
      }));
      setPatients(normalized);
    } catch (err) {
      setError(
        err.message || t("errors.loadPatients") || "Bemorlarni yuklashda xato",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [token]);

  // Search filter
  const filteredPatients = patients.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.phone}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStart = filteredPatients.length ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, filteredPatients.length);
  const paginatedPatients = filteredPatients.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Normalize date inputs to YYYY-MM-DD so server receives consistent format
    if (name === "birthDate") {
      const dateVal = value ? new Date(value) : null;
      const normalized =
        dateVal && !Number.isNaN(dateVal.getTime())
          ? dateVal.toISOString().slice(0, 10)
          : "";
      setFormData((prev) => ({ ...prev, [name]: normalized }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      // For creating we send `birth_date` (matches createPatient on server)
      const createBody = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
        birth_date: formData.birthDate || null,
        address: formData.address.trim() || null,
        medical_history: formData.medicalHistory.trim() || null,
      };

      if (editingPatient) {
        const updateBody = {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          phone: formData.phone.trim(),
          birth_date: formData.birthDate || null,
          address: formData.address.trim() || null,
          medical_history: formData.medicalHistory.trim() || null,
        };
        await apiClient(`/patients/${editingPatient.id}`, {
          method: "PUT",
          token,
          body: updateBody,
        });
      } else {
        // Add new
        await apiClient("/patients", {
          method: "POST",
          token,
          body: createBody,
        });
      }

      setShowModal(false);
      setEditingPatient(null);
      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        birthDate: "",
        address: "",
        medicalHistory: "",
      });
      await fetchPatients();
    } catch (err) {
      setError(err.message || "Saqlashda xato yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingPatient(null);
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      birthDate: "",
      address: "",
      medicalHistory: "",
    });
    setShowModal(true);
  };

  const openEditModal = (patient) => {
    setEditingPatient(patient);
    // Ensure birthDate is in YYYY-MM-DD format for the date input
    const normalizedBirth =
      patient.birthDate && !Number.isNaN(new Date(patient.birthDate).getTime())
        ? new Date(patient.birthDate).toISOString().slice(0, 10)
        : "";
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      birthDate: normalizedBirth,
      address: patient.address,
      medicalHistory: patient.medicalHistory,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        t("common.deleteConfirm") || "Haqiqatan o'chirmoqchimisiz?",
      )
    )
      return;

    try {
      await apiClient(`/patients/${id}`, { method: "DELETE", token });
      await fetchPatients();
    } catch (err) {
      setError(err.message || "O'chirishda xato");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("patients.title") || "Bemorlar"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("patients.subtitle") || "Bemorlar ro'yxati va boshqaruv"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-3 rounded-xl shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">
            {t("patients.addButton") || "Yangi bemor"}
          </span>
          <span className="sm:hidden">
            {t("patients.addButton") || "Yangi bemor"}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={
              t("patients.searchPlaceholder") ||
              "Ism yoki telefon bo'yicha qidirish..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredPatients.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-600">
            {pageStart}-{pageEnd} / {filteredPatients.length}
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

      {/* Patients List */}
      <div className="grid gap-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="h-6 w-40 bg-gray-200 rounded"></div>
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
                <div className="h-6 w-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg text-gray-500">
              {searchQuery ? "Hech narsa topilmadi" : "Hozircha bemor yo'q"}
            </p>
          </div>
        ) : (
          paginatedPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{patient.birthDate || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{patient.address || "—"}</span>
                    </div>
                  </div>
                  <div
                    className={`mt-3 p-2 rounded-lg border ${patient.medicalHistory ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}
                  >
                    <div className="flex items-start gap-2">
                      <FileText
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${patient.medicalHistory ? "text-amber-500" : "text-gray-400"}`}
                      />
                      <div>
                        <span
                          className={`font-medium text-xs block mb-1 ${patient.medicalHistory ? "text-amber-700" : "text-gray-500"}`}
                        >
                          {t("patients.form.medicalHistory") || "Tibbiy tarix"}:
                        </span>
                        <span
                          className={`text-sm whitespace-pre-wrap ${patient.medicalHistory ? "text-amber-800" : "text-gray-400 italic"}`}
                        >
                          {patient.medicalHistory ||
                            t("patients.noMedicalHistory") ||
                            "Ma'lumot kiritilmagan"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditModal(patient)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title={t("common.edit") || "Tahrirlash"}
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(patient.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title={t("common.delete") || "O'chirish"}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {editingPatient
                    ? t("patients.editPatient") ||
                      "Bemor ma'lumotlarini tahrirlash"
                    : t("patients.addPatient") || "Yangi bemor qo'shish"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("patients.form.firstName") || "Ism"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder={t("patients.form.firstName") || "Ism"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("patients.form.lastName") || "Familiya"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder={t("patients.form.lastName") || "Familiya"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("patients.form.phone") || "Telefon"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="+998 xx xxx xx xx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("patients.form.birthDate") || "Tug'ilgan sana"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("patients.form.address") || "Manzil"}
                </label>
                <input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder={t("patients.form.addressPlaceholder") || "Manzil (ixtiyoriy)"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("patients.form.medicalHistory") || "Tibbiy tarix"}
                </label>
                <textarea
                  name="medicalHistory"
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
                  placeholder={
                    t("patients.form.medicalHistoryPlaceholder") ||
                    "Kasalliklar, allergiyalar, doimiy dorilar..."
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 ${
                    isSubmitting
                      ? "bg-blue-400 text-white cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting
                    ? t("common.saving") || "Saqlanmoqda..."
                    : t("common.save") || "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
