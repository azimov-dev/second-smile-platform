import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  ChevronDown,
  Globe,
  Maximize2,
  Minimize2,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { logoutUser } from "../../features/auth/authSlice.jsx";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

export default function Topbar() {
  const { user, role } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const userMenuRef = useRef(null);
  const langMenuRef = useRef(null);

  const panelTitle =
    role === "admin"
      ? t("adminPanel") || "Admin panel"
      : role === "doctor"
        ? t("doctorPanel") || "Shifokor paneli"
        : role === "reception"
          ? t("receptionPanel") || "Registrator paneli"
          : t("dashboardLabel") || "Boshqaruv paneli";

  const initials = (user?.full_name || user?.name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const languages = [
    { code: "uz", label: "UZ", name: "O'zbekcha" },
    { code: "ru", label: "RU", name: "Русский" },
    { code: "en", label: "EN", name: "English" },
  ];

  const currentLang = languages.find((l) => l.code === lang) || languages[0];

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Listen to fullscreen changes (e.g., ESC key)
  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setLangOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
    setShowLogoutModal(false);
    setUserMenuOpen(false);
  };

  const handleSettingsClick = () => {
    const settingsPath =
      role === "admin"
        ? "/admin/settings"
        : role === "doctor"
          ? "/doctor/settings"
          : "/reception/settings";
    navigate(settingsPath);
    setUserMenuOpen(false);
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 lg:px-8">
        {/* Left: Panel Title */}
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {t("dashboard.title") || "BOSH SAHIFA"}
          </span>
          <h1 className="mt-0.5 text-lg font-bold text-gray-900 md:text-xl">
            {panelTitle}
          </h1>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Fullscreen Button - Hidden on mobile */}
          <button
            onClick={toggleFullscreen}
            className="hidden md:flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2.5 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
            title={
              isFullscreen
                ? t("common.exitFullscreen") || "Chiqish"
                : t("common.fullscreen") || "To'liq ekran"
            }
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </button>

          {/* Language Selector */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
              aria-label="Tilni o'zgartirish"
            >
              <Globe className="h-4 w-4 text-gray-500" />
              <span className="hidden sm:inline">{currentLang.label}</span>
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                  langOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                        lang === l.code
                          ? "bg-sky-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <div>
                        <span className="font-semibold">{l.label}</span>
                        <span className="ml-3 text-xs opacity-70">
                          {l.name}
                        </span>
                      </div>
                      {lang === l.code && (
                        <span className="text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile with Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 rounded-lg hover:bg-gray-50 transition px-2 py-1"
            >
              {/* User info - hidden on very small screens */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.full_name || user?.name || "Foydalanuvchi"}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {role || "foydalanuvchi"}
                </p>
              </div>

              {/* Avatar */}
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 p-0.5 md:h-11 md:w-11">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                    <span className="text-base font-bold text-sky-600 md:text-lg">
                      {initials}
                    </span>
                  </div>
                </div>
                {/* Online indicator */}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></span>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 hidden sm:block ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.full_name || user?.name || "Foydalanuvchi"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {user?.phone || ""}
                  </p>
                  <p className="text-xs text-gray-400 capitalize mt-1">
                    {role || "foydalanuvchi"}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={handleSettingsClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span>{t("settings.title") || "Sozlamalar"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t("logout") || "Chiqish"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100">
                <LogOut className="h-10 w-10 text-rose-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                {t("logoutConfirm.title") || "Chiqish"}
              </h3>
              <p className="mt-3 text-gray-600">
                {t("logoutConfirm.message") ||
                  "Siz rostdan ham tizimdan chiqmoqchimisiz?"}
              </p>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3.5 font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                {t("logoutConfirm.cancel") || "Yo'q, qaytish"}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-rose-600 px-6 py-3.5 font-medium text-white hover:bg-rose-700 shadow-md hover:shadow-lg transition"
              >
                {t("logoutConfirm.logout") || "Ha, chiqish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
