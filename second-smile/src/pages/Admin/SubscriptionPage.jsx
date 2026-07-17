import { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { CreditCard, Calendar, Users, Stethoscope, CalendarDays, CheckCircle } from "lucide-react";

export default function SubscriptionPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sub, plansData, usageData] = await Promise.all([
        apiClient("/clinic/subscription", { token }),
        apiClient("/clinic/plans", { token }),
        apiClient("/clinic/usage", { token }),
      ]);
      setSubscription(sub);
      setPlans(plansData);
      setUsage(usageData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePay(planId) {
    try {
      const data = await apiClient("/clinic/pay", { method: "POST", token, body: { plan_id: planId } });
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  const plan = subscription?.plan;
  const daysLeft = subscription?.current_period_end
    ? Math.max(0, Math.ceil((new Date(subscription.current_period_end) - new Date()) / 86400000))
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {t("subscription.title") || "Obuna"}
      </h1>

      {/* Current Plan Card */}
      {subscription && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("subscription.currentPlan") || "Joriy tarif"}</p>
              <h2 className="text-xl font-bold text-gray-900">{plan?.name}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${
              subscription.status === "active" ? "bg-green-100 text-green-700" :
              subscription.status === "trial" ? "bg-blue-100 text-blue-700" :
              "bg-red-100 text-red-700"
            }`}>
              {subscription.status === "active" ? t("subscription.statusActive") || "Faol" :
               subscription.status === "trial" ? t("subscription.statusTrial") || "Sinov" :
               t("subscription.statusExpired") || "Muddati tugagan"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
              <Calendar className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-xs text-gray-500">{t("subscription.expiresIn") || "Tugash muddati"}</p>
                <p className="font-semibold">{daysLeft} {t("subscription.days") || "kun"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
              <CreditCard className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-xs text-gray-500">{t("subscription.price") || "Narxi"}</p>
                <p className="font-semibold">{plan?.price_monthly?.toLocaleString()} UZS/oy</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
              <CalendarDays className="h-5 w-5 text-sky-600" />
              <div>
                <p className="text-xs text-gray-500">{t("subscription.periodEnd") || "Tugash sanasi"}</p>
                <p className="font-semibold">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString("uz-UZ")
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {usage && plan && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border">
          <h3 className="mb-4 font-semibold text-gray-900">
            {t("subscription.usage") || "Foydalanish"}
          </h3>
          <div className="space-y-4">
            <UsageBar
              icon={<Stethoscope className="h-5 w-5 text-sky-600" />}
              label={t("subscription.doctors") || "Shifokorlar"}
              current={usage.doctors}
              max={plan.max_doctors}
            />
            <UsageBar
              icon={<Users className="h-5 w-5 text-sky-600" />}
              label={t("subscription.patients") || "Bemorlar"}
              current={usage.patients}
              max={plan.max_patients}
            />
            <UsageBar
              icon={<CalendarDays className="h-5 w-5 text-sky-600" />}
              label={t("subscription.appointments") || "Qabullar (oylik)"}
              current={usage.appointments_this_month}
              max={plan.max_appointments_per_month}
            />
          </div>
        </div>
      )}

      {/* Available Plans */}
      {plans.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {t("subscription.availablePlans") || "Mavjud tariflar"}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border p-6 ${
                  p.id === plan?.id ? "border-sky-500 bg-sky-50" : "bg-white"
                }`}
              >
                <h4 className="text-lg font-bold">{p.name}</h4>
                <p className="mt-1 text-2xl font-bold text-sky-600">
                  {p.price_monthly?.toLocaleString()} <span className="text-sm text-gray-500">UZS/oy</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {p.max_doctors} {t("subscription.doctorUnit") || "shifokor"}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {p.max_patients} {t("subscription.patientUnit") || "bemor"}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {p.max_appointments_per_month} {t("subscription.appointmentUnit") || "qabul/oy"}
                  </li>
                </ul>
                {p.id === plan?.id ? (
                  <div className="mt-4 rounded-xl bg-sky-100 py-2 text-center text-sm font-medium text-sky-700">
                    {t("subscription.currentPlanBadge") || "Joriy tarif"}
                  </div>
                ) : (
                  <button
                    onClick={() => handlePay(p.id)}
                    className="mt-4 w-full rounded-xl bg-sky-600 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
                  >
                    {t("subscription.selectPlan") || "Tanlash"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({ icon, label, current, max }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const isHigh = pct >= 80;

  return (
    <div className="flex items-center gap-4">
      {icon}
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700">{label}</span>
          <span className={`font-medium ${isHigh ? "text-red-600" : "text-gray-900"}`}>
            {current} / {max}
          </span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full transition-all ${isHigh ? "bg-red-500" : "bg-sky-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
