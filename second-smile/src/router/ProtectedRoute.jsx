import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";
import { useEffect } from "react";

export default function ProtectedRoute() {
  const { token, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000;

      if (Date.now() >= exp) {
        logout();
      }
    } catch (err) {
      console.error("Invalid token format:", err);
      logout();
    }
  }, [token, logout]);

  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
