import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

export default function RoleRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role)) {
    // Not allowed → send to their own dashboard
    if (role === "admin") return <Navigate to="/admin" replace />;
    if (role === "doctor") return <Navigate to="/doctor" replace />;
    if (role === "reception") return <Navigate to="/reception" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
