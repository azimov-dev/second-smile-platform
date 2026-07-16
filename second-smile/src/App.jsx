import AppRouter from "./router/AppRouter.jsx";
import { ClinicProvider, useClinic } from "./context/ClinicContext.jsx";
import SubscriptionExpired from "./components/SubscriptionExpired.jsx";
import ClinicNotFound from "./components/ClinicNotFound.jsx";

function AppContent() {
  const { loading, clinicNotFound, subscriptionExpired } = useClinic();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (clinicNotFound) return <ClinicNotFound />;

  return (
    <>
      {subscriptionExpired && <SubscriptionExpired />}
      <AppRouter />
    </>
  );
}

export default function App() {
  return (
    <ClinicProvider>
      <AppContent />
    </ClinicProvider>
  );
}
