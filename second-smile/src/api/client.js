import { getClinicSlug } from "../utils/clinic";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.second-smile.uz/api";

export async function apiClient(path, { method = "GET", token, body } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-Clinic-Slug": getClinicSlug(),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = "";
    let code = "";
    try {
      const data = await res.clone().json();
      message = data?.message || data?.error || data?.detail || JSON.stringify(data);
      code = data?.code || "";
    } catch {
      try {
        message = await res.text();
      } catch {
        message = "";
      }
    }

    const err = new Error(message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.code = code;

    // Emit subscription events for global handling
    if (res.status === 402) {
      window.dispatchEvent(new CustomEvent("subscription-expired", { detail: { message, code } }));
    }
    if (res.status === 404 && code === "CLINIC_NOT_FOUND") {
      window.dispatchEvent(new CustomEvent("clinic-not-found"));
    }

    throw err;
  }

  return res.status === 204 ? null : res.json();
}
