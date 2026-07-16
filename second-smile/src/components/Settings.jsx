import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Phone,
} from "lucide-react";
import { apiClient } from "../api/client.js";
import { useAuth } from "../features/auth/useAuth";
import { setUser as setAuthUser } from "../features/auth/authSlice.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export function Settings() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("profile");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.full_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!user || !token) {
      setError(t("errors.noToken") || "Please log in first.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        full_name: profileForm.fullName.trim(),
        phone: profileForm.phone.trim() || null,
      };

      const attempts = [
        { path: "/users/me", method: "PATCH" },
        { path: "/auth/me", method: "PATCH" },
        ...(user?.id ? [{ path: `/users/${user.id}`, method: "PATCH" }] : []),
        ...(user?.role === "admin"
          ? [
              { path: `/admin/users/${user.id}`, method: "PATCH" },
              { path: `/admin/users/${user.id}`, method: "PUT" },
            ]
          : []),
      ].filter((a) => Boolean(a.path));

      let updatedUser = null;
      let lastErr = null;

      for (const attempt of attempts) {
        try {
          updatedUser = await apiClient(attempt.path, {
            method: attempt.method,
            token,
            body,
          });
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const status = err?.status;
          if (status === 404 || status === 405) continue;
          if (status === 403 || status === 401) {
            if (attempt.path.startsWith("/admin")) continue;
          }
          break;
        }
      }

      if (lastErr) {
        throw lastErr;
      }

      const nextUser = {
        ...user,
        full_name: body.full_name,
        phone: body.phone,
        ...(updatedUser && typeof updatedUser === "object" ? updatedUser : {}),
      };

      dispatch(setAuthUser(nextUser));

      setSuccess(
        t("settings.profileUpdated") || "Profil muvaffaqiyatli yangilandi!",
      );
    } catch (err) {
      console.error("Profile update error:", err);
      setError(
        err.message ||
          t("errors.updateFailed") ||
          "Profilni yangilashda xato yuz berdi",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setSuccess("");

    // Validation
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setError(t("errors.fillAllFields") || "Barcha maydonlarni to'ldiring");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError(
        t("settings.passwordTooShort") ||
          "Yangi parol kamida 6 belgidan iborat bo'lishi kerak",
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(t("settings.passwordMismatch") || "Parollar bir xil emas");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient("/auth/change-password", {
        method: "POST",
        token,
        body: {
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        },
      });

      setSuccess(
        t("settings.passwordChanged") || "Parol muvaffaqiyatli o'zgartirildi!",
      );

      // Clear password form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Password change error:", err);
      setError(
        err.message ||
          t("errors.passwordChangeFailed") ||
          "Parolni o'zgartirishda xato yuz berdi. Eski parolni tekshiring.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="bg-blue-100 p-4 rounded-2xl">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {t("settings.title") || "Sozlamalar"}
          </h1>
          <p className="text-slate-600 mt-1">
            {t("settings.subtitle") ||
              "Profil va xavfsizlik sozlamalarini boshqaring"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("settings.profileTab") || "Profil"}
          </div>
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === "security"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {t("settings.securityTab") || "Xavfsizlik"}
          </div>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-green-700">
          {success}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {t("settings.personalInfo") || "Shaxsiy ma'lumotlar"}
            </h2>
            <p className="text-slate-600 mt-2">
              {t("settings.personalInfoDesc") ||
                "Shaxsiy ma'lumotlaringizni yangilang"}
            </p>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("common.fullName") || "To'liq ism"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    required
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        fullName: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder={t("common.fullName") || "To'liq ism"}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("common.phone") || "Telefon"}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        phone: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="+998 xx xxx xx xx"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-3 transition ${
                  isSubmitting
                    ? "bg-blue-400 text-white cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("common.saving") || "Saqlanmoqda..."}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {t("common.save") || "Saqlash"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {t("settings.changePassword") || "Parolni o'zgartirish"}
            </h2>
            <p className="text-slate-600 mt-2">
              {t("settings.changePasswordDesc") ||
                "Hisobingiz xavfsizligini ta'minlash uchun parolni yangilang"}
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-2xl">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("settings.currentPassword") || "Joriy parol"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  required
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      current: !showPasswords.current,
                    })
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("settings.newPassword") || "Yangi parol"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  required
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      new: !showPasswords.new,
                    })
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t("settings.passwordRequirement") ||
                  "Kamida 6 belgidan iborat bo'lishi kerak"}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t("settings.confirmPassword") || "Parolni tasdiqlang"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  required
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      confirm: !showPasswords.confirm,
                    })
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-3 transition ${
                  isSubmitting
                    ? "bg-blue-400 text-white cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("common.saving") || "Saqlanmoqda..."}
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    {t("settings.updatePassword") || "Parolni yangilash"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
