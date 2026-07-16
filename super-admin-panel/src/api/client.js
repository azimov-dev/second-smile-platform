const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/super-admin";

export async function adminApi(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = "";
    try {
      const data = await res.json();
      message = data?.message || data?.error || JSON.stringify(data);
    } catch {
      message = await res.text().catch(() => "");
    }
    const err = new Error(message || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.status === 204 ? null : res.json();
}
