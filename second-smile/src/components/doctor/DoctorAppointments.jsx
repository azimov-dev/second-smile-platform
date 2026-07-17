import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Loader2,
  X,
  Pencil,
  Trash2,
  Clock,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { PatientSuggest } from "../shared/PatientSuggest.jsx";
import { extractUzLocalDigits, toUzPhone } from "../../utils/uzPhone.js";

const getLocale = () => {
  const lang = localStorage.getItem("lang") || "uz";
  const localeMap = { uz: "uz-UZ", uz_cyr: "uz-Cyrl-UZ", uz_new: "uz-UZ", ru: "ru-RU", en: "en-US" };
  return localeMap[lang] || "uz-UZ";
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const locale = getLocale();
  const weekday = date.toLocaleDateString(locale, { weekday: "long" });
  const rest = date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekdayCap = weekday
    ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`
    : "";
  return weekdayCap ? `${weekdayCap}, ${rest}` : rest;
};

const formatWeekdayShort = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString(getLocale(), {
    weekday: "short",
  });
};

export function DoctorAppointments() {
  const { user, token } = useAuth();
  const currentUserId = user?.id;
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [appointmentsRaw, setAppointmentsRaw] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [viewMode, setViewMode] = useState("list");
  const [calendarViewMode, setCalendarViewMode] = useState("day");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBusyModal, setShowBusyModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [patientSuggestEnabled, setPatientSuggestEnabled] = useState(true);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    birthDate: "",
    address: "",
    notes: "",
    duration: 30,
    time: "",
    treatmentPlanId: "",
  });
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [createNewPlan, setCreateNewPlan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [isBusySubmitting, setIsBusySubmitting] = useState(false);
  const [busyForm, setBusyForm] = useState({
    allDay: false,
    startTime: "08:00",
    endTime: "17:00",
    type: "busy",
    reason: "",
  });

  const TIME_SLOTS = (() => {
    const slots = [];
    const startH = 8;
    const endH = 20;
    for (let h = startH; h <= endH; h++) {
      const hh = String(h).padStart(2, "0");
      slots.push(`${hh}:00`);
      if (h < endH) slots.push(`${hh}:30`);
    }
    return slots;
  })();

  function formatTime(dateStr) {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  }

  function StatusBadge({ status }) {
    const s = (status || "").toLowerCase();

    let bg = "bg-sky-100 text-sky-700";
    let text = t("common.active") || "Jarayonda";

    if (s === "in_progress" || s === "active") {
      bg = "bg-amber-100 text-amber-700";
      text = t("common.inProgress") || "Jarayonda";
    } else if (s === "completed" || s === "done") {
      bg = "bg-emerald-100 text-emerald-700";
      text = t("common.completed") || "Yakunlangan";
    } else if (s === "cancelled") {
      bg = "bg-red-100 text-red-700";
      text = t("common.cancelled") || "Bekor qilingan";
    }

    return (
      <span
        className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${bg}`}
      >
        {text}
      </span>
    );
  }

  const todayFormatted = formatDisplayDate(selectedDate);

  // Load appointments
  const loadAppointments = async () => {
    if (!token || !currentUserId) return;

    try {
      setLoading(true);
      setError("");

      const data = await apiClient(`/appointments?date=${selectedDate}`, {
        token,
      });
      const list = Array.isArray(data) ? data : [];

      const filtered = list.filter((a) => {
        const doctorId = a.doctor_id || (a.doctor && a.doctor.id);
        return doctorId === currentUserId;
      });

      const normalized = filtered.map((a) => {
        const time = formatTime(a.appointment_date);

        let patientName = t("common.unknown") || "Noma'lum bemor";
        if (a.patient && a.patient.first_name && a.patient.last_name) {
          patientName = `${a.patient.first_name} ${a.patient.last_name}`.trim();
        }

        return {
          id: a.id,
          time,
          patient: patientName,
          status: a.status || "pending",
          durationMinutes: a.duration || 30,
          notes: a.notes || "",
        };
      });

      setAppointments(normalized);
    } catch (err) {
      setError(
        err.message ||
          t("errors.loadAppointments") ||
          "Qabullarni yuklashda xato",
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatLocalDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getWeekDays = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthGrid = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

    const days = [];
    let current = new Date(startDate);
    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const getEndTime = (apptOrIso) => {
    // apptOrIso can be appointment object or ISO string
    const appt =
      typeof apptOrIso === "string"
        ? { appointment_date: apptOrIso }
        : apptOrIso || {};
    const start = new Date(appt.appointment_date);
    const duration = Number(appt.duration ?? appt.durationMinutes ?? 30) || 30;
    const end = new Date(start.getTime() + duration * 60000);
    const h = String(end.getHours()).padStart(2, "0");
    const m = String(end.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  const getAppointmentAtTimeAndDate = (time, dateStr) => {
    return appointmentsRaw.find((appt) => {
      const apptDate = new Date(appt.appointment_date);
      const apptDateStr = formatLocalDate(apptDate);
      if (apptDateStr !== dateStr) return false;
      const [slotHour, slotMin] = time.split(":").map(Number);
      const slotMinutes = slotHour * 60 + slotMin;
      const apptStartMinutes = apptDate.getHours() * 60 + apptDate.getMinutes();
      return (
        apptStartMinutes >= slotMinutes && apptStartMinutes < slotMinutes + 30
      );
    });
  };

  const getRowSpanForRaw = (appt) => {
    const duration = appt.duration || 30;
    const apptDate = new Date(appt.appointment_date);
    const startMinute = apptDate.getMinutes();
    const minutesIntoFirstSlot = startMinute % 30;
    const totalMinutes = duration + minutesIntoFirstSlot;
    return Math.ceil(totalMinutes / 30);
  };

  const getBusyBlockAtTime = (time, dateStr) => {
    return schedules.find((sched) => {
      if (sched.doctor_id !== currentUserId) return false;
      const schedDate =
        sched.date || formatLocalDate(new Date(sched.created_at || Date.now()));
      if (schedDate !== dateStr) return false;
      if (sched.start_time === null) return true;
      const start = (sched.start_time || "").slice(0, 5);
      return time === start;
    });
  };

  const getBusyBlockRowSpan = (busyBlock) => {
    if (!busyBlock) return 1;
    if (busyBlock.start_time === null) return TIME_SLOTS.length;
    const start = busyBlock.start_time.slice(0, 5);
    const end = busyBlock.end_time ? busyBlock.end_time.slice(0, 5) : start;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const dur = Math.max(30, endMin - startMin);
    return Math.ceil(dur / 30);
  };

  const getBusyLabel = (busyBlock) => {
    if (!busyBlock) return "";
    const reason = busyBlock.reason ? busyBlock.reason : "";
    if (reason && reason.toString().trim()) return reason.toString();
    const type = busyBlock.type ? busyBlock.type.toString() : "busy";
    const key = `schedule.types.${type}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return type.toUpperCase();
  };

  const _isCoveredByPrevious = (timeIndex, dateStr) => {
    const [currentHour, currentMin] = TIME_SLOTS[timeIndex]
      .split(":")
      .map(Number);
    const currentSlotMinutes = currentHour * 60 + currentMin;

    for (let i = 0; i < timeIndex; i++) {
      const prevTime = TIME_SLOTS[i];
      const prevAppt = getAppointmentAtTimeAndDate(prevTime, dateStr);
      if (prevAppt) {
        const apptDate = new Date(prevAppt.appointment_date);
        const apptStartMinutes =
          apptDate.getHours() * 60 + apptDate.getMinutes();
        const apptEndMinutes = apptStartMinutes + (prevAppt.duration || 30);
        if (
          currentSlotMinutes >= apptStartMinutes &&
          currentSlotMinutes < apptEndMinutes
        )
          return true;
      }
      const prevBusy = getBusyBlockAtTime(prevTime, dateStr);
      if (prevBusy) {
        if (prevBusy.start_time === null) return true;
        const [sh, sm] = prevBusy.start_time.slice(0, 5).split(":").map(Number);
        const [eh, em] = (prevBusy.end_time || prevBusy.start_time)
          .slice(0, 5)
          .split(":")
          .map(Number);
        const busyStart = sh * 60 + sm;
        const busyEnd = eh * 60 + em;
        if (currentSlotMinutes >= busyStart && currentSlotMinutes < busyEnd)
          return true;
      }
    }
    return false;
  };

  const formatHeaderDate = () => {
    const sel = new Date(selectedDate);
    const locale = getLocale();
    if (calendarViewMode === "day") {
      const str = sel.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    if (calendarViewMode === "week") {
      const start = new Date(sel);
      start.setDate(start.getDate() - start.getDay() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      const startStr = start.getDate();
      const endStr = end.getDate();
      const monthYear = sel.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      });
      return `${startStr} - ${endStr} ${monthYear}`;
    }
    return sel.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  };

  const goPrev = () => {
    const newDate = new Date(selectedDate);
    if (calendarViewMode === "day") newDate.setDate(newDate.getDate() - 1);
    else if (calendarViewMode === "week")
      newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(formatLocalDate(newDate));
  };

  const goNext = () => {
    const newDate = new Date(selectedDate);
    if (calendarViewMode === "day") newDate.setDate(newDate.getDate() + 1);
    else if (calendarViewMode === "week")
      newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(formatLocalDate(newDate));
  };

  const goPrevMobile = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(formatLocalDate(newDate));
    setCalendarViewMode("day");
  };

  const goNextMobile = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(formatLocalDate(newDate));
    setCalendarViewMode("day");
  };

  const weekDaysMemo = useMemo(
    () => getWeekDays(new Date(selectedDate)),
    [selectedDate],
  );
  const monthGridMemo = useMemo(
    () => getMonthGrid(new Date(selectedDate)),
    [selectedDate],
  );

  const handleOpenBusy = () => {
    setBusyForm((prev) => ({ ...prev, startTime: "08:00", endTime: "17:00" }));
    setShowBusyModal(true);
  };

  const handleCreateBusy = async (e) => {
    e?.preventDefault();
    if (isBusySubmitting) return;
    setIsBusySubmitting(true);
    try {
      const reasonStr = String(busyForm.reason ?? "");
      const body = {
        doctor_id: Number(currentUserId),
        date: selectedDate,
        start_time: busyForm.allDay ? null : busyForm.startTime,
        end_time: busyForm.allDay ? null : busyForm.endTime,
        type: busyForm.type,
        reason: reasonStr.trim() === "" ? "" : reasonStr.trim(),
      };
      await apiClient("/doctor-schedules", {
        method: "POST",
        token,
        body,
      });
      setShowBusyModal(false);
      await loadCalendarData();
    } catch (err) {
      console.error("Create busy error:", err);
      setError(err.message || t("errors.createFailed") || "Xato");
    } finally {
      setIsBusySubmitting(false);
    }
  };

  const handleDeleteBusy = async (busyBlock) => {
    if (!busyBlock || !busyBlock.id) return;
    const confirmMsg = t("schedule.busy.confirmDelete") || "Are you sure?";
    if (!window.confirm(confirmMsg)) return;

    setIsBusySubmitting(true);
    try {
      await apiClient(`/doctor-schedules/${busyBlock.id}`, {
        method: "DELETE",
        token,
      });

      // remove locally
      setSchedules((prev) => prev.filter((s) => s.id !== busyBlock.id));
      // reload calendar data to be safe
      await loadCalendarData();
    } catch (err) {
      console.error("Delete busy error:", err);
      alert(err.message || t("errors.deleteFailed") || "Failed to delete");
    } finally {
      setIsBusySubmitting(false);
    }
  };

  // Delete appointment (with confirmation)
  const handleDeleteAppointment = async (appt) => {
    if (!appt || !appt.id) return;
    const status = (appt.status || "").toLowerCase();
    const isNotStarted = ["pending", "confirmed"].includes(status);
    const confirmMsg = isNotStarted
      ? t("schedule.busy.confirmDelete") || "Are you sure you want to delete?"
      : t("appointments.confirmCancelText") ||
        "Haqiqatan ham ushbu qabulni bekor qilmoqchimisiz?";
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      if (isNotStarted) {
        await apiClient(`/appointments/${appt.id}`, {
          method: "DELETE",
          token,
        });
      } else {
        await apiClient(`/appointments/${appt.id}/status`, {
          method: "PATCH",
          token,
          body: { status: "cancelled" },
        });
      }

      // Refresh data depending on current view
      if (viewMode === "calendar") await loadCalendarData();
      else await loadAppointments();
    } catch (err) {
      console.error("Delete appointment error:", err);
      alert(
        err.message ||
          t("errors.deleteFailed") ||
          t("errors.cancelFailed") ||
          "Amal bajarilmadi",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadCalendarData = async () => {
    if (!token || !currentUserId) return;
    try {
      setLoading(true);
      setError("");
      const datesToFetch = [];
      if (calendarViewMode === "day") {
        datesToFetch.push(new Date(selectedDate));
      } else if (calendarViewMode === "week") {
        const start = new Date(selectedDate);
        start.setDate(start.getDate() - start.getDay() + 1);
        for (let i = 0; i < 7; i++) {
          const day = new Date(start);
          day.setDate(day.getDate() + i);
          datesToFetch.push(day);
        }
      } else {
        const grid = monthGridMemo;
        datesToFetch.push(...grid);
      }

      const apptPromises = datesToFetch.map((d) =>
        apiClient(`/appointments?date=${formatLocalDate(d)}`, { token }),
      );
      const schedPromises = datesToFetch.map((d) =>
        apiClient(`/doctor-schedules?date=${formatLocalDate(d)}`, { token }),
      );

      const [apptResults, schedResults] = await Promise.all([
        Promise.all(apptPromises),
        Promise.all(schedPromises),
      ]);
      const allAppts = apptResults.flat();
      const filtered = allAppts.filter((a) => {
        const doctorId = a.doctor_id || (a.doctor && a.doctor.id);
        return doctorId === currentUserId;
      });

      const activeAppts = filtered.filter((a) => {
        const status = (a.status || "").toLowerCase();
        return [
          "pending",
          "confirmed",
          "in_progress",
          "break",
          "completed",
          "done",
        ].includes(status);
      });

      setAppointmentsRaw(activeAppts);

      const allSched = schedResults.flat();
      setSchedules(Array.isArray(allSched) ? allSched : []);
    } catch (err) {
      console.error("Load calendar data error:", err);
      setError(
        err.message ||
          t("errors.loadAppointments") ||
          "Qabullarni yuklashda xato",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && currentUserId) {
      if (viewMode === "calendar") loadCalendarData();
      else loadAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, currentUserId, selectedDate, t, viewMode, calendarViewMode]);

  useEffect(() => {
    if (!showAddModal) return;
    if (!editingAppointment?.id) {
      setSelectedPatientId(null);
      setPatientSuggestEnabled(true);
    }
  }, [showAddModal, editingAppointment?.id]);

  useEffect(() => {
    if (!showAddModal || !selectedPatientId) {
      setTreatmentPlans([]);
      return;
    }

    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        const plans = await apiClient(
          `/treatment-plans?patient_id=${selectedPatientId}&status=active`,
          { token },
        );
        setTreatmentPlans(Array.isArray(plans) ? plans : []);
      } catch {
        setTreatmentPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, [selectedPatientId, showAddModal, token]);

  const resetAppointmentModal = () => {
    setShowAddModal(false);
    setEditingAppointment(null);
    setSelectedPatientId(null);
    setPatientSuggestEnabled(true);
    setError("");
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      birthDate: "",
      address: "",
      notes: "",
      duration: 30,
      time: "",
      treatmentPlanId: "",
    });
    setCreateNewPlan(false);
  };

  const openEditAppointment = (appt) => {
    if (!appt || !appt.id) return;
    const apptDate = new Date(appt.appointment_date);
    const dateKey = apptDate.toISOString().slice(0, 10);
    const time = apptDate.toTimeString().slice(0, 5);

    setEditingAppointment(appt);
    setPatientSuggestEnabled(false);
    setSelectedDate(dateKey);
    setCreateNewPlan(false);
    setSelectedPatientId(appt.patient?.id ?? null);
    setFormData({
      firstName: appt.patient?.first_name || "",
      lastName: appt.patient?.last_name || "",
      phone: extractUzLocalDigits(appt.patient?.phone || ""),
      birthDate: appt.patient?.birth_date
        ? new Date(appt.patient.birth_date).toISOString().slice(0, 10)
        : "",
      address: appt.patient?.address || "",
      notes: appt.notes || "",
      duration: appt.duration || 30,
      time,
      treatmentPlanId: String(
        appt.treatment_plan_id ?? appt.treatmentPlan?.id ?? "",
      ),
    });
    setError("");
    setShowAddModal(true);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const required = ["firstName", "lastName", "phone", "birthDate", "time"];
    const missing = required.find((f) => !formData[f]?.trim());

    if (missing) {
      setError(
        t("errors.fillAllFields") || "Barcha majburiy maydonlarni to'ldiring",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    let patientId = selectedPatientId;

    try {
      const fullPhone = toUzPhone(formData.phone);

      if (!patientId) {
        // Search existing patient by phone
        const searchRes = await apiClient(
          `/patients?phone=${encodeURIComponent(fullPhone)}`,
          { token },
        );

        const existingPatients = Array.isArray(searchRes) ? searchRes : [];

        if (existingPatients.length > 0) {
          patientId = existingPatients[0].id;
        } else {
          // Create new patient
          const newPatient = await apiClient("/patients", {
            method: "POST",
            token,
            body: {
              first_name: formData.firstName.trim(),
              last_name: formData.lastName.trim(),
              phone: fullPhone,
              birth_date: formData.birthDate,
              address: formData.address.trim() || null,
            },
          });
          patientId = newPatient.id;
        }
      }

      // Create or edit appointment for current doctor (include duration)
      const appointmentDateTime = `${selectedDate}T${formData.time}:00`;
      let planId = formData.treatmentPlanId || "";

      if (createNewPlan) {
        const planTitle =
          `${formData.firstName.trim()} ${formData.lastName.trim()} - ${selectedDate}`.trim();
        const plan = await apiClient("/treatment-plans", {
          method: "POST",
          token,
          body: {
            patient_id: Number(patientId),
            doctor_id: Number(currentUserId),
            title: planTitle || null,
          },
        });
        planId = plan?.id ? String(plan.id) : "";
      }

      const payload = {
        patient_id: Number(patientId),
        doctor_id: Number(currentUserId),
        appointment_date: new Date(appointmentDateTime).toISOString(),
        duration: Number(formData.duration) || 30,
        notes: formData.notes?.trim() || null,
        treatment_plan_id: planId ? Number(planId) : null,
      };

      if (editingAppointment?.id) {
        const updated = await apiClient(
          `/appointments/${editingAppointment.id}`,
          {
            method: "PATCH",
            token,
            body: payload,
          },
        );
        setAppointmentsRaw((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a)),
        );
      } else {
        await apiClient("/appointments", {
          method: "POST",
          token,
          body: payload,
        });
      }

      if (viewMode === "calendar") await loadCalendarData();
      else await loadAppointments();

      resetAppointmentModal();
    } catch (err) {
      console.error("Create appointment error:", err);
      setError(
        err.message ||
          (editingAppointment?.id
            ? t("errors.updateFailed") || "Qabulni tahrirlashda xato"
            : t("errors.createFailed") || "Qabul yaratishda xato"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNotStartedStatus = (status) => {
    const s = (status || "").toLowerCase();
    return ["pending", "confirmed"].includes(s);
  };

  const handleRemoveAppointment = async (appointment) => {
    try {
      if (!appointment?.id) return;

      if (isNotStartedStatus(appointment.status)) {
        await apiClient(`/appointments/${appointment.id}`, {
          method: "DELETE",
          token,
        });
      } else {
        await apiClient(`/appointments/${appointment.id}/status`, {
          method: "PATCH",
          token,
          body: { status: "cancelled" },
        });
      }

      setShowCancelConfirm(null);
      await loadAppointments();
    } catch (err) {
      setError(
        err.message ||
          t("errors.deleteFailed") ||
          t("errors.cancelFailed") ||
          "Amal bajarishda xato",
      );
    }
  };

  const canCancel = (status) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return !["completed", "done", "cancelled"].includes(s);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="md:hidden bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={goPrevMobile}
            className="p-2 -ml-2 rounded-full active:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5 text-red-500" />
          </button>
          <div className="text-base font-semibold text-gray-900">
            {new Date(selectedDate).toLocaleDateString(getLocale(), {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            onClick={goNextMobile}
            className="p-2 -mr-2 rounded-full active:bg-gray-100"
          >
            <ChevronRight className="w-5 h-5 text-red-500" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="grid grid-cols-7">
            {getWeekDays(new Date(selectedDate)).map((day) => {
              const isSelected =
                formatLocalDate(day) === formatLocalDate(selectedDate);
              const isToday =
                formatLocalDate(day) === formatLocalDate(new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(formatLocalDate(day));
                    setCalendarViewMode("day");
                  }}
                  className={`flex flex-col items-center justify-center rounded-full py-2 text-sm transition-all active:scale-95 ${
                    isSelected
                      ? "bg-red-500 text-white"
                      : isToday
                        ? "bg-red-100 text-red-600"
                        : "text-gray-800"
                  }`}
                >
                  <span className="text-xs font-medium">
                    {formatWeekdayShort(day)}
                  </span>
                  <span className="text-base font-semibold">
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-3 gap-3">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
              viewMode === "list"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600"
            }`}
          >
            {t("appointments.viewList") || "List"}
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
              viewMode === "calendar"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600"
            }`}
          >
            {t("appointments.viewCalendar") || "Calendar"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white"
            title={t("appointments.newFollowUp") || "New"}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenBusy}
            className="px-3 py-2 rounded-xl bg-orange-500 text-white"
            title={t("schedule.addBusy") || "Busy"}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {viewMode === "calendar" && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setCalendarViewMode("day")}
                className={`py-2 rounded-lg text-sm font-semibold ${
                  calendarViewMode === "day"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-600"
                }`}
              >
                {t("common.day") || "Day"}
              </button>
              <button
                onClick={() => setCalendarViewMode("month")}
                className={`py-2 rounded-lg text-sm font-semibold ${
                  calendarViewMode === "month"
                    ? "bg-white text-gray-900 shadow"
                    : "text-gray-600"
                }`}
              >
                {t("common.month") || "Month"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {t("appointments.myAppointments") || "Mening qabullarim"}
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            {t("appointments.doctorSubtitle") ||
              "Sizga belgilangan qabullarni ko'ring va takroriy qabul yarating"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-5 py-3 rounded-xl text-base font-semibold ${
                viewMode === "list" ? "bg-white shadow" : "text-slate-600"
              }`}
            >
              {t("appointments.viewList") || "List"}
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-5 py-3 rounded-xl text-base font-semibold flex items-center gap-2 ${
                viewMode === "calendar" ? "bg-white shadow" : "text-slate-600"
              }`}
            >
              <Calendar className="w-5 h-5" />{" "}
              {t("appointments.viewCalendar") || "Calendar"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md transition"
            >
              <Plus className="w-5 h-5" />
              {t("appointments.newFollowUp")}
            </button>

            <button
              onClick={handleOpenBusy}
              className="inline-flex text-white items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 bg-orange-500 text-slate-700 hover:bg-orange-400"
            >
              <Plus className="w-4 h-4" />{" "}
              {t("schedule.addBusy") || "Mark Busy"}
            </button>
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <div className="hidden md:flex items-center gap-4">
        <Calendar className="w-6 h-6 text-slate-600" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-5 py-3.5 rounded-xl border border-slate-300 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Selected Date */}
      {todayFormatted && (
        <div className="text-center text-xl font-semibold text-slate-700">
          {todayFormatted}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700">
          {error}
        </div>
      )}

      {/* Appointments Cards / Calendar - Fully Responsive */}
      <div className="grid gap-6 md:gap-8">
        {viewMode === "calendar" ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            {/* Mobile iPhone-style calendar */}
            {calendarViewMode === "day" && (
              <div className="md:hidden p-4 space-y-3">
                {loading ? (
                  <div className="py-10 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </div>
                ) : (
                  TIME_SLOTS.map((time, timeIndex) => {
                    const dateStr = formatLocalDate(selectedDate);
                    if (_isCoveredByPrevious(timeIndex, dateStr)) return null;

                    const busyBlock = getBusyBlockAtTime(time, dateStr);
                    if (busyBlock) {
                      return (
                        <div
                          key={`${time}-busy`}
                          className="flex items-start gap-3 p-3 rounded-2xl bg-pink-50 border border-pink-200"
                        >
                          <div className="text-xs font-semibold text-gray-500 w-14">
                            {time}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-pink-700">
                              {getBusyLabel(busyBlock)}
                            </div>
                            {busyBlock.start_time && busyBlock.end_time && (
                              <div className="text-xs text-pink-600 mt-1">
                                {busyBlock.start_time?.slice(0, 5)} -{" "}
                                {busyBlock.end_time?.slice(0, 5)}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBusy(busyBlock)}
                            disabled={isBusySubmitting}
                            className="p-1 rounded-full bg-white/80 text-pink-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    }

                    const appt = getAppointmentAtTimeAndDate(time, dateStr);
                    if (appt) {
                      const apptDate = new Date(appt.appointment_date);
                      const apptTime = apptDate.toTimeString().slice(0, 5);
                      const isBreak =
                        (appt.status || "").toLowerCase() === "break";
                      const isCompleted =
                        (appt.status || "").toLowerCase() === "completed" ||
                        (appt.status || "").toLowerCase() === "done";
                      const isInProgress =
                        (appt.status || "").toLowerCase() === "in_progress";
                      const editDisabled =
                        isSubmitting || isBreak || isCompleted || isInProgress;
                      const name = isBreak
                        ? t("schedule.types.busy")
                        : `${appt.patient?.first_name || ""} ${
                            appt.patient?.last_name || ""
                          }`.trim() || t("common.unknown");

                      return (
                        <div
                          key={appt.id}
                          onClick={() => {
                            if (editDisabled) return;
                            openEditAppointment(appt);
                          }}
                          className={`flex items-start gap-3 p-3 rounded-2xl border ${
                            isBreak
                              ? "bg-pink-50 border-pink-200"
                              : isCompleted
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-blue-50 border-blue-200 active:bg-blue-100"
                          }`}
                        >
                          <div className="text-xs font-semibold text-gray-500 w-14">
                            {apptTime}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">
                              {name}
                            </div>
                            {appt.notes && (
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {appt.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isBreak && !isCompleted && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/doctor/treatment/start/${appt.id}`,
                                  );
                                }}
                                title={t("queue.startTreatment") || "Start"}
                                className="p-1.5 rounded-full bg-white text-emerald-600"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {canCancel(appt.status) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowCancelConfirm(appt);
                                }}
                                title={t("common.cancel") || "Cancel"}
                                className="p-1.5 rounded-full bg-white text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, time }));
                          setShowAddModal(true);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-200 text-left active:bg-gray-50"
                      >
                        <div className="text-xs font-semibold text-gray-500 w-14">
                          {time}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Plus className="w-4 h-4" />
                          {t("appointments.newAppointment")}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {calendarViewMode === "month" && (
              <div className="md:hidden p-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-gray-100">
                    {getWeekDays(new Date(selectedDate)).map((day) => (
                      <div
                        key={day.toISOString()}
                        className="p-2 text-center text-xs font-semibold text-gray-500"
                      >
                        {formatWeekdayShort(day)}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-gray-100">
                    {monthGridMemo.map((d) => {
                      const dateStr = formatLocalDate(d);
                      const isCurrentMonth =
                        d.getMonth() === new Date(selectedDate).getMonth();
                      const isToday = dateStr === formatLocalDate(new Date());
                      const hasAppts = appointmentsRaw.some(
                        (a) =>
                          formatLocalDate(new Date(a.appointment_date)) ===
                          dateStr,
                      );

                      return (
                        <button
                          key={dateStr}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setCalendarViewMode("day");
                          }}
                          className={`relative h-12 bg-white flex flex-col items-center justify-center text-sm ${
                            isCurrentMonth ? "text-gray-900" : "text-gray-300"
                          } ${isToday ? "bg-red-50" : ""}`}
                        >
                          <span
                            className={`w-7 h-7 flex items-center justify-center rounded-full ${
                              isToday ? "bg-red-500 text-white" : ""
                            }`}
                          >
                            {d.getDate()}
                          </span>
                          {hasAppts && !isToday && (
                            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Desktop calendar */}
            <div className="hidden md:block">
              <div className="p-4 grid grid-cols-3 items-center gap-3">
                <div className="flex items-center gap-3 justify-self-start">
                  <button
                    onClick={goPrev}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex gap-2 text-sm font-medium">
                    <button
                      onClick={() => setCalendarViewMode("month")}
                      className={`px-3 py-1 rounded-lg ${
                        calendarViewMode === "month"
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {t("common.month") || "Month"}
                    </button>
                    <button
                      onClick={() => setCalendarViewMode("week")}
                      className={`px-3 py-1 rounded-lg ${
                        calendarViewMode === "week"
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {t("common.week") || "Week"}
                    </button>
                    <button
                      onClick={() => setCalendarViewMode("day")}
                      className={`px-3 py-1 rounded-lg ${
                        calendarViewMode === "day"
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {t("common.day") || "Day"}
                    </button>
                  </div>
                  <button
                    onClick={goNext}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="text-lg font-semibold justify-self-center">
                  {formatHeaderDate()}
                </div>

                <div className="justify-self-end" />
              </div>

              <div className="p-4 overflow-auto">
                {calendarViewMode === "day" && (
                  <table className="w-full border-collapse table-fixed">
                    <tbody>
                      {(() => {
                        const usedRows = new Map();
                        return TIME_SLOTS.map((time, timeIndex) => {
                          const dateStr = formatLocalDate(selectedDate);
                          const usedForDate =
                            usedRows.get(dateStr) || new Set();

                          // Always render the row (time column). When the slot is covered
                          // by a rowspan from a previous appointment/busy block we must
                          // render the time cell only and omit the right-hand content cell
                          // so the earlier rowspan continues to occupy the space.
                          const isCovered = usedForDate.has(timeIndex);

                          const busyBlock = getBusyBlockAtTime(time, dateStr);
                          if (busyBlock) {
                            const rowSpan = getBusyBlockRowSpan(busyBlock);
                            const isAllDay = busyBlock.start_time === null;
                            for (let i = 1; i < rowSpan; i++)
                              usedForDate.add(timeIndex + i);
                            usedRows.set(dateStr, usedForDate);
                            return (
                              <tr
                                key={time}
                                className="border-b border-gray-200"
                              >
                                <td
                                  style={{ width: "96px" }}
                                  className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50"
                                >
                                  {time}
                                </td>
                                <td
                                  rowSpan={rowSpan}
                                  className="p-0 border-l border-gray-300 w-full"
                                >
                                  <div className="relative h-full min-h-[56px] rounded-xl mx-1 my-1 px-3 py-2 text-center shadow-sm border bg-pink-50 border-pink-300 flex flex-col justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBusy(busyBlock);
                                      }}
                                      disabled={isBusySubmitting}
                                      title={t("common.delete") || "Delete"}
                                      className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white text-pink-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>

                                    <p className="font-bold text-pink-800">
                                      {getBusyLabel(busyBlock)}
                                    </p>
                                    {!isAllDay && (
                                      <p className="text-sm text-pink-600 mt-1">
                                        {busyBlock.start_time?.slice(0, 5)} -{" "}
                                        {busyBlock.end_time?.slice(0, 5)}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          const appt = getAppointmentAtTimeAndDate(
                            time,
                            dateStr,
                          );
                          if (appt) {
                            const rowSpan = getRowSpanForRaw(appt);
                            const isBreak =
                              (appt.status || "").toLowerCase() === "break";
                            const isCompleted =
                              (appt.status || "").toLowerCase() ===
                                "completed" ||
                              (appt.status || "").toLowerCase() === "done";
                            const isInProgress =
                              (appt.status || "").toLowerCase() ===
                              "in_progress";
                            const name = isBreak
                              ? t("schedule.types.busy")
                              : appt.patient?.first_name
                                ? `${appt.patient.first_name} ${
                                    appt.patient.last_name || ""
                                  }`.trim()
                                : t("common.unknown");
                            if (isCovered) {
                              // This slot is covered by a previous rowspan — render only the time cell
                              return (
                                <tr
                                  key={time}
                                  className="border-b border-gray-200"
                                >
                                  <td
                                    style={{ width: "96px" }}
                                    className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50"
                                  >
                                    {time}
                                  </td>
                                </tr>
                              );
                            }

                            for (let i = 1; i < rowSpan; i++)
                              usedForDate.add(timeIndex + i);
                            usedRows.set(dateStr, usedForDate);
                            return (
                              <tr
                                key={time}
                                className="border-b border-gray-200"
                              >
                                <td
                                  style={{ width: "96px" }}
                                  className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50"
                                >
                                  {time}
                                </td>
                                <td
                                  rowSpan={rowSpan}
                                  className="p-0 border-l border-gray-300 w-full"
                                >
                                  <div
                                    className={`relative h-full min-h-[56px] rounded-xl mx-1 my-1 px-3 py-2 text-center shadow-sm border flex flex-col justify-center ${
                                      isBreak
                                        ? "bg-pink-50 border-pink-200"
                                        : isCompleted
                                          ? "bg-emerald-50 border-emerald-200"
                                          : "bg-blue-50 border-blue-200"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const editDisabled =
                                          isSubmitting ||
                                          isCompleted ||
                                          isInProgress ||
                                          isBreak;
                                        if (editDisabled) return;
                                        openEditAppointment(appt);
                                      }}
                                      disabled={
                                        isSubmitting ||
                                        isCompleted ||
                                        isInProgress ||
                                        isBreak
                                      }
                                      title={
                                        isCompleted || isInProgress || isBreak
                                          ? t("errors.cannot_edit") ||
                                            "Cannot edit"
                                          : t("common.edit") || "Edit"
                                      }
                                      className={`absolute top-2 right-10 p-1 rounded-full bg-white/80 text-blue-600 ${
                                        isSubmitting ||
                                        isCompleted ||
                                        isInProgress ||
                                        isBreak
                                          ? "opacity-40 cursor-not-allowed"
                                          : "hover:bg-white"
                                      }`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>

                                    {!isCompleted && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAppointment(appt);
                                        }}
                                        disabled={isSubmitting}
                                        title={t("common.delete") || "Delete"}
                                        className={`absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white ${
                                          isBreak
                                            ? "text-pink-600"
                                            : "text-blue-600"
                                        }`}
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                    <div
                                      className="flex items-center justify-center gap-2 cursor-pointer"
                                      onClick={() => {
                                        if (!isBreak && !isCompleted) {
                                          navigate(
                                            `/doctor/treatment/start/${appt.id}`,
                                          );
                                        }
                                      }}
                                      title={
                                        !isBreak && !isCompleted
                                          ? t("queue.startTreatment") ||
                                            "Start treatment"
                                          : ""
                                      }
                                    >
                                      {!isBreak && !isCompleted && (
                                        <div className="p-1.5 rounded-full bg-green-100 text-green-600">
                                          <Play className="w-4 h-4" />
                                        </div>
                                      )}
                                      <div className="text-left">
                                        <p
                                          className={`font-semibold text-sm ${
                                            isBreak
                                              ? "text-pink-800"
                                              : isCompleted
                                                ? "text-emerald-800"
                                                : "text-blue-800"
                                          }`}
                                        >
                                          {name}
                                        </p>
                                        {appt.notes && (
                                          <p
                                            className="text-xs text-gray-500 truncate max-w-[120px]"
                                            title={appt.notes}
                                          >
                                            {appt.notes}
                                          </p>
                                        )}
                                        <p
                                          className={`text-xs mt-1 ${
                                            isBreak
                                              ? "text-pink-600"
                                              : isCompleted
                                                ? "text-emerald-600"
                                                : "text-blue-600"
                                          }`}
                                        >
                                          {time} - {getEndTime(appt)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          }
                          if (isCovered) {
                            // Covered slot (no content cell)
                            return (
                              <tr
                                key={time}
                                className="border-b border-gray-200"
                              >
                                <td
                                  style={{ width: "96px" }}
                                  className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50"
                                >
                                  {time}
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={time} className="border-b border-gray-200">
                              <td
                                style={{ width: "96px" }}
                                className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50"
                              >
                                {time}
                              </td>
                              <td
                                onClick={() => {
                                  setSelectedDate(
                                    formatLocalDate(new Date(selectedDate)),
                                  );
                                  setFormData((prev) => ({ ...prev, time }));
                                  setShowAddModal(true);
                                }}
                                className="p-3 relative cursor-pointer group hover:bg-blue-50/70 transition border-l border-gray-300 w-full"
                              >
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                                  <span className="group-hover:hidden">
                                    {t("treatmentsPage.empty")}
                                  </span>
                                  <div className="hidden group-hover:flex items-center gap-1 text-blue-600">
                                    <Plus className="w-4 h-4" />{" "}
                                    <span>
                                      {t("appointments.newAppointment")}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}

                {calendarViewMode === "week" && (
                  <div className="overflow-auto">
                    <table className="w-full border-collapse table-fixed">
                      <thead>
                        <tr>
                          <th
                            style={{ width: "96px" }}
                            className="bg-gray-50 border-r-2 border-gray-300 w-24"
                          ></th>
                          {weekDaysMemo.map((d) => (
                            <th
                              key={d.toISOString()}
                              className="px-4 py-3 text-center font-medium text-gray-700 border-b-2 border-gray-300"
                            >
                              <div className="text-sm font-semibold">
                                {d.toLocaleDateString(getLocale())}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatWeekdayShort(d)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const usedRows = new Map();
                          return TIME_SLOTS.map((time, ti) => {
                            return (
                              <tr
                                key={`wrow-${time}`}
                                className="border-b border-gray-200"
                              >
                                <td
                                  style={{ width: "96px" }}
                                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50"
                                >
                                  {time}
                                </td>
                                {weekDaysMemo.map((d) => {
                                  const dateStr = formatLocalDate(d);
                                  let set = usedRows.get(dateStr);
                                  if (!set) set = new Set();
                                  if (set.has(ti)) return null;

                                  const busyBlock = getBusyBlockAtTime(
                                    time,
                                    dateStr,
                                  );
                                  if (busyBlock) {
                                    const rowSpan =
                                      getBusyBlockRowSpan(busyBlock);
                                    const isAllDay =
                                      busyBlock.start_time === null;
                                    for (let i = 1; i < rowSpan; i++) {
                                      set.add(ti + i);
                                    }
                                    usedRows.set(dateStr, set);
                                    return (
                                      <td
                                        key={`${dateStr}-busy-${time}`}
                                        rowSpan={rowSpan}
                                        className="p-0 border-l border-gray-300"
                                      >
                                        <div className="relative h-full min-h-[56px] rounded-xl mx-1 my-1 px-3 py-2 text-center shadow-sm border bg-pink-50 border-pink-300 flex flex-col justify-center">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteBusy(busyBlock);
                                            }}
                                            disabled={isBusySubmitting}
                                            title={
                                              t("common.delete") || "Delete"
                                            }
                                            className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white text-pink-600"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>

                                          <p className="font-bold text-pink-800">
                                            {getBusyLabel(busyBlock)}
                                          </p>
                                          {!isAllDay && (
                                            <p className="text-sm text-pink-600 mt-1">
                                              {busyBlock.start_time?.slice(
                                                0,
                                                5,
                                              )}{" "}
                                              -{" "}
                                              {busyBlock.end_time?.slice(0, 5)}
                                            </p>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  }

                                  const appt = getAppointmentAtTimeAndDate(
                                    time,
                                    dateStr,
                                  );
                                  if (appt) {
                                    const rowSpan = getRowSpanForRaw(appt);
                                    const isBreak =
                                      (appt.status || "").toLowerCase() ===
                                      "break";
                                    const isCompleted =
                                      (appt.status || "").toLowerCase() ===
                                        "completed" ||
                                      (appt.status || "").toLowerCase() ===
                                        "done";
                                    const isInProgress =
                                      (appt.status || "").toLowerCase() ===
                                      "in_progress";
                                    for (let i = 1; i < rowSpan; i++) {
                                      set.add(ti + i);
                                    }
                                    usedRows.set(dateStr, set);
                                    return (
                                      <td
                                        key={`${dateStr}-appt-${time}`}
                                        rowSpan={rowSpan}
                                        className="p-0 border-l border-gray-300"
                                      >
                                        <div
                                          className={`relative h-full min-h-[56px] rounded-xl mx-1 my-1 px-3 py-2 text-center shadow-sm border flex flex-col justify-center ${
                                            isBreak
                                              ? "bg-pink-50 border-pink-200"
                                              : isCompleted
                                                ? "bg-emerald-50 border-emerald-200"
                                                : "bg-blue-50 border-blue-200"
                                          }`}
                                        >
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const editDisabled =
                                                isSubmitting ||
                                                isCompleted ||
                                                isInProgress ||
                                                isBreak;
                                              if (editDisabled) return;
                                              openEditAppointment(appt);
                                            }}
                                            disabled={
                                              isSubmitting ||
                                              isCompleted ||
                                              isInProgress ||
                                              isBreak
                                            }
                                            title={
                                              isCompleted ||
                                              isInProgress ||
                                              isBreak
                                                ? t("errors.cannot_edit") ||
                                                  "Cannot edit"
                                                : t("common.edit") || "Edit"
                                            }
                                            className={`absolute top-2 right-10 p-1 rounded-full bg-white/80 text-blue-600 ${
                                              isSubmitting ||
                                              isCompleted ||
                                              isInProgress ||
                                              isBreak
                                                ? "opacity-40 cursor-not-allowed"
                                                : "hover:bg-white"
                                            }`}
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </button>

                                          {!isCompleted && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteAppointment(appt);
                                              }}
                                              disabled={isSubmitting}
                                              title={
                                                t("common.delete") || "Delete"
                                              }
                                              className={`absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white ${
                                                isBreak
                                                  ? "text-pink-600"
                                                  : "text-blue-600"
                                              }`}
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          )}
                                          <div
                                            className="flex items-center justify-center gap-2 cursor-pointer"
                                            onClick={() => {
                                              if (!isBreak && !isCompleted) {
                                                navigate(
                                                  `/doctor/treatment/start/${appt.id}`,
                                                );
                                              }
                                            }}
                                            title={
                                              !isBreak && !isCompleted
                                                ? t("queue.startTreatment") ||
                                                  "Start treatment"
                                                : ""
                                            }
                                          >
                                            {!isBreak && !isCompleted && (
                                              <div className="p-1 rounded-full bg-green-100 text-green-600">
                                                <Play className="w-3 h-3" />
                                              </div>
                                            )}
                                            <div className="text-left">
                                              <p
                                                className={`font-semibold text-sm ${
                                                  isBreak
                                                    ? "text-pink-800"
                                                    : isCompleted
                                                      ? "text-emerald-800"
                                                      : "text-blue-800"
                                                }`}
                                              >
                                                {appt.patient?.first_name
                                                  ? `${appt.patient.first_name} ${
                                                      appt.patient.last_name ||
                                                      ""
                                                    }`
                                                  : t("common.unknown")}
                                              </p>
                                              {appt.notes && (
                                                <p
                                                  className="text-xs text-gray-500 truncate max-w-[80px]"
                                                  title={appt.notes}
                                                >
                                                  {appt.notes}
                                                </p>
                                              )}
                                              <p
                                                className={`text-xs ${
                                                  isBreak
                                                    ? "text-pink-600"
                                                    : isCompleted
                                                      ? "text-emerald-600"
                                                      : "text-blue-600"
                                                }`}
                                              >
                                                {time} - {getEndTime(appt)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td
                                      key={`${dateStr}-empty-${time}`}
                                      onClick={() => {
                                        setSelectedDate(formatLocalDate(d));
                                        setFormData((prev) => ({
                                          ...prev,
                                          time,
                                        }));
                                        setShowAddModal(true);
                                      }}
                                      className="p-3 relative cursor-pointer group hover:bg-blue-50/70 transition border-l border-gray-300"
                                    >
                                      <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                                        <span className="group-hover:hidden">
                                          {t("treatmentsPage.empty")}
                                        </span>
                                        <div className="hidden group-hover:flex items-center gap-1 text-blue-600">
                                          <Plus className="w-4 h-4" />{" "}
                                          <span>
                                            {t("appointments.newAppointment")}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                {calendarViewMode === "month" && (
                  <div className="grid grid-cols-7 gap-2">
                    {monthGridMemo.map((d) => {
                      const dateStr = formatLocalDate(d);
                      const apptsForDay = appointmentsRaw.filter(
                        (a) =>
                          formatLocalDate(new Date(a.appointment_date)) ===
                          dateStr,
                      );
                      return (
                        <div
                          key={dateStr}
                          className={`p-3 border rounded-lg ${
                            dateStr === formatLocalDate(new Date())
                              ? "bg-blue-50"
                              : "bg-white"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium">
                              {d.getDate()}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setShowAddModal(true);
                              }}
                              className="text-xs text-blue-600"
                            >
                              {t("appointments.newAppointment")}
                            </button>
                          </div>
                          <div className="text-xs text-gray-600">
                            {apptsForDay.slice(0, 3).map((a) => {
                              const isCompleted = [
                                "completed",
                                "done",
                              ].includes((a.status || "").toLowerCase());
                              const isBreak =
                                (a.status || "").toLowerCase() === "break";
                              return (
                                <div
                                  key={a.id}
                                  className={`mb-1 px-1 py-0.5 rounded ${!isBreak && !isCompleted ? "cursor-pointer hover:bg-blue-100" : ""}`}
                                  onClick={() => {
                                    if (!isBreak && !isCompleted) {
                                      navigate(
                                        `/doctor/treatment/start/${a.id}`,
                                      );
                                    }
                                  }}
                                  title={
                                    !isBreak && !isCompleted
                                      ? t("queue.startTreatment") ||
                                        "Start treatment"
                                      : ""
                                  }
                                >
                                  <span>
                                    {a.patient?.first_name
                                      ? `${a.patient.first_name} ${
                                          a.patient.last_name || ""
                                        }`
                                      : t("common.unknown")}
                                  </span>
                                  {a.notes && (
                                    <span
                                      className="text-gray-400 ml-1"
                                      title={a.notes}
                                    >
                                      (
                                      {a.notes.length > 10
                                        ? a.notes.slice(0, 10) + "..."
                                        : a.notes}
                                      )
                                    </span>
                                  )}
                                  <span> — {getEndTime(a)}</span>
                                </div>
                              );
                            })}
                            {apptsForDay.length > 3 && (
                              <div className="text-xs text-gray-400">
                                +{apptsForDay.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : loading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse"
            >
              <div className="space-y-4">
                <div className="h-8 w-32 bg-gray-200 rounded-lg"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-6 w-48 bg-gray-200 rounded"></div>
                  <div className="h-6 w-40 bg-gray-200 rounded"></div>
                </div>
                <div className="h-20 w-full bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <Calendar className="w-20 h-20 mx-auto mb-6 text-slate-300" />
            <p className="text-2xl font-medium text-slate-600">
              {t("noAppointments") || "Bu kunda qabul yo'q"}
            </p>
            <p className="mt-4 text-slate-500">
              {t("appointments.noAppointmentsHint")}
            </p>
          </div>
        ) : (
          appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {/* Time */}
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">
                        {t("common.time") || "Vaqt"}
                      </p>
                      <p className="text-xl font-bold text-slate-900">
                        {appt.time}
                      </p>
                    </div>
                  </div>

                  {/* Patient */}
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-500">
                        {t("common.patient") || "Bemor"}
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        {appt.patient}
                      </p>
                      {appt.notes && (
                        <p
                          className="text-sm text-slate-500 line-clamp-2"
                          title={appt.notes}
                        >
                          {appt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Services removed - not used */}
                </div>

                {/* Right: Status + Cancel */}
                <div className="flex flex-col items-center gap-3 lg:items-end">
                  <StatusBadge status={appt.status} />
                  {canCancel(appt.status) && (
                    <button
                      onClick={() => setShowCancelConfirm(appt)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition"
                      title={t("common.cancel") || "Bekor qilish"}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              {isNotStartedStatus(showCancelConfirm?.status)
                ? t("appointments.confirmDelete") || "Qabulni o'chirish"
                : t("appointments.confirmCancel") || "Qabulni bekor qilish"}
            </h3>
            <p className="text-lg text-slate-600 mb-8">
              {isNotStartedStatus(showCancelConfirm?.status)
                ? t("appointments.confirmDeleteText") ||
                  "Haqiqatan ham ushbu qabulni o'chirmoqchimisiz?"
                : t("appointments.confirmCancelText") ||
                  "Haqiqatan ham ushbu qabulni bekor qilmoqchimisiz?"}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="px-8 py-3.5 rounded-xl border border-gray-300 hover:bg-gray-50 font-medium transition"
              >
                {t("common.no") || "Yo'q"}
              </button>
              <button
                onClick={() => handleRemoveAppointment(showCancelConfirm)}
                className="px-8 py-3.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition"
              >
                {isNotStartedStatus(showCancelConfirm?.status)
                  ? t("common.yesDelete") || "Ha, o'chirish"
                  : t("common.yesCancel") || "Ha, bekor qilish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Follow-up Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {editingAppointment?.id
                    ? t("common.edit") || "Tahrirlash"
                    : t("appointments.newFollowUp") || "Takroriy qabul"}
                </h2>
                <button
                  onClick={resetAppointmentModal}
                  disabled={isSubmitting}
                  className="text-white hover:text-gray-200 transition"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleCreateAppointment}
              className="p-8 space-y-7 min-w-0"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7 min-w-0">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("patients.form.firstName") || "Ism"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => {
                      setSelectedPatientId(null);
                      setPatientSuggestEnabled(true);
                      setFormData({ ...formData, firstName: e.target.value });
                    }}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                    placeholder={t("patients.form.firstName") || "Ism"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("patients.form.lastName") || "Familiya"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => {
                      setSelectedPatientId(null);
                      setPatientSuggestEnabled(true);
                      setFormData({ ...formData, lastName: e.target.value });
                    }}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                    placeholder={t("patients.form.lastName") || "Familiya"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-7 min-w-0">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("patients.form.phone") || "Telefon"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setSelectedPatientId(null);
                        setPatientSuggestEnabled(true);
                        setFormData({
                          ...formData,
                          phone: extractUzLocalDigits(e.target.value),
                        });
                      }}
                      disabled={isSubmitting}
                      className="w-full pl-16 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                      placeholder="__ ___ __ __"
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={9}
                    />

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 select-none">
                      +998
                    </span>

                    <PatientSuggest
                      token={token}
                      disabled={isSubmitting || !patientSuggestEnabled}
                      t={t}
                      query={`${formData.firstName} ${
                        formData.lastName
                      } ${toUzPhone(formData.phone)}`}
                      onSelect={(p) => {
                        setSelectedPatientId(p.id);
                        setPatientSuggestEnabled(false);
                        setFormData((prev) => ({
                          ...prev,
                          firstName: p.firstName,
                          lastName: p.lastName,
                          phone: extractUzLocalDigits(p.phone),
                          birthDate: p.birthDate || prev.birthDate,
                          address: p.address || prev.address,
                        }));
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t("patients.form.birthDate") || "Tug'ilgan sana"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="w-full px-2 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("patients.form.address") || "Manzil"}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder={t("patients.form.address") || "Manzil"}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("common.notes") || "Izoh"}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                  placeholder={t("common.notes") || "Izoh (ixtiyoriy)"}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("common.time") || "Vaqt"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="w-full px-2 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("schedule.duration") || "Davomiyligi"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration: Number(e.target.value),
                    })
                  }
                  disabled={isSubmitting}
                  className="w-full px-2 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                >
                  <option value={30}>
                    30 {t("common.minutes") || "minut"}
                  </option>
                  <option value={45}>
                    45 {t("common.minutes") || "minut"}
                  </option>
                  <option value={60}>1 {t("common.hour") || "soat"}</option>
                  <option value={90}>1.5 {t("common.hour") || "soat"}</option>
                  <option value={120}>2 {t("common.hour") || "soat"}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("treatment.plan") || "Davolash rejasi"}
                </label>
                <select
                  value={formData.treatmentPlanId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      treatmentPlanId: e.target.value,
                    })
                  }
                  disabled={
                    isSubmitting ||
                    createNewPlan ||
                    !selectedPatientId ||
                    loadingPlans
                  }
                  className="w-full px-2 py-2 rounded-xl border border-gray-300 bg-white text-gray-900 appearance-none focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50"
                >
                  <option value="">
                    {loadingPlans
                      ? t("common.loading") || "Yuklanmoqda..."
                      : t("treatment.planNone") || "Reja tanlanmagan"}
                  </option>
                  {treatmentPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.title || `#${plan.id}`}
                    </option>
                  ))}
                </select>
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={createNewPlan}
                    onChange={(e) => {
                      setCreateNewPlan(e.target.checked);
                      if (e.target.checked) {
                        setFormData((prev) => ({
                          ...prev,
                          treatmentPlanId: "",
                        }));
                      }
                    }}
                    disabled={isSubmitting || !selectedPatientId}
                  />
                  {t("treatment.planCreate") ||
                    "Yangi davolash rejasi yaratish"}
                </label>
              </div>

              <div className="flex justify-end gap-5 pt-6">
                <button
                  type="button"
                  onClick={resetAppointmentModal}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {t("common.cancel") || "Bekor qilish"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-3 min-w-[160px] transition ${
                    isSubmitting
                      ? "bg-blue-400 text-white cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-6 h-6 animate-spin" />}
                  {isSubmitting
                    ? t("common.saving") || "Saqlanmoqda..."
                    : t("common.save") || "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Busy / Block Time Modal */}
      {showBusyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-hidden">
            <div className="bg-gradient-to-r from-pink-600 to-pink-700 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {t("schedule.addBusy") || "Mark Busy"}
                </h2>
                <button
                  onClick={() => setShowBusyModal(false)}
                  disabled={isBusySubmitting}
                  className="text-white hover:text-gray-200 transition"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateBusy} className="p-6 space-y-4 min-w-0">
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={busyForm.allDay}
                    onChange={(e) =>
                      setBusyForm((p) => ({ ...p, allDay: e.target.checked }))
                    }
                  />
                  <span className="text-sm">
                    {t("schedule.allDay") || "All day"}
                  </span>
                </label>
              </div>

              {!busyForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      {t("schedule.startTime") || "Start"}
                    </label>
                    <input
                      type="time"
                      value={busyForm.startTime}
                      onChange={(e) =>
                        setBusyForm((p) => ({
                          ...p,
                          startTime: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      {t("schedule.endTime") || "End"}
                    </label>
                    <input
                      type="time"
                      value={busyForm.endTime}
                      onChange={(e) =>
                        setBusyForm((p) => ({ ...p, endTime: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-gray-300"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  {t("schedule.type") || "Type"}
                </label>
                <select
                  value={busyForm.type}
                  onChange={(e) =>
                    setBusyForm((p) => ({ ...p, type: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                >
                  <option value="busy">{t("schedule.types.busy")}</option>
                  <option value="lunch">{t("schedule.types.lunch")}</option>
                  <option value="meeting">{t("schedule.types.meeting")}</option>
                  <option value="off">{t("schedule.types.off")}</option>
                  <option value="holiday">{t("schedule.types.holiday")}</option>
                  <option value="sick">{t("schedule.types.sick")}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  {t("common.reason") || "Reason"}
                </label>
                <input
                  type="text"
                  value={busyForm.reason}
                  onChange={(e) =>
                    setBusyForm((p) => ({ ...p, reason: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBusyModal(false)}
                  className="px-5 py-2 rounded-xl border border-gray-300"
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isBusySubmitting}
                  className="px-5 py-2 rounded-xl bg-pink-600 text-white"
                >
                  {isBusySubmitting
                    ? t("common.saving") || "Saving..."
                    : t("common.save") || "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
