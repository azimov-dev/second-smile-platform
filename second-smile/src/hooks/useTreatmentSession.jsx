import { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "../api/client.js";

export function useTreatmentSession({ id, token, t }) {
  const [appointment, setAppointment] = useState(null);
  const [services, setServices] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      if (!token) {
        setError(t?.("errors.noToken") || "Tizimga kirish kerak");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [apptData, servicesData] = await Promise.all([
          apiClient(`/appointments/${id}`, { token }),
          apiClient("/services?active=true", { token }),
        ]);

        if (!cancelled) {
          setAppointment(apptData);
          const backendDiscount = apptData?.treatment?.discount_amount;
          const parsed = Number(backendDiscount ?? 0);
          if (Number.isFinite(parsed) && parsed >= 0) setDiscountAmount(parsed);
        }
        if (!cancelled)
          setServices(Array.isArray(servicesData) ? servicesData : []);

        // Try loading service categories (non-fatal)
        try {
          const categoriesRes = await apiClient("/service-categories", {
            token,
          });
          if (!cancelled)
            setServiceCategories(
              Array.isArray(categoriesRes) ? categoriesRes : [],
            );
        } catch {
          // ignore
        }

        // Try loading existing treatment items (non-fatal)
        try {
          const itemsRes = await apiClient(
            `/treatment-items?appointment_id=${id}`,
            { token },
          );
          if (!cancelled && Array.isArray(itemsRes)) {
            const parseTeeth = (item) => {
              const fromString =
                typeof item?.tooth_numbers === "string"
                  ? item.tooth_numbers
                  : "";
              const fromArray = Array.isArray(item?.teeth) ? item.teeth : [];

              const parts = [
                ...String(fromString)
                  .split(/[\s,]+/)
                  .map((s) => s.trim())
                  .filter(Boolean),
                ...fromArray.map((v) => String(v).trim()).filter(Boolean),
              ];

              return parts;
            };

            const preSelected = itemsRes.map((item) => ({
              id: item.service?.id,
              name: item.service?.name,
              price: item.price_at_time,
              quantity: item.quantity,
              treatment_item_id: item.id,
              tooth_numbers:
                typeof item.tooth_numbers === "string"
                  ? item.tooth_numbers
                  : Array.isArray(item.teeth)
                    ? item.teeth.join(",")
                    : "",
              notes: typeof item.notes === "string" ? item.notes : "",
            }));
            setSelectedServices(preSelected);

            const derivedTeeth = Array.from(
              new Set(itemsRes.flatMap((it) => parseTeeth(it))),
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            if (derivedTeeth.length) setSelectedTeeth(derivedTeeth);

            // Ensure already-added services exist in the list, so they can be unchecked
            setServices((prev) => {
              const base = Array.isArray(prev) ? prev : [];
              const existingIds = new Set(
                base.map((s) => s?.id).filter(Boolean),
              );
              const missing = itemsRes
                .map((it) => it?.service)
                .filter((svc) => svc && !existingIds.has(svc.id));
              return missing.length ? [...base, ...missing] : base;
            });
          }
        } catch {
          // ignore
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err.message ||
              t?.("errors.loadData") ||
              "Ma'lumotlarni yuklashda xato",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [id, token, t]);

  const toggleService = useCallback(
    (service) => {
      setSelectedServices((prev) => {
        const exists = prev.find((s) => s.id === service.id);
        if (exists) return prev.filter((s) => s.id !== service.id);
        return [
          ...prev,
          {
            id: service.id,
            name: service.name,
            price: service.price,
            quantity: 1,
            tooth_numbers: selectedTeeth.join(","),
            notes: "",
          },
        ];
      });
    },
    [selectedTeeth],
  );

  const updateQuantity = useCallback((serviceId, quantity) => {
    if (quantity < 1) return;
    setSelectedServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, quantity } : s)),
    );
  }, []);

  const toggleTooth = useCallback((fdi) => {
    setSelectedTeeth((prev) =>
      prev.includes(fdi) ? prev.filter((t) => t !== fdi) : [...prev, fdi],
    );
  }, []);

  const updateServiceToothNumbers = useCallback((serviceId, toothNumbers) => {
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? { ...s, tooth_numbers: String(toothNumbers ?? "") }
          : s,
      ),
    );
  }, []);

  const updateServiceNotes = useCallback((serviceId, serviceNotes) => {
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.id === serviceId ? { ...s, notes: String(serviceNotes ?? "") } : s,
      ),
    );
  }, []);

  const total = useMemo(
    () =>
      selectedServices.reduce(
        (sum, s) => sum + (s.price || 0) * (s.quantity || 1),
        0,
      ),
    [selectedServices],
  );

  const discountedTotal = useMemo(() => {
    const d = Number(discountAmount || 0);
    if (!Number.isFinite(d) || d <= 0) return total;
    return Math.max(total - d, 0);
  }, [discountAmount, total]);

  const serviceCategoriesById = useMemo(() => {
    const map = {};
    for (const c of serviceCategories) {
      if (c && c.id != null) map[c.id] = c;
    }
    return map;
  }, [serviceCategories]);

  const buildPayload = useCallback(() => {
    return {
      discount_amount: Number.isFinite(Number(discountAmount))
        ? Math.max(Number(discountAmount), 0)
        : 0,
      services: selectedServices.map((s) => {
        const payload = {
          service_id: s.id,
          quantity: s.quantity || 1,
        };

        const toothNumbers = (s.tooth_numbers || "").trim();
        if (toothNumbers) payload.tooth_numbers = toothNumbers;

        const serviceNotes = (s.notes || "").trim();
        if (serviceNotes) payload.notes = serviceNotes;

        return payload;
      }),
    };
  }, [discountAmount, selectedServices]);

  const saveTo = useCallback(
    async (endpoint, options = {}) => {
      const { method = "POST", allowEmpty = false } = options || {};

      if (!endpoint) throw new Error("Endpoint required");
      if (!allowEmpty && selectedServices.length === 0) {
        setError(t?.("errors.selectService") || "Kamida bitta xizmat tanlang");
        return null;
      }
      if (saving) return null;

      setSaving(true);
      setError("");
      try {
        const body = buildPayload();
        const res = await apiClient(endpoint, { method, token, body });
        return res;
      } catch (err) {
        setError(
          err.message || t?.("errors.saveTreatment") || "Saqlashda xato",
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [buildPayload, saving, selectedServices.length, token, t],
  );

  return {
    appointment,
    setAppointment,
    services,
    serviceCategories,
    serviceCategoriesById,
    selectedTeeth,
    selectedServices,
    discountAmount,
    loading,
    saving,
    error,
    total,
    discountedTotal,
    toggleService,
    updateQuantity,
    toggleTooth,
    updateServiceToothNumbers,
    updateServiceNotes,
    saveTo,
    setSelectedTeeth,
    setSelectedServices,
    setDiscountAmount,
    setError,
  };
}
