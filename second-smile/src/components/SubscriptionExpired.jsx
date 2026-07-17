import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function SubscriptionExpired() {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 isolate z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-10 w-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t("subscription.expired.title") || "Obuna muddati tugadi"}
        </h2>
        <p className="mt-3 text-gray-600">
          {t("subscription.expired.message") ||
            "Sizning obuna muddatingiz tugagan. Iltimos, admin bilan bog'laning yoki obunani yangilang."}
        </p>
        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {t("subscription.expired.contact") ||
            "Yordam uchun: info@second-smile.uz"}
        </div>
      </div>
    </div>
  );
}
