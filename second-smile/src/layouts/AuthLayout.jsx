import { Outlet } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useClinic } from "../context/ClinicContext.jsx";

export default function AuthLayout() {
  const { t } = useLanguage();
  const { clinic } = useClinic();
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gradient-to-br from-slate-50 via-sky-50 to-blue-100">
      {/* Left: Form Side */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-white/90 backdrop-blur-sm shadow-2xl p-10 border border-white/50">
            {/* Logo & Title */}
            <div className="text-center mb-10">
              {clinic?.logo_url ? (
                <img src={clinic.logo_url} alt="" className="mx-auto h-16 w-16 rounded-3xl object-cover shadow-lg" />
              ) : (
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white text-3xl font-bold shadow-lg">
                  🦷
                </div>
              )}
              <h1 className="mt-6 text-3xl font-bold text-slate-900">
                {clinic?.name || <>Second <span className="text-sky-600">Smile</span></>}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {t("auth.subtitle") ||
                  "Stomatologiya klinikasi boshqaruv tizimi"}
              </p>
            </div>

            {/* Form Content (Login / Register) */}
            <div className="space-y-6">
              <Outlet />
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="mt-8 text-center text-xs text-slate-500 lg:hidden">
            © {currentYear} Second Smile.{" "}
            {t("auth.infoFooter") || "Barcha huquqlar himoyalangan"}
          </div>
        </div>
      </div>

      {/* Right: Decorative Side Panel */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-sky-900">
        {/* Optional: Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(56,189,248,0.4),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.3),transparent_50%)]" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Top Content */}
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold leading-tight">
              {t("auth.infoTitle") || "Sog‘lom tabassum — baxtli hayot kaliti"}
            </h2>
            <p className="mt-6 text-lg text-slate-200 leading-relaxed">
              {t("auth.infoDesc") ||
                "Second Smile klinikasida biz har bir bemorning tabassumini mukammal qilishga intilamiz. Zamonaviy uskunalar, tajribali shifokorlar va do‘stona muhit — siz uchun eng yaxshi stomatologik xizmatlar."}
            </p>

            {/* Optional Feature Highlights */}
            <div className="mt-12 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">
                    {t("auth.infoServiceTitle") || "Yuqori sifatli xizmatlar"}
                  </h4>
                  <p className="text-sm text-slate-300 mt-1">
                    {t("auth.infoServiceDesc") ||
                      "Eng so‘nggi texnologiyalar va usullar bilan davolash"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0V8.5a3.5 3.5 0 017 0V18m-7 0h14"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">
                    {t("auth.infoFeatureTitle") || "Tajribali shifokorlar"}
                  </h4>
                  <p className="text-sm text-slate-300 mt-1">
                    {t("auth.infoFeatureDesc") ||
                      "Malakali va do‘stona jamoa sizning xizmatingizda"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-slate-400">
            © {currentYear} Second Smile.{" "}
            {t("auth.infoFooter") || "Barcha huquqlar himoyalangan"}
          </div>
        </div>
      </div>
    </div>
  );
}
