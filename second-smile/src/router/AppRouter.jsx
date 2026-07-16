import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import AuthLayout from "../layouts/AuthLayout";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";

import { AdminDashboard } from "../components/admin/AdminDashboard.jsx";
import { DoctorDashboard } from "../components/doctor/DoctorDashboard.jsx";
import { ReceptionDashboard } from "../components/reception/ReceptionDashboard.jsx";

import { Services } from "../components/admin/Services.jsx";
import { Users } from "../components/admin/Users.jsx";
import { Treatments } from "../components/doctor/Treatments.jsx";
import { TreatmentEditor } from "../components/doctor/TreatmentEditor.jsx";
import { StartTreatment } from "../components/doctor/StartTreatment";
import { DoctorAppointments } from "../components/doctor/DoctorAppointments.jsx";

import { Patients as AllPatients } from "../components/reception/Patients.jsx";
import { Appointments as AllAppointments } from "../components/reception/Appointments.jsx";

import { ScheduleCalendar } from "../components/reception/ScheduleCalendar.jsx";

import { QueueModal as DoctorQueue } from "../components/QueueModal.jsx";

import CategoriesPage from "../pages/Admin/CategoriesPage.jsx";
import DebtsPage from "../pages/Admin/DebtsPage.jsx";
import SubscriptionPage from "../pages/Admin/SubscriptionPage.jsx";

import { useAuth } from "../features/auth/useAuth";
import { PatientCalendar } from "../pages/PatientCalendar.jsx";
import { Settings } from "../components/Settings.jsx";

function RoleRedirect() {
  const { role } = useAuth();
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "doctor") return <Navigate to="/doctor" replace />;
  if (role === "reception") return <Navigate to="/reception" replace />;
  return <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public - Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Area */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Root redirect based on role */}
          <Route index element={<RoleRedirect />} />

          {/* ==================== ADMIN ==================== */}
          <Route element={<RoleRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/services" element={<Services />} />
            <Route path="/admin/categories" element={<CategoriesPage />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/debts" element={<DebtsPage />} />

            {/* Admin sees everything */}
            <Route path="/admin/appointments" element={<AllAppointments />} />
            <Route path="/admin/patients" element={<AllPatients />} />
            <Route path="/admin/treatments" element={<Treatments />} />
            <Route path="/admin/queue" element={<ScheduleCalendar />} />
            <Route path="/admin/subscription" element={<SubscriptionPage />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>

          {/* ==================== DOCTOR ==================== */}
          <Route element={<RoleRoute allowedRoles={["doctor"]} />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/queue" element={<DoctorQueue />} />
            <Route
              path="/doctor/appointments"
              element={<DoctorAppointments />}
            />
            <Route
              path="/doctor/treatment/start/:id"
              element={<StartTreatment />}
            />
            <Route
              path="/doctor/treatment/add/:id"
              element={<TreatmentEditor />}
            />
            <Route path="/doctor/treatments" element={<Treatments />} />
            <Route path="/doctor/debts" element={<DebtsPage />} />
            <Route path="/doctor/patients" element={<AllPatients />} />
            <Route path="/doctor/settings" element={<Settings />} />
          </Route>

          {/* ==================== RECEPTION ==================== */}
          <Route element={<RoleRoute allowedRoles={["reception"]} />}>
            <Route path="/reception" element={<ReceptionDashboard />} />
            <Route path="/reception/queue" element={<ScheduleCalendar />} />
            <Route
              path="/reception/appointments"
              element={<AllAppointments />}
            />
            <Route path="/reception/debts" element={<DebtsPage />} />
            <Route path="/reception/treatments" element={<Treatments />} />
            <Route path="/reception/patients" element={<AllPatients />} />
            <Route path="/reception/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>

      <Route path="/patient-view" element={<PatientCalendar />} />

      {/* 404 - Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
