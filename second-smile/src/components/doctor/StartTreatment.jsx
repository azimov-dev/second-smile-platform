import { useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { ToothChartWithImages } from "./ToothChartWithImages.jsx";
import { useTreatmentSession } from "../../hooks/useTreatmentSession.jsx";
import {
  User,
  Phone,
  Calendar,
  MapPin,
  Pencil,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { apiClient } from "../../api/client.js";

export function StartTreatment() {
  const { id } = useParams(); // appointment ID
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [serviceQuery, setServiceQuery] = useState("");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState("all");
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState({});
  const [patientSaving, setPatientSaving] = useState(false);
  const [patientError, setPatientError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const {
    appointment,
    setAppointment,
    services,
    serviceCategoriesById,
    selectedTeeth,
    selectedServices,
    discountAmount,
    loading,
    saving,
    error,
    total,
    discountedTotal,
    toggleService,
    updateQuantity,
    updateServiceToothNumbers,
    updateServiceNotes,
    toggleTooth,
    saveTo,
    setDiscountAmount,
  } = useTreatmentSession({ id, token, t });

  const openPatientEditModal = () => {
    const patient = appointment?.patient || {};
    setPatientForm({
      first_name: patient.first_name || "",
      last_name: patient.last_name || "",
      phone: patient.phone || "",
      birth_date: patient.birth_date ? patient.birth_date.slice(0, 10) : "",
      address: patient.address || "",
      medical_history: patient.medical_history || "",
    });
    setPatientError("");
    setShowPatientModal(true);
  };

  const handleSavePatient = async () => {
    if (!appointment?.patient?.id) return;
    setPatientSaving(true);
    setPatientError("");
    try {
      const updated = await apiClient(`/patients/${appointment.patient.id}`, {
        method: "PUT",
        token,
        body: patientForm,
      });
      setAppointment((prev) => ({
        ...prev,
        patient: { ...prev.patient, ...updated },
      }));
      setShowPatientModal(false);
    } catch (err) {
      setPatientError(
        err.message || t("errors.saveFailed") || "Xatolik yuz berdi",
      );
    } finally {
      setPatientSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveTo(`/appointments/${id}/start-treatment`);
      navigate("/doctor/treatments");
    } catch {
      // saveTo sets error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-lg text-gray-600">
          {t("common.loading") || "Yuklanmoqda..."}
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-32">
        <p className="text-xl text-red-600">
          {t("errors.appointmentNotFound") || "Qabul topilmadi"}
        </p>
      </div>
    );
  }

  const patientName =
    `${appointment.patient?.first_name || ""} ${
      appointment.patient?.last_name || ""
    }`.trim() || "Noma'lum bemor";

  const getServiceCategoryKey = (service) => {
    const categoryId =
      service?.category?.id ??
      service?.category_id ??
      service?.categoryId ??
      null;
    return categoryId != null ? String(categoryId) : "uncategorized";
  };

  const getCategoryLabelByKey = (key) => {
    if (key === "all") return t("common.all") || "Barchasi";
    if (key === "uncategorized") return t("category.uncategorized") || "Boshqa";

    const category =
      serviceCategoriesById?.[key] || serviceCategoriesById?.[Number(key)];
    return (category?.name && String(category.name)) || key;
  };

  const categoryTabs = (() => {
    const categories = Object.values(serviceCategoriesById || {})
      .filter(Boolean)
      .map((c) => ({
        key: String(c.id ?? c._id ?? c.category_id ?? c.categoryId ?? ""),
        name: String(c.name ?? ""),
      }))
      .filter((c) => c.key && c.name)
      .sort((a, b) => a.name.localeCompare(b.name, "uz"));

    const usedCategoryKeys = new Set(services.map(getServiceCategoryKey));
    const hasUncategorized = usedCategoryKeys.has("uncategorized");

    const tabs = [{ key: "all", label: getCategoryLabelByKey("all") }];
    for (const c of categories) {
      tabs.push({ key: c.key, label: c.name });
    }
    if (hasUncategorized) {
      tabs.push({
        key: "uncategorized",
        label: getCategoryLabelByKey("uncategorized"),
      });
    }
    return tabs;
  })();

  const normalizedQuery = serviceQuery.trim().toLowerCase();
  const selectedIds = new Set(selectedServices.map((s) => s.id));
  const servicesInSelectedCategory =
    selectedCategoryKey === "all"
      ? services
      : services.filter(
          (s) => getServiceCategoryKey(s) === selectedCategoryKey,
        );

  const baseFilteredServices = normalizedQuery
    ? servicesInSelectedCategory.filter((s) =>
        (s.name || "").toLowerCase().includes(normalizedQuery),
      )
    : servicesInSelectedCategory;

  const displayServices = normalizedQuery
    ? [
        ...baseFilteredServices,
        ...servicesInSelectedCategory.filter(
          (s) =>
            selectedIds.has(s.id) &&
            !baseFilteredServices.some((f) => f.id === s.id),
        ),
      ]
    : servicesInSelectedCategory;

  const renderServiceCard = (service) => {
    const selected = selectedServices.find((s) => s.id === service.id);

    return (
      <div
        key={service.id}
        className={`rounded-xl border-2 p-4 sm:p-5 transition-all cursor-pointer ${
          selected
            ? "border-blue-500 bg-blue-50 shadow-md"
            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          toggleService(service);
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">
              {service.name}
            </h3>
            <p className="mt-2 text-lg sm:text-xl font-bold text-slate-800">
              {service.price.toLocaleString()} so'm
            </p>
          </div>

          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => {
              e.stopPropagation();
              toggleService(service);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {selected && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">
                {t("common.quantity") || "Soni"}:
              </label>
              <input
                type="number"
                min="1"
                value={selected.quantity}
                onChange={(e) => {
                  e.stopPropagation();
                  updateQuantity(service.id, Number(e.target.value));
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-20 sm:w-24 rounded-lg border border-gray-300 px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("treatment.selectedTeeth", {}, "Teeth") || "Tishlar"}
              </label>
              <input
                value={selected.tooth_numbers || ""}
                onChange={(e) => {
                  e.stopPropagation();
                  updateServiceToothNumbers(service.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  selectedTeeth.length > 0
                    ? selectedTeeth.join(",")
                    : "11,12,13"
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("common.notes") || "Eslatmalar"}
              </label>
              <textarea
                value={selected.notes || ""}
                onChange={(e) => {
                  e.stopPropagation();
                  updateServiceNotes(service.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                rows={2}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("common.notes", {}, "Notes (optional)")}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-32 md:p-6 md:pb-6">
      {/* Header */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("treatment.start") || "Davolashni boshlash"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("treatment.startSubtitle") ||
            "Bemor uchun bajarilgan xizmatlarni tanlang va davolashni boshlang"}
        </p>

        {/* Patient Info Card */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">
              {t("common.patient") || "Bemor"}
            </h3>
            <button
              type="button"
              onClick={openPatientEditModal}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Pencil className="w-4 h-4" />
              {t("patients.editPatientInfo") ||
                "Bemor ma'lumotlarini o'zgartirish"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-medium">{patientName}</span>
            </div>
            {appointment.patient?.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{appointment.patient.phone}</span>
              </div>
            )}
            {appointment.patient?.birth_date && (
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  {new Date(
                    appointment.patient.birth_date,
                  ).toLocaleDateString()}
                </span>
              </div>
            )}
            {appointment.patient?.address && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{appointment.patient.address}</span>
              </div>
            )}
            <div
              className={`flex items-start gap-2 text-slate-600 mt-2 p-2 rounded-lg border ${appointment.patient?.medical_history ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}
            >
              <FileText
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${appointment.patient?.medical_history ? "text-amber-500" : "text-gray-400"}`}
              />
              <div>
                <span
                  className={`font-medium text-xs block mb-1 ${appointment.patient?.medical_history ? "text-amber-700" : "text-gray-500"}`}
                >
                  {t("patients.form.medicalHistory") || "Tibbiy tarix"}:
                </span>
                <span
                  className={`text-sm whitespace-pre-wrap ${appointment.patient?.medical_history ? "text-amber-800" : "text-gray-400 italic"}`}
                >
                  {appointment.patient?.medical_history ||
                    t("patients.noMedicalHistory") ||
                    "Ma'lumot kiritilmagan"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-5 py-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Tooth Chart */}
      <div className="mb-10">
        <ToothChartWithImages
          toothStatus={{}}
          selectedTeeth={selectedTeeth}
          onToothClick={toggleTooth}
          selectable={true}
        />
      </div>

      {/* Services */}
      <div className="mb-10 mx-auto max-w-5xl">
        <h2 className="mb-5 text-xl font-semibold text-slate-900">
          {t("common.services") || "Xizmatlar"}
        </h2>

        {categoryTabs.length > 1 && (
          <div className="mb-5 overflow-x-auto">
            <div className="flex w-max gap-2">
              {categoryTabs.map((tab) => {
                const active = tab.key === selectedCategoryKey;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedCategoryKey(tab.key)}
                    className={`rounded-full px-4 py-2 text-sm font-medium border transition whitespace-nowrap ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {services.length > 0 && (
          <div className="mb-5">
            <input
              value={serviceQuery}
              onChange={(e) => setServiceQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`${t("common.search", {}, "Search")}...`}
            />
          </div>
        )}

        {services.length === 0 ? (
          <div className="rounded-xl bg-amber-50 px-5 py-10 text-center text-amber-800">
            {t("noServices") || "Faol xizmatlar mavjud emas"}
          </div>
        ) : displayServices.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-5 py-10 text-center text-slate-700 border border-slate-200">
            {t("noServices") || "No results"}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayServices.map((service) => renderServiceCard(service))}
          </div>
        )}
      </div>

      {/* Total & Save */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg md:static md:shadow-none">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-medium text-slate-700">
              {t("common.total") || "Jami"}:
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {discountedTotal.toLocaleString()} so'm
            </p>
          </div>

          <div className="w-full sm:w-auto sm:min-w-[240px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("common.discount") || "Chegirma"}
            </label>
            <input
              type="number"
              min={0}
              value={discountAmount || ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setDiscountAmount(0);
                  return;
                }
                const next = Number(raw);
                const safe = Number.isFinite(next) ? Math.max(next, 0) : 0;
                setDiscountAmount(Math.min(safe, total));
              }}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || selectedServices.length === 0}
            className="w-full sm:w-auto rounded-xl bg-emerald-600 px-8 py-3 sm:px-10 sm:py-4 text-base sm:text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
          >
            {saving
              ? t("common.saving") || "Saqlanmoqda..."
              : t("treatment.start") || "Davolashni boshlash"}
          </button>
        </div>
      </div>

      {/* Patient Edit Modal */}
      {showPatientModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {t("patients.editPatientInfo") ||
                    "Bemor ma'lumotlarini o'zgartirish"}
                </h2>
                <button
                  onClick={() => setShowPatientModal(false)}
                  disabled={patientSaving}
                  className="text-white hover:text-gray-200 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {patientError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                  {patientError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("patients.form.firstName") || "Ism"}
                  </label>
                  <input
                    type="text"
                    value={patientForm.first_name || ""}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        first_name: e.target.value,
                      })
                    }
                    disabled={patientSaving}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("patients.form.lastName") || "Familiya"}
                  </label>
                  <input
                    type="text"
                    value={patientForm.last_name || ""}
                    onChange={(e) =>
                      setPatientForm({
                        ...patientForm,
                        last_name: e.target.value,
                      })
                    }
                    disabled={patientSaving}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("patients.form.phone") || "Telefon"}
                </label>
                <input
                  type="tel"
                  value={patientForm.phone || ""}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, phone: e.target.value })
                  }
                  disabled={patientSaving}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("patients.form.birthDate") || "Tug'ilgan sana"}
                </label>
                <input
                  type="date"
                  value={patientForm.birth_date || ""}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      birth_date: e.target.value,
                    })
                  }
                  disabled={patientSaving}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("patients.form.address") || "Manzil"}
                </label>
                <input
                  type="text"
                  value={patientForm.address || ""}
                  onChange={(e) =>
                    setPatientForm({ ...patientForm, address: e.target.value })
                  }
                  disabled={patientSaving}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("patients.form.medicalHistory") || "Tibbiy tarix"}
                </label>
                <textarea
                  value={patientForm.medical_history || ""}
                  onChange={(e) =>
                    setPatientForm({
                      ...patientForm,
                      medical_history: e.target.value,
                    })
                  }
                  disabled={patientSaving}
                  rows={3}
                  placeholder={
                    t("patients.form.medicalHistoryPlaceholder") ||
                    "Kasalliklar, allergiyalar, doimiy dorilar..."
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPatientModal(false)}
                  disabled={patientSaving}
                  className="px-5 py-2 rounded-lg border border-gray-300 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  type="button"
                  onClick={handleSavePatient}
                  disabled={patientSaving}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {patientSaving && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {patientSaving
                    ? t("common.saving") || "Saqlanmoqda..."
                    : t("common.save") || "Saqlash"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
