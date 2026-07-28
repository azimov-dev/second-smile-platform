import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Mail, Send, RefreshCw } from "lucide-react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { apiClient } from "../api/client";
import { useAuth } from "../features/auth/useAuth";
import { useClinic } from "../context/ClinicContext.jsx";

export default function SubscriptionExpired() {
  const { t } = useLanguage();
  const { token, role } = useAuth();
  const { refreshClinic } = useClinic();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const data = await apiClient("/clinic/plans", { token });
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshClinic();
    } finally {
      setRefreshing(false);
    }
  }

  async function handlePay(planId) {
    setPaying(true);
    try {
      const data = await apiClient("/clinic/pay", { method: "POST", token, body: { plan_id: planId } });
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error(err);
      alert(t("errors.unknown") || "Xatolik yuz berdi");
    } finally {
      setPaying(false);
    }
  }

  const isAdmin = role === "admin";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8">
      <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t("subscription.expired.title") || "Obuna muddati tugadi"}
          </h2>
          <p className="mt-2 text-gray-600">
            {t("subscription.expired.message") ||
              "Sizning obuna muddatingiz tugagan. Iltimos, admin bilan bog'laning yoki obunani yangilang."}
          </p>
          {/* Refresh button - check if admin already assigned subscription */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? (t("common.checking") || "Tekshirilmoqda...") : (t("subscription.checkAgain") || "Qayta tekshirish")}
          </button>
        </div>

        {/* Plans - Only show for admins */}
        {isAdmin && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("subscription.availablePlans") || "Mavjud tariflar"}
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {plans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border-2 border-gray-200 p-4 hover:border-sky-500 transition-colors">
                    <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                    <p className="mt-1 text-xl font-bold text-sky-600">
                      {plan.price_monthly?.toLocaleString()} <span className="text-sm text-gray-500">UZS/oy</span>
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {plan.max_doctors} {t("subscription.doctorUnit") || "shifokor"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {plan.max_patients} {t("subscription.patientUnit") || "bemor"}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {plan.max_appointments_per_month} {t("subscription.appointmentUnit") || "qabul/oy"}
                      </li>
                    </ul>
                    <button
                      onClick={() => handlePay(plan.id)}
                      disabled={paying}
                      className="mt-4 w-full rounded-xl bg-sky-600 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition disabled:bg-sky-300"
                    >
                      {paying ? "..." : t("subscription.selectPlan") || "Tanlash"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Not admin message */}
        {!isAdmin && (
          <div className="mb-6 rounded-xl bg-blue-50 p-4 text-center text-blue-800">
            {t("subscription.expired.contactAdmin") || "Iltimos, klinika adminiga murojaat qiling."}
          </div>
        )}

        {/* Contact Info */}
        <div className="rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 p-5 border">
          <h4 className="font-semibold text-gray-900 mb-3">
            {t("subscription.expired.needHelp") || "Yordam kerakmi?"}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://t.me/azimov_7"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg bg-[#0088cc] px-4 py-3 text-white hover:bg-[#007ab8] transition"
            >
              <Send className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Telegram</p>
                <p className="text-xs opacity-90">@azimov_7</p>
              </div>
            </a>
            <a
              href="mailto:info@second-smile.uz"
              className="flex items-center gap-3 rounded-lg bg-gray-700 px-4 py-3 text-white hover:bg-gray-800 transition"
            >
              <Mail className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs opacity-90">info@second-smile.uz</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
