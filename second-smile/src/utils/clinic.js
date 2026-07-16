export function getClinicSlug() {
  // Env var override — used on Vercel and localhost
  if (import.meta.env.VITE_CLINIC_SLUG) {
    return import.meta.env.VITE_CLINIC_SLUG;
  }

  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "secondsmile";
  }

  // Only extract subdomain from *.second-smile.uz
  if (hostname.endsWith(".second-smile.uz")) {
    const sub = hostname.replace(".second-smile.uz", "");
    if (sub && sub !== "www") return sub;
  }

  return "secondsmile";
}
