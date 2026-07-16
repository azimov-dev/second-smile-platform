import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("sa_token"));
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem("sa_admin");
    return stored ? JSON.parse(stored) : null;
  });

  function login(tokenVal, adminData) {
    localStorage.setItem("sa_token", tokenVal);
    localStorage.setItem("sa_admin", JSON.stringify(adminData));
    setToken(tokenVal);
    setAdmin(adminData);
  }

  function logout() {
    localStorage.removeItem("sa_token");
    localStorage.removeItem("sa_admin");
    setToken(null);
    setAdmin(null);
  }

  return (
    <AuthContext.Provider value={{ token, admin, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
