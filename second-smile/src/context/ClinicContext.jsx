import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "../api/client";

const ClinicContext = createContext(null);

export function ClinicProvider({ children }) {
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [clinicNotFound, setClinicNotFound] = useState(false);

  const fetchClinicInfo = useCallback(async () => {
    try {
      const data = await apiClient("/clinic/info");
      setClinic(data);

      // Check subscription status from response
      const sub = data?.subscription;
      if (sub) {
        const isExpired = sub.days_left !== null && sub.days_left <= 0;
        const isCancelled = sub.status === "cancelled" || sub.status === "expired";
        setSubscriptionExpired(isExpired || isCancelled);
      } else {
        setSubscriptionExpired(true);
      }
    } catch (err) {
      if (err.status === 404) {
        setClinicNotFound(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClinicInfo();

    const handleSubscriptionExpired = () => setSubscriptionExpired(true);
    const handleClinicNotFound = () => setClinicNotFound(true);

    window.addEventListener("subscription-expired", handleSubscriptionExpired);
    window.addEventListener("clinic-not-found", handleClinicNotFound);

    return () => {
      window.removeEventListener("subscription-expired", handleSubscriptionExpired);
      window.removeEventListener("clinic-not-found", handleClinicNotFound);
    };
  }, [fetchClinicInfo]);

  // Allow refreshing subscription status
  const refreshClinic = useCallback(() => {
    setLoading(true);
    fetchClinicInfo();
  }, [fetchClinicInfo]);

  return (
    <ClinicContext.Provider
      value={{ clinic, loading, error, subscriptionExpired, clinicNotFound, refreshClinic }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic must be used within ClinicProvider");
  return ctx;
}
