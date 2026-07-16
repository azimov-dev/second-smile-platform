export function getClinicSlug() {
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return import.meta.env.VITE_CLINIC_SLUG || "secondsmile";
  }

  const parts = hostname.split(".");
  // clinic1.second-smile.uz -> "clinic1"
  if (parts.length >= 3) {
    return parts[0];
  }

  // fallback for second-smile.uz without subdomain
  return "secondsmile";
}
