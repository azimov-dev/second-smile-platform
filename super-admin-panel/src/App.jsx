import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ClinicsPage from "./pages/ClinicsPage.jsx";
import ClinicFormPage from "./pages/ClinicFormPage.jsx";
import PlansPage from "./pages/PlansPage.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import Layout from "./components/Layout.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clinics" element={<ClinicsPage />} />
        <Route path="clinics/new" element={<ClinicFormPage />} />
        <Route path="clinics/:id" element={<ClinicFormPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="payments" element={<PaymentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
