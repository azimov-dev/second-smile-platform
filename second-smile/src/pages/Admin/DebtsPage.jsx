import { useEffect, useState } from "react";
import { X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const ITEMS_PER_PAGE = 20;

export default function DebtsPage() {
  const { t } = useLanguage();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [debts, setDebts] = useState([]);
  const [filteredDebts, setFilteredDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentTreatmentId, setCurrentTreatmentId] = useState(null);
  const [currentDebt, setCurrentDebt] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t("errors.noToken") || "Tizimga kirish kerak");
      setLoading(false);
      return;
    }

    const loadDebts = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiClient("/payments/debts", { token });

        const sorted = Array.isArray(data)
          ? data.sort((a, b) => b.debt_amount - a.debt_amount)
          : [];

        setDebts(sorted);
        setFilteredDebts(sorted);
      } catch (err) {
        console.error("Load debts error:", err);
        setError(
          err.message || t("errors.loadDebts") || "Qarzlarni yuklashda xato",
        );
      } finally {
        setLoading(false);
      }
    };

    loadDebts();
  }, [token, t]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDebts(debts);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = debts.filter(
      (debt) =>
        debt.patient_name?.toLowerCase().includes(lowerQuery) ||
        debt.patient_phone?.includes(searchQuery) ||
        debt.doctor_name?.toLowerCase().includes(lowerQuery),
    );
    setFilteredDebts(filtered);
  }, [searchQuery, debts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, debts]);

  const totalPages = Math.ceil(filteredDebts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDebts = filteredDebts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const formatMoney = (amount) => {
    return new Intl.NumberFormat("uz-UZ").format(amount || 0) + " so'm";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("uz-UZ");
  };

  const openPaymentModal = (treatmentId, debt) => {
    setCurrentTreatmentId(treatmentId);
    setCurrentDebt(debt);
    setPaymentAmount(debt > 0 ? debt.toString() : "");
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0 || amount > currentDebt) {
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

      // Refresh debts
      const data = await apiClient("/payments/debts", { token });
      const sorted = Array.isArray(data)
        ? data.sort((a, b) => b.debt_amount - a.debt_amount)
        : [];
      setDebts(sorted);
      setFilteredDebts(sorted);
    } catch (err) {
      alert(
        err.message || t("errors.paymentError") || "To'lov qo'shishda xato",
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          {t("debtsPage.title") || "Qarzlar"}
        </h1>
        <p className="mt-2 text-sm md:text-base text-slate-600">
          {t("debtsPage.subtitle") ||
            "To'lanmagan yoki qisman to'langan davolashlar ro'yxati"}
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              t("common.search") ||
              "Bemor, telefon yoki doktor bo'yicha qidirish..."
            }
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700">
          {error}
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  #
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("common.patient") || "Bemor"}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("common.phone") || "Telefon"}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("common.doctor") || "Doktor"}
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("common.date") || "Sana"}
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("common.total") || "Jami"}
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("common.paid") || "To'langan"}
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("common.debt") || "Qarz"}
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  {t("actions") || "Amal"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {t("common.loading") || "Yuklanmoqda..."}
                  </td>
                </tr>
              ) : filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <p className="text-lg font-medium text-gray-700">
                      {searchQuery
                        ? t("common.noResults") || "Hech nima topilmadi"
                        : t("debtsPage.noDebts") || "Qarzdor bemor yo'q"}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      {searchQuery
                        ? t("common.tryDifferentSearch") ||
                          "Boshqa so'z bilan qidirib ko'ring"
                        : t("debtsPage.allPaid") ||
                          "Barcha to'lovlar amalga oshirilgan"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDebts.map((debt, index) => (
                  <tr key={debt.treatment_id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {debt.patient_name}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {debt.patient_phone || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      {debt.doctor_name}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {formatDate(debt.appointment_date)}
                    </td>
                    <td className="px-5 py-4 text-sm text-right text-gray-900">
                      {formatMoney(debt.total_amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-right text-gray-900">
                      {formatMoney(debt.paid_amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-right font-bold text-red-600">
                      {formatMoney(debt.debt_amount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() =>
                          openPaymentModal(debt.treatment_id, debt.debt_amount)
                        }
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
                      >
                        {t("common.paymentAdd") || "To'lov"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-600">
              {t("common.page") || "Sahifa"} {currentPage} / {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("common.prev") || "Oldingi"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                {t("common.next") || "Keyingi"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-500">
              {t("common.loading") || "Yuklanmoqda..."}
            </div>
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-lg font-medium text-gray-700">
              {searchQuery
                ? t("common.noResults") || "Hech nima topilmadi"
                : t("debtsPage.noDebts") || "Qarzdor bemor yo'q"}
            </p>
            <p className="mt-3 text-sm text-gray-500">
              {searchQuery
                ? t("common.tryDifferentSearch") ||
                  "Boshqa so'z bilan qidirib ko'ring"
                : t("debtsPage.allPaid") ||
                  "Barcha to'lovlar amalga oshirilgan"}
            </p>
          </div>
        ) : (
          paginatedDebts.map((debt, index) => (
            <div
              key={debt.treatment_id}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      #{startIndex + index + 1}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {debt.patient_name}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{debt.patient_phone || "-"}</p>
                    <p>{debt.doctor_name}</p>
                    <p>{formatDate(debt.appointment_date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-red-600">
                    {formatMoney(debt.debt_amount)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("common.debt") || "Qarz"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-4">
                <div>
                  <p className="text-gray-500">{t("common.total") || "Jami"}</p>
                  <p className="font-medium">
                    {formatMoney(debt.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">
                    {t("common.paid") || "To'langan"}
                  </p>
                  <p className="font-medium text-green-600">
                    {formatMoney(debt.paid_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t("common.debt") || "Qarz"}</p>
                  <p className="font-bold text-red-600">
                    {formatMoney(debt.debt_amount)}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  openPaymentModal(debt.treatment_id, debt.debt_amount)
                }
                className="w-full rounded-lg bg-green-600 py-3 text-white font-medium hover:bg-green-700 transition"
              >
                {t("common.paymentAdd") || "To'lov qo'shish"}
              </button>
            </div>
          ))
        )}

        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between rounded-xl bg-white shadow-sm border border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("common.prev") || "Oldingi"}
            </button>
            <div className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
            >
              {t("common.next") || "Keyingi"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
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
                <p className="text-2xl font-bold text-red-600">
                  {formatMoney(currentDebt)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t("common.paymentAmount") || "To'lov summasi"}
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="50000"
                  disabled={paying}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  onClick={submitPayment}
                  disabled={paying}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-70"
                >
                  {paying
                    ? t("common.saving") || "Saqlanmoqda..."
                    : t("common.save") || "To'lash"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
