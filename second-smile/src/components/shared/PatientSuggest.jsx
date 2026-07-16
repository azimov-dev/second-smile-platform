import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { apiClient } from "../../api/client.js";

let cachedPatients = null;
let cachedPatientsAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeBirthDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function normalizePatient(p) {
  return {
    id: p.id,
    firstName: p.first_name || "",
    lastName: p.last_name || "",
    phone: p.phone || "",
    birthDate: normalizeBirthDate(p.birth_date),
    address: p.address || "",
  };
}

export function PatientSuggest({ token, query, onSelect, disabled, t }) {
  const [patients, setPatients] = useState(
    Array.isArray(cachedPatients) ? cachedPatients : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suppressedQuery, setSuppressedQuery] = useState("");

  useEffect(() => {
    if (disabled || !token) return;

    const now = Date.now();
    if (
      Array.isArray(cachedPatients) &&
      now - cachedPatientsAt < CACHE_TTL_MS
    ) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient("/patients", { token });
        const list = Array.isArray(res) ? res.map(normalizePatient) : [];
        cachedPatients = list;
        cachedPatientsAt = Date.now();
        if (!cancelled) setPatients(list);
      } catch (e) {
        if (!cancelled)
          setError(
            e?.message ||
              t?.("errors.loadPatients") ||
              "Bemorlarni yuklashda xato",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [disabled, token, t]);

  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();

  const normalizedSuppressedQuery = String(suppressedQuery || "")
    .trim()
    .toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) return [];

    const parts = normalizedQuery
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length === 0) return [];

    const matches = patients.filter((p) => {
      const hay = `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase();
      return parts.every((part) => hay.includes(part));
    });

    return matches.slice(0, 8);
  }, [patients, normalizedQuery]);

  if (disabled) return null;
  if (!normalizedQuery || normalizedQuery.length < 2) return null;
  if (
    normalizedSuppressedQuery &&
    normalizedQuery === normalizedSuppressedQuery
  )
    return null;

  return (
    <div className="absolute z-50 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {loading && patients.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t?.("common.loading") || "Yuklanmoqda..."}
        </div>
      ) : error ? (
        <div className="px-4 py-3 text-sm text-red-700 bg-red-50">{error}</div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3 text-sm text-gray-600">
          {t?.("noRecordsFound") || "No results"}
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
              onMouseDown={(e) => {
                // prevent input blur closing the dropdown before selection
                e.preventDefault();
                setSuppressedQuery(
                  `${p.firstName} ${p.lastName} ${p.phone}`.trim(),
                );
                onSelect?.(p);
              }}
            >
              <div className="font-medium text-gray-900">
                {p.firstName} {p.lastName}
              </div>
              <div className="text-sm text-gray-600">{p.phone}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
