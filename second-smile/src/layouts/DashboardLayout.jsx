import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logoutUser } from "../features/auth/authSlice.jsx";
import { useAuth } from "../features/auth/useAuth";
import { useClinic } from "../context/ClinicContext.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useState } from "react";
import Topbar from "../components/layout/Topbar.jsx";
import AiChat from "../components/ai/aiChat.jsx";
import {
  Home,
  Calendar,
  Users,
  Stethoscope,
  FileText,
  DollarSign,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Receipt,
  UserCog,
  ClipboardList,
  Table,
  Phone,
  Mail,
  MapPin,
  CalendarClock,
} from "lucide-react";

export default function DashboardLayout() {
  const { role } = useAuth();
  const { clinic } = useClinic();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    if (window.innerWidth < 768) setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
    setShowLogoutModal(false);
  };

  const dashboardPath =
    role === "admin" ? "/admin" : role === "doctor" ? "/doctor/" : "/reception";

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-white p-3 shadow-lg md:hidden"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-gradient-to-b from-slate-900 to-slate-950 text-white transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:z-auto`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center gap-4 border-b border-slate-800 px-6 py-6">
            <Link to={dashboardPath} className="flex items-center gap-4">
              {clinic?.logo_url ? (
                <img src={clinic.logo_url} alt="" className="h-12 w-12 rounded-2xl object-cover shadow-lg" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-2xl font-bold shadow-lg">
                  🦷
                </div>
              )}
              <div>
                <div className="text-xl font-bold">
                  {clinic?.name || <>Second <span className="text-sky-400">Smile</span></>}
                </div>
                <div className="text-sm text-slate-400">
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
            {/* Dashboard Home */}
            <SidebarLink
              to={dashboardPath}
              icon={<LayoutDashboard className="h-5 w-5" />}
              onNavigate={closeMobileMenu}
            >
              {t("dashboard.title") || "Boshqaruv paneli"}
            </SidebarLink>

            {/* Doctor Menu */}
            {role === "doctor" && (
              <>
                <SectionLabel>{t("common.clinic") || "Klinika"}</SectionLabel>
                <SidebarLink
                  to="/doctor/queue"
                  icon={<ClipboardList className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("queue.title") || "Bugungi navbat"}
                </SidebarLink>
                <SidebarLink
                  to="/doctor/appointments"
                  icon={<Calendar className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("appointments.title") || "Qabullar"}
                </SidebarLink>
                <SidebarLink
                  to="/doctor/treatments"
                  icon={<Stethoscope className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("treatments") || "Davolanishlar"}
                </SidebarLink>
                <SidebarLink
                  to="/doctor/debts"
                  icon={<DollarSign className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("debts") || "Qarzdorliklar"}
                </SidebarLink>
                <SidebarLink
                  to="/doctor/patients"
                  icon={<Users className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("patients.title") || "Bemorlar"}
                </SidebarLink>
              </>
            )}

            {/* Reception Menu */}
            {role === "reception" && (
              <>
                <SectionLabel>{t("common.clinic") || "Klinika"}</SectionLabel>
                <SidebarLink
                  to="/reception/queue"
                  icon={<Table className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("queue.title") || "Navbat"}
                </SidebarLink>
                <SidebarLink
                  to="/reception/appointments"
                  icon={<Calendar className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("appointments.title") || "Qabullar"}
                </SidebarLink>
                <SidebarLink
                  to="/reception/treatments"
                  icon={<Stethoscope className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("treatments") || "Davolanishlar"}
                </SidebarLink>
                <SidebarLink
                  to="/reception/debts"
                  icon={<DollarSign className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("debts") || "Qarzdorliklar"}
                </SidebarLink>
                <SidebarLink
                  to="/reception/patients"
                  icon={<Users className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("patients.title") || "Bemorlar"}
                </SidebarLink>
                <SidebarLink
                  to="/patient-view"
                  icon={<CalendarClock className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("queue.title")}
                </SidebarLink>
              </>
            )}

            {/* Admin Menu */}
            {role === "admin" && (
              <>
                <SectionLabel>{t("common.clinic") || "Klinika"}</SectionLabel>
                <SidebarLink
                  to="/admin/services"
                  icon={<FileText className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("services") || "Xizmatlar"}
                </SidebarLink>
                <SidebarLink
                  to="/admin/categories"
                  icon={<Package className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("categories") || "Kategoriyalar"}
                </SidebarLink>
                <SidebarLink
                  to="/admin/treatments"
                  icon={<Stethoscope className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("treatments") || "Davolanishlar"}
                </SidebarLink>
                <SidebarLink
                  to="/admin/debts"
                  icon={<DollarSign className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("debts") || "Qarzdorliklar"}
                </SidebarLink>

                <SectionLabel>
                  {t("common.users") || "Foydalanuvchilar"}
                </SectionLabel>
                <SidebarLink
                  to="/admin/users"
                  icon={<UserCog className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("users") || "Foydalanuvchilar"}
                </SidebarLink>

                <SectionLabel>
                  {t("common.management") || "Boshqaruv"}
                </SectionLabel>
                <SidebarLink
                  to="/admin/queue"
                  icon={<Table className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("queue.title") || "Navbat"}
                </SidebarLink>
                <SidebarLink
                  to="/admin/appointments"
                  icon={<Calendar className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("appointments.title") || "Qabullar"}
                </SidebarLink>
                <SidebarLink
                  to="/admin/patients"
                  icon={<Users className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("patients.title") || "Bemorlar"}
                </SidebarLink>
                <SidebarLink
                  to="/patient-view"
                  icon={<CalendarClock className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("queue.title")}
                </SidebarLink>

                <SectionLabel>{t("subscription.title") || "Obuna"}</SectionLabel>
                <SidebarLink
                  to="/admin/subscription"
                  icon={<Receipt className="h-5 w-5" />}
                  onNavigate={closeMobileMenu}
                >
                  {t("subscription.title") || "Obuna"}
                </SidebarLink>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="mx-auto max-w-7xl py-8">
            {/* Contact Info */}
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-sky-600" />
                <a href="tel:+998916785511">+998 91 678 55 11</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-sky-600" />
                <a
                  href="mailto:info@second-smile.uz"
                  className="text-slate-700 hover:text-slate-900"
                  target="blank"
                >
                  info@second-smile.uz
                </a>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-800 p-4">
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium hover:bg-slate-700 transition-all"
            >
              <LogOut className="h-5 w-5" />
              {t("logout") || "Chiqish"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:ml-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 px-2 py-3 md:px-4 md:py-5">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <AiChat />
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

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
                {t("logoutConfirm.cancel") || "Yo‘q, qaytish"}
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
    </div>
  );
}

// Reusable Sidebar Components
function SidebarLink({ to, children, icon, onNavigate }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
          isActive
            ? "bg-sky-600/20 text-sky-300 shadow-inner"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`
      }
      onClick={onNavigate}
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mb-2 mt-6 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </div>
  );
}
