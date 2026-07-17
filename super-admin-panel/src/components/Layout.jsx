import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LayoutDashboard, Building2, CreditCard, Package, Users, LogOut, ShieldCheck } from "lucide-react";

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-6 border-b border-slate-800">
          <h1 className="text-xl font-bold">
            Second <span className="text-sky-400">Smile</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Super Admin</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <SideLink to="/" icon={<LayoutDashboard className="h-5 w-5" />}>
            Dashboard
          </SideLink>
          <SideLink to="/clinics" icon={<Building2 className="h-5 w-5" />}>
            Clinics
          </SideLink>
          <SideLink to="/users" icon={<Users className="h-5 w-5" />}>
            Users
          </SideLink>
          <SideLink to="/subscriptions" icon={<ShieldCheck className="h-5 w-5" />}>
            Subscriptions
          </SideLink>
          <SideLink to="/plans" icon={<Package className="h-5 w-5" />}>
            Plans
          </SideLink>
          <SideLink to="/payments" icon={<CreditCard className="h-5 w-5" />}>
            Payments
          </SideLink>
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="text-sm text-slate-300 mb-2">{admin?.full_name || "Admin"}</div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 transition"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

function SideLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-sky-600/20 text-sky-300"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
