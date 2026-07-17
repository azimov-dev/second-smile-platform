import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Loader2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const ITEMS_PER_PAGE = 20;

function formatMoney(amount) {
  return new Intl.NumberFormat("uz-UZ").format(amount || 0);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const s = (status || "").toLowerCase();

  let bg = "bg-sky-100 text-sky-700";
  let text = t("common.active") || "Jarayonda";

  if (s === "completed" || s === "done") {
    bg = "bg-emerald-100 text-emerald-700";
    text = t("common.completed") || "Yakunlangan";
  } else if (s === "cancelled") {
    bg = "bg-red-100 text-red-700";
    text = t("common.cancelled") || "Bekor qilingan";
  }

  return (
    <span
      className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${bg}`}
    >
      {text}
    </span>
  );
}

export function Treatments() {
  const { t } = useLanguage();
  const { role } = useAuth();

  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentTreatmentId, setCurrentTreatmentId] = useState(null);
  const [currentDebt, setCurrentDebt] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [paying, setPaying] = useState(false);

  const [showServicesModal, setShowServicesModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planSummary, setPlanSummary] = useState(null);
  const [loadingPlanSummary, setLoadingPlanSummary] = useState(false);

  const [completingId, setCompletingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const isAdminOrReception = role === "admin" || role === "reception";
  const isDoctor = role === "doctor";
  const canAddPayment = isDoctor || isAdminOrReception;

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);
    if (statusFilter) params.append("status", statusFilter);
    if (search) params.append("search", search);
    const qs = params.toString();
    const base = isAdminOrReception ? "/treatments" : "/treatments/my";
    return qs ? `${base}?${qs}` : base;
  };

  const loadTreatments = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const data = await apiClient(buildQuery(), { token });

      const mapped = data.map((t) => {
        const appointmentDate = t.appointment?.appointment_date || t.created_at;
        const date = appointmentDate
          ? new Date(appointmentDate).toLocaleDateString("uz-UZ")
          : "-";

        const patientName = t.appointment?.patient
          ? `${t.appointment.patient.first_name} ${t.appointment.patient.last_name}`
          : t("common.unknownPatient") || "Noma'lum bemor";

        const doctorName = t.appointment?.doctor?.full_name || "-";

        const total = t.total_amount || 0;
        const discount = t.discount_amount || 0;
        const paid = t.paid_amount || 0;
        const debt = total - discount - paid;

        const services = (t.items || []).map((item) => ({
          treatmentItemId: item.id,
          serviceId: item.service?.id,
          name: item.service?.name || "Noma'lum xizmat",
          price: item.price || 0,
          quantity: item.quantity || 1,
          tooth_numbers:
            typeof item.tooth_numbers === "string"
              ? item.tooth_numbers
              : typeof item.toothNumbers === "string"
                ? item.toothNumbers
                : Array.isArray(item.teeth)
                  ? item.teeth.join(",")
                  : "",
          notes:
            item.notes != null
              ? String(item.notes)
              : item.note != null
                ? String(item.note)
                : item.service_notes != null
                  ? String(item.service_notes)
                  : item.serviceNotes != null
                    ? String(item.serviceNotes)
                    : "",
        }));

        const plan = t.appointment?.treatmentPlan || null;
        const planLabel = plan?.title || (plan?.id ? `#${plan.id}` : "-");

        return {
          id: t.id,
          appointmentId: t.appointment?.id,
          date,
          patient: patientName,
          plan: planLabel,
          planId: plan?.id || null,
          doctor: doctorName,
          status: t.status || "active",
          total,
          discount,
          paid,
          debt,
          notes: t.notes || "-",
          services,
        };
      });

      setTreatments(mapped);
      setCurrentPage(1);
    } catch (err) {
      setError(
        err.message ||
          t("errors.loadTreatments") ||
          "Davolashlarni yuklashda xato",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreatments();
  }, [fromDate, toDate, statusFilter, search, token]);

  const totalPages = Math.ceil(treatments.length / ITEMS_PER_PAGE);
  const paginatedTreatments = treatments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleCompleteTreatment = async (treatmentId) => {
    if (
      !confirm(
        t("treatment.confirmComplete") ||
          "Davolashni yakunlashni tasdiqlaysizmi?",
      )
    )
      return;
    setCompletingId(treatmentId);
    try {
      await apiClient(`/treatments/${treatmentId}`, {
        method: "PATCH",
        token,
        body: { status: "completed" },
      });
      await loadTreatments();
    } catch (err) {
      alert(err.message || t("errors.completeTreatment") || "Yakunlashda xato");
    } finally {
      setCompletingId(null);
    }
  };

  const handleCancelTreatment = async (treatmentId) => {
    if (
      !confirm(
        t("treatment.confirmCancel") ||
          "Davolashni bekor qilishni tasdiqlaysizmi?",
      )
    )
      return;
    setCancellingId(treatmentId);
    try {
      await apiClient(`/treatments/${treatmentId}`, {
        method: "PATCH",
        token,
        body: { status: "cancelled" },
      });
      await loadTreatments();
    } catch (err) {
      alert(
        err.message || t("errors.cancelTreatment") || "Bekor qilishda xato",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const openPaymentModal = (treatmentId, debt) => {
    setCurrentTreatmentId(treatmentId);
    setCurrentDebt(debt);
    setPaymentAmount(debt > 0 ? debt.toString() : "");
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert(t("errors.invalidAmount") || "To'lov summasi noto'g'ri");
      return;
    }
    setPaying(true);
    try {
      await apiClient("/payments", {
        method: "POST",
        token,
        body: {
          treatment_id: currentTreatmentId,
          amount,
          payment_type: paymentType,
        },
      });
      setShowPaymentModal(false);
      setPaymentAmount("");
      await loadTreatments();
    } catch (err) {
      alert(
        err.message || t("errors.paymentError") || "To'lov qo'shishda xato",
      );
    } finally {
      setPaying(false);
    }
  };

  const openServicesModal = (treatment) => {
    setSelectedTreatment(treatment);
    setShowServicesModal(true);
  };

  const openPlanSummary = async (planId) => {
    if (!planId || !token) return;
    try {
      setLoadingPlanSummary(true);
      setShowPlanModal(true);
      const summary = await apiClient(`/treatment-plans/${planId}/summary`, {
        token,
      });
      setPlanSummary(summary);
    } catch (err) {
      alert(
        err.message ||
          t("errors.loadFailed") ||
          "Reja ma'lumotlarini yuklashda xato",
      );
      setShowPlanModal(false);
    } finally {
      setLoadingPlanSummary(false);
    }
  };

  const deleteServiceFromTreatment = async (service) => {
    if (!token) return;
    if (!service?.treatmentItemId) {
      alert(t("errors.deleteFailed") || "Delete failed");
      return;
    }

    if (
      !confirm(
        t("treatment.confirmDeleteService") ||
          "Xizmatni o'chirishni tasdiqlaysizmi?",
      )
    ) {
      return;
    }

    try {
      await apiClient(`/treatment-items/${service.treatmentItemId}`, {
        method: "DELETE",
        token,
      });

      const qty = Number(service.quantity || 1);
      const price = Number(service.price || 0);
      const delta = qty * price;

      setSelectedTreatment((prev) => {
        if (!prev) return prev;
        const nextServices = (prev.services || []).filter(
          (s) => s.treatmentItemId !== service.treatmentItemId,
        );
        const nextTotal = Math.max(0, Number(prev.total || 0) - delta);
        const nextDebt =
          nextTotal - Number(prev.discount || 0) - Number(prev.paid || 0);
        return {
          ...prev,
          services: nextServices,
          total: nextTotal,
          debt: nextDebt,
        };
      });

      setTreatments((prev) =>
        prev.map((t) => {
          if (t.id !== selectedTreatment?.id) return t;
          const nextServices = (t.services || []).filter(
            (s) => s.treatmentItemId !== service.treatmentItemId,
          );
          const nextTotal = Math.max(0, Number(t.total || 0) - delta);
          const nextDebt =
            nextTotal - Number(t.discount || 0) - Number(t.paid || 0);
          return {
            ...t,
            services: nextServices,
            total: nextTotal,
            debt: nextDebt,
          };
        }),
      );
    } catch (err) {
      alert(err.message || t("errors.deleteFailed") || "Delete failed");
    }
  };

  const printReceipt = () => {
    if (!selectedTreatment) return;

    const line = "=".repeat(48);
    const dash = "-".repeat(48);

    let servicesText = "";
    selectedTreatment.services.forEach((service, idx) => {
      const num = `${idx + 1}.`.padEnd(3);
      const qty = service.quantity || 1;
      const name = `${service.name}${qty > 1 ? ` (${qty}x)` : ""}`.substring(
        0,
        30,
      );
      const price = formatMoney(service.price) + " so'm";
      const pricePadded = price.padStart(48 - num.length - name.length - 1);
      servicesText += `${num}${name} ${pricePadded}\n`;

      const toothNumbers = (service.tooth_numbers || "").trim();
      if (toothNumbers) {
        servicesText += `    Tishlar: ${toothNumbers}\n`;
      }
      const serviceNotes = (service.notes || "").trim();
      if (serviceNotes) {
        servicesText += `    Eslatma: ${serviceNotes}\n`;
      }
    });

    const notesBlock =
      selectedTreatment.notes && selectedTreatment.notes !== "-"
        ? `\n${dash}\nESLATMALAR:\n${selectedTreatment.notes}\n`
        : "";

    const receiptContent = `
<pre style="font-family: 'Courier New', monospace; font-size: 11pt; line-height: 1.4; margin: 0; padding: 10px;">
${escapeHtml("Second Smile Stomatologiya").padStart(24 + 12)}
${escapeHtml("Toshloq tumani, Farg'ona").padStart(24 + 11)}
${line}
Bemor : ${escapeHtml(selectedTreatment.patient)}
Doktor : ${escapeHtml(selectedTreatment.doctor)}
Sana : ${escapeHtml(selectedTreatment.date)}
Holati : ${getStatusText(selectedTreatment.status)}
${dash}
XIZMATLAR:
${servicesText || " Xizmatlar qo'shilmagan\n"}
${escapeHtml(notesBlock).trimEnd()}
${dash}
Jami       ${formatMoney(selectedTreatment.total).padStart(15)} so'm
Chegirma   ${formatMoney(selectedTreatment.discount).padStart(15)} so'm
To'langan  ${formatMoney(selectedTreatment.paid).padStart(15)} so'm
QARZ       ${formatMoney(selectedTreatment.debt).padStart(15)} so'm
${line}
${"Rahmat! Sog'lig'ingizga e'tibor bering ❤️".padStart(24 + 19)}
${new Date().toLocaleDateString("uz-UZ").padStart(24 + 5)}
</pre>
`.trim();

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Kvitansiya</title>
          <meta charset="utf-8">
          <style>
            @media print {
              body { margin: 0; padding: 5mm; }
              pre { margin: 0; }
            }
          </style>
        </head>
        <body>${receiptContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return t("common.active") || "Jarayonda";
      case "completed":
        return t("common.completed") || "Yakunlangan";
      case "cancelled":
        return t("common.cancelled") || "Bekor qilingan";
      default:
        return status;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {isDoctor
            ? t("treatment.my") || "Mening davolashlarim"
            : t("treatments") || "Davolashlar"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("treatmentsPage.subtitle") ||
            "Yakunlangan qabul va davolashlar ro'yxati."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("treatmentsPage.from") || "Dan"}
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full max-w-[220px] sm:max-w-none rounded-lg border border-gray-300 bg-white text-gray-900 text-left appearance-none px-2 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fromDate && (
                <button
                  type="button"
                  onClick={() => setFromDate("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title={t("common.clear") || "Clear"}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("treatmentsPage.to") || "Gacha"}
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full max-w-[220px] sm:max-w-none rounded-lg border border-gray-300 bg-white text-gray-900 text-left appearance-none px-2 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {toDate && (
                <button
                  type="button"
                  onClick={() => setToDate("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title={t("common.clear") || "Clear"}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("common.status") || "Holati"}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("common.all") || "Barchasi"}</option>
              <option value="active">
                {t("common.active") || "Jarayonda"}
              </option>
              <option value="completed">
                {t("common.completed") || "Yakunlangan"}
              </option>
              <option value="cancelled">
                {t("common.cancelled") || "Bekor qilingan"}
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("common.search") || "Qidirish"}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={
                  t("common.searchByPatient") || "Bemor ismiga qidirish..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {t("common.date") || "SANA"}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {t("common.patient") || "BEMOR"}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {t("treatment.plan") || "REJA"}
                </th>
                {isAdminOrReception && (
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {t("common.doctor") || "DOKTOR"}
                  </th>
                )}
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {t("common.status") || "HOLATI"}
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-28">
                  {t("common.total") || "JAMI"}
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-28">
                  {t("common.paid") || "TO'LANGAN"}
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-28">
                  {t("common.discount") || "CHEGIRMA"}
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-28">
                  {t("common.debt") || "QARZDORLIK"}
                </th>
                {(isDoctor || canAddPayment) && (
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-64">
                    {t("actions") || "HARAKATLAR"}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={isAdminOrReception ? 10 : 9}
                    className="px-3 py-12 text-center"
                  >
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : paginatedTreatments.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdminOrReception ? 10 : 9}
                    className="px-3 py-12 text-center text-gray-500"
                  >
                    {t("treatmentsPage.empty") || "Davolashlar topilmadi"}
                  </td>
                </tr>
              ) : (
                paginatedTreatments.map((treatment) => (
                  <tr key={treatment.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm text-gray-800 whitespace-nowrap">
                      {treatment.date}
                    </td>
                    <td
                      className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap truncate max-w-40"
                      title={treatment.patient}
                    >
                      {treatment.patient}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap truncate max-w-40">
                      {treatment.planId ? (
                        <button
                          type="button"
                          onClick={() => openPlanSummary(treatment.planId)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                          title={treatment.plan}
                        >
                          {treatment.plan}
                        </button>
                      ) : (
                        <span title={treatment.plan}>{treatment.plan}</span>
                      )}
                    </td>
                    {isAdminOrReception && (
                      <td
                        className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap truncate max-w-36"
                        title={treatment.doctor}
                      >
                        {treatment.doctor}
                      </td>
                    )}
                    <td className="px-2 py-3 whitespace-nowrap">
                      <StatusBadge status={treatment.status} />
                    </td>
                    <td className="px-3 py-3 text-sm text-right whitespace-nowrap tabular-nums truncate max-w-28">
                      {formatMoney(treatment.total)} so'm
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-green-600 whitespace-nowrap tabular-nums truncate max-w-28">
                      {formatMoney(treatment.paid)} so'm
                    </td>
                    <td className="px-3 py-3 text-sm text-right whitespace-nowrap tabular-nums truncate max-w-28">
                      {formatMoney(treatment.discount)} so'm
                    </td>
                    <td className="px-3 py-3 text-sm text-right text-red-600 font-bold whitespace-nowrap tabular-nums truncate max-w-28">
                      {formatMoney(treatment.debt)} so'm
                    </td>
                    {(isDoctor || canAddPayment) && (
                      <td className="px-3 py-3 w-64">
                        <div className="flex flex-col gap-2 items-center">
                          <button
                            onClick={() => openServicesModal(treatment)}
                            className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] text-white hover:bg-purple-700"
                          >
                            {t("treatment.viewServices") || "Xizmatlar"}
                          </button>

                          {isDoctor && treatment.status === "active" && (
                            <>
                              <Link
                                to={`/doctor/treatment/add/${treatment.appointmentId}`}
                                className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] text-white hover:bg-blue-700 text-center"
                              >
                                {t("treatment.addServices") || "Xizmat +"}
                              </Link>
                              <button
                                onClick={() =>
                                  handleCompleteTreatment(treatment.id)
                                }
                                disabled={completingId === treatment.id}
                                className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] text-white hover:bg-emerald-700 disabled:opacity-70"
                              >
                                {completingId === treatment.id
                                  ? "..."
                                  : t("treatment.complete") || "Yakunlash"}
                              </button>
                              <button
                                onClick={() =>
                                  handleCancelTreatment(treatment.id)
                                }
                                disabled={cancellingId === treatment.id}
                                className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] text-white hover:bg-red-700 disabled:opacity-70"
                              >
                                {cancellingId === treatment.id
                                  ? "..."
                                  : t("treatment.cancel") || "Bekor qilish"}
                              </button>
                            </>
                          )}

                          {canAddPayment &&
                            treatment.debt > 0 &&
                            treatment.status !== "cancelled" && (
                              <button
                                onClick={() =>
                                  openPaymentModal(treatment.id, treatment.debt)
                                }
                                className="rounded-md bg-green-600 px-2.5 py-1 text-[11px] text-white hover:bg-green-700"
                              >
                                {t("common.paymentAdd") || "To'lov"}
                              </button>
                            )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
            <p className="text-gray-700">
              {t("common.page") || "Sahifa"} {currentPage} / {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-gray-400" />
          </div>
        ) : treatments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-lg text-gray-600">
              {t("treatmentsPage.empty") || "Davolashlar topilmadi"}
            </p>
          </div>
        ) : (
          paginatedTreatments.map((treatment) => (
            <div
              key={treatment.id}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-5"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">{treatment.date}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {treatment.patient}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("treatment.plan") || "Davolash rejasi"}:{" "}
                    {treatment.planId ? (
                      <button
                        type="button"
                        onClick={() => openPlanSummary(treatment.planId)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {treatment.plan}
                      </button>
                    ) : (
                      treatment.plan
                    )}
                  </p>
                  {isAdminOrReception && (
                    <p className="text-sm text-gray-600">{treatment.doctor}</p>
                  )}
                </div>
                <StatusBadge status={treatment.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">{t("common.total") || "Jami"}</p>
                  <p className="font-medium">
                    {formatMoney(treatment.total)} so'm
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">
                    {t("common.paid") || "To'langan"}
                  </p>
                  <p className="font-medium text-green-600">
                    {formatMoney(treatment.paid)} so'm
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">
                    {t("common.discount") || "Chegirma"}
                  </p>
                  <p className="font-medium">
                    {formatMoney(treatment.discount)} so'm
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">
                    {t("common.debt") || "Qarzdorlik"}
                  </p>
                  <p className="font-medium text-red-600">
                    {formatMoney(treatment.debt)} so'm
                  </p>
                </div>
              </div>

              {treatment.notes !== "-" && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    {t("common.notes") || "Eslatmalar"}
                  </p>
                  <p className="text-sm text-gray-700">{treatment.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openServicesModal(treatment)}
                  className="flex-1 min-w-[120px] rounded-lg bg-purple-600 px-4 py-2.5 text-sm text-white hover:bg-purple-700"
                >
                  {t("treatment.viewServices") || "Xizmatlarni ko'rish"}
                </button>

                {isDoctor && treatment.status === "active" && (
                  <>
                    <Link
                      to={`/doctor/treatment/add/${treatment.appointmentId}`}
                      className="flex-1 min-w-[120px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 text-center"
                    >
                      {t("treatment.addServices") || "Xizmat qo'shish"}
                    </Link>
                    <button
                      onClick={() => handleCompleteTreatment(treatment.id)}
                      disabled={completingId === treatment.id}
                      className="flex-1 min-w-[120px] rounded-lg bg-emerald-600 px-4 py-2.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-70"
                    >
                      {completingId === treatment.id
                        ? "..."
                        : t("treatment.complete") || "Yakunlash"}
                    </button>
                    <button
                      onClick={() => handleCancelTreatment(treatment.id)}
                      disabled={cancellingId === treatment.id}
                      className="flex-1 min-w-[120px] rounded-lg bg-red-600 px-4 py-2.5 text-sm text-white hover:bg-red-700 disabled:opacity-70"
                    >
                      {cancellingId === treatment.id
                        ? "..."
                        : t("treatment.cancel") || "Bekor qilish"}
                    </button>
                  </>
                )}

                {canAddPayment &&
                  treatment.debt > 0 &&
                  treatment.status !== "cancelled" && (
                    <button
                      onClick={() =>
                        openPaymentModal(treatment.id, treatment.debt)
                      }
                      className="flex-1 min-w-[120px] rounded-lg bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700"
                    >
                      {t("common.paymentAdd") || "To'lov qo'shish"}
                    </button>
                  )}
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 py-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-3 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {t("common.paymentAdd") || "To'lov qo'shish"}
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={paying}
              >
                <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("common.currentDebt") || "Joriy qarz"}
                </label>
                <p className="text-lg font-semibold text-red-600">
                  {formatMoney(currentDebt)} so'm
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("common.paymentAmount") || "To'lov summasi (so'm)"}
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="50000"
                  disabled={paying}
                  min={1}
                  step={1}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("common.paymentType") || "To'lov turi"}
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  disabled={paying}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                >
                  <option value="cash">{t("common.cash") || "Naqd"}</option>
                  <option value="card">{t("common.card") || "Karta"}</option>
                  <option value="transfer">
                    {t("common.transfer") || "O'tkazma"}
                  </option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paying}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-70"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  onClick={submitPayment}
                  disabled={paying}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-70"
                >
                  {paying
                    ? t("common.saving") || "Saqlanmoqda..."
                    : t("common.save") || "Saqlash"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Treatment Plan Summary Modal */}
      {showPlanModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-200 text-sm">
                    {t("treatment.plan") || "Davolash rejasi"}
                  </p>
                  <h2 className="text-xl font-bold">
                    {planSummary?.plan?.title || `#${planSummary?.plan?.id || ""}`}
                  </h2>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {loadingPlanSummary ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                  <p className="mt-3 text-gray-500">
                    {t("common.loading") || "Yuklanmoqda..."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  {(() => {
                    const appointments = planSummary?.appointments || [];
                    const completed = appointments.filter(a =>
                      a.treatment?.status === "completed" || a.status === "completed"
                    ).length;
                    const total = appointments.length;
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {t("treatment.progress") || "Jarayon"}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            {completed} / {total} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent === 100 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {percent === 100
                            ? (t("treatment.allCompleted") || "Barcha qabullar yakunlandi")
                            : `${total - completed} ${t("treatment.visitsRemaining") || "ta qabul qoldi"}`
                          }
                        </p>
                      </div>
                    );
                  })()}

                  {/* Money Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">{t("common.total") || "Jami"}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatMoney(planSummary?.totals?.total || 0)} <span className="text-sm font-normal">so'm</span>
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <p className="text-xs text-green-600 mb-1">{t("common.paid") || "To'langan"}</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatMoney(planSummary?.totals?.paid || 0)} <span className="text-sm font-normal">so'm</span>
                      </p>
                    </div>
                    {(planSummary?.totals?.discount || 0) > 0 && (
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <p className="text-xs text-orange-600 mb-1">{t("common.discount") || "Chegirma"}</p>
                        <p className="text-lg font-bold text-orange-600">
                          -{formatMoney(planSummary?.totals?.discount || 0)} <span className="text-sm font-normal">so'm</span>
                        </p>
                      </div>
                    )}
                    <div className={`rounded-xl p-4 border ${
                      (planSummary?.totals?.debt || 0) > 0
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                    }`}>
                      <p className={`text-xs mb-1 ${
                        (planSummary?.totals?.debt || 0) > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {t("common.debt") || "Qarzdorlik"}
                      </p>
                      <p className={`text-lg font-bold ${
                        (planSummary?.totals?.debt || 0) > 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {(planSummary?.totals?.debt || 0) > 0
                          ? `${formatMoney(planSummary?.totals?.debt || 0)} so'm`
                          : (t("common.fullyPaid") || "To'langan")
                        }
                      </p>
                    </div>
                  </div>

                  {/* Appointments List */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      {t("treatment.visitHistory") || "Qabullar"}
                    </h3>
                    <div className="space-y-2">
                      {(planSummary?.appointments || []).length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          {t("appointments.noAppointmentsForDay") || "Qabullar yo'q"}
                        </p>
                      ) : (
                        (planSummary?.appointments || []).map((appt, index) => {
                          const isCompleted = appt.treatment?.status === "completed" || appt.status === "completed";
                          const isCancelled = appt.treatment?.status === "cancelled" || appt.status === "cancelled";

                          return (
                            <div
                              key={appt.id}
                              className={`rounded-lg p-3 border flex items-center justify-between ${
                                isCompleted
                                  ? "bg-green-50 border-green-200"
                                  : isCancelled
                                    ? "bg-gray-50 border-gray-200 opacity-60"
                                    : "bg-yellow-50 border-yellow-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isCompleted
                                    ? "bg-green-500 text-white"
                                    : isCancelled
                                      ? "bg-gray-400 text-white"
                                      : "bg-yellow-500 text-white"
                                }`}>
                                  {isCompleted ? "✓" : index + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {new Date(appt.appointment_date).toLocaleDateString("uz-UZ")}
                                  </p>
                                  <p className={`text-xs ${
                                    isCompleted ? "text-green-600" : isCancelled ? "text-gray-500" : "text-yellow-600"
                                  }`}>
                                    {isCompleted
                                      ? (t("common.completed") || "Yakunlangan")
                                      : isCancelled
                                        ? (t("common.cancelled") || "Bekor qilingan")
                                        : (t("common.inProgress") || "Jarayonda")
                                    }
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatMoney(appt.treatment?.total_amount || 0)} so'm
                                </p>
                                <p className="text-xs text-gray-500">
                                  {appt.doctor?.full_name || "-"}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Services & Receipt Modal */}
      {showServicesModal && selectedTreatment && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {t("treatment.servicesList") || "Xizmatlar ro'yxati"}
                </h2>
                <button onClick={() => setShowServicesModal(false)}>
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-lg">
                <div>
                  <strong>{t("common.patient")}:</strong>{" "}
                  {selectedTreatment.patient}
                </div>
                <div>
                  <strong>{t("common.doctor")}:</strong>{" "}
                  {selectedTreatment.doctor}
                </div>
                <div>
                  <strong>{t("common.date")}:</strong> {selectedTreatment.date}
                </div>
                <div>
                  <strong>{t("common.status")}:</strong>
                  <StatusBadge status={selectedTreatment.status} />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">
                  {t("common.services") || "Xizmatlar"}
                </h3>
                {selectedTreatment.services.length === 0 ? (
                  <p className="text-gray-500">
                    {t("appointments.noServices") || "Xizmatlar yo'q"}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedTreatment.services.map((service, idx) => (
                      <div
                        key={
                          service.treatmentItemId || `${service.name}-${idx}`
                        }
                        className="bg-gray-50 rounded-lg px-5 py-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium">
                            {idx + 1}. {service.name}
                            {(service.quantity || 1) > 1
                              ? ` (${service.quantity}x)`
                              : ""}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              {formatMoney(service.price)} so'm
                            </span>

                            {isDoctor &&
                              selectedTreatment.status === "active" && (
                                <button
                                  onClick={() =>
                                    deleteServiceFromTreatment(service)
                                  }
                                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                                  title={t("common.delete") || "O'chirish"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t("common.delete") || "O'chirish"}
                                </button>
                              )}
                          </div>
                        </div>

                        {(service.tooth_numbers || "").trim() && (
                          <div className="mt-2 text-sm text-gray-700">
                            <span className="font-semibold">
                              {t("treatment.selectedTeeth", {}, "Teeth") ||
                                "Tishlar"}
                              :
                            </span>{" "}
                            {(service.tooth_numbers || "").trim()}
                          </div>
                        )}

                        {(service.notes || "").trim() && (
                          <div className="mt-1 text-sm text-gray-700">
                            <span className="font-semibold">
                              {t("common.notes") || "Eslatmalar"}:
                            </span>{" "}
                            {(service.notes || "").trim()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedTreatment.notes && selectedTreatment.notes !== "-" && (
                <div>
                  <h3 className="text-xl font-bold mb-3">
                    {t("common.notes") || "Eslatmalar"}
                  </h3>
                  <div className="whitespace-pre-wrap rounded-lg bg-gray-50 px-5 py-4 text-gray-800">
                    {selectedTreatment.notes}
                  </div>
                </div>
              )}

              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-4 text-lg font-semibold">
                  <div>{t("common.total") || "Jami"}:</div>
                  <div className="text-right">
                    {formatMoney(selectedTreatment.total)} so'm
                  </div>
                  <div>{t("common.discount") || "Chegirma"}:</div>
                  <div className="text-right">
                    {formatMoney(selectedTreatment.discount)} so'm
                  </div>
                  <div>{t("common.paid") || "To'langan"}:</div>
                  <div className="text-right text-green-600">
                    {formatMoney(selectedTreatment.paid)} so'm
                  </div>
                  <div>{t("common.debt") || "Qarzdorlik"}:</div>
                  <div className="text-right text-red-600">
                    {formatMoney(selectedTreatment.debt)} so'm
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <button
                  onClick={printReceipt}
                  className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition text-lg"
                >
                  {t("common.print") || "Chop etish"}
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
