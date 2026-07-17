import { useEffect, useState } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { apiClient } from "../../api/client.js";
import { useAuth } from "../../features/auth/useAuth";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { PatientSuggest } from "../shared/PatientSuggest.jsx";
import { extractUzLocalDigits, toUzPhone } from "../../utils/uzPhone.js";

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 20) TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
}

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function ScheduleCalendar() {
  const { t } = useLanguage();
  const { token } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBusyModal, setShowBusyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const [editingAppointment, setEditingAppointment] = useState(null);
  const [patientSuggestEnabled, setPatientSuggestEnabled] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    birthDate: "",
    address: "",
    notes: "",
    doctorId: "",
    time: "",
    duration: 30,
    treatmentPlanId: "",
  });

  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [createNewPlan, setCreateNewPlan] = useState(false);

  useEffect(() => {
    if (!showAddModal) return;
    if (!editingAppointment?.id) setPatientSuggestEnabled(true);
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

  const weekDaysShort = t("schedule.daysShort", { returnObjects: true }) || [
    "Du",
    "Se",
    "Ch",
    "Pa",
    "Ju",
    "Sh",
    "Ya",
  ];

  const [busyForm, setBusyForm] = useState({
    doctorId: "",
    allDay: false,
    startTime: "",
    endTime: "",
    type: "busy",
    reason: "",
  });

  const formatHeaderDate = () => {
    const lang = localStorage.getItem("lang") || "uz";
    const localeMap = { uz: "uz-UZ", uz_cyr: "uz-Cyrl-UZ", uz_new: "uz-UZ", ru: "ru-RU", en: "en-US" };
    const locale = localeMap[lang] || "uz-UZ";

    if (viewMode === "day") {
      const str = selectedDate.toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    if (viewMode === "week") {
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - start.getDay() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const startStr = start.getDate();
      const endStr = end.getDate();
      const monthYear = selectedDate.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      });
      return `${startStr} - ${endStr} ${monthYear}`;
    }

    return selectedDate.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  };

  const headerDate = formatHeaderDate();

  const goPrev = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const goNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const goPrevMobile = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    else newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goNextMobile = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    else newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  useEffect(() => {
    if (!token) return;

    const loadDoctors = async () => {
      try {
        const data = await apiClient("/admin/users", { token });
        const doctorsOnly = Array.isArray(data)
          ? data.filter((u) => u.role === "doctor")
          : [];
        const doctorList = doctorsOnly.map((d) => ({
          id: d.id,
          name: d.full_name || t("common.doctor"),
        }));
        setDoctors(doctorList);

        if (doctorList.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(doctorList[0].id.toString());
        }
      } catch (err) {
        console.error("Doctors load error:", err);
      }
    };

    loadDoctors();
  }, [token, t, selectedDoctorId]);

  useEffect(() => {
    if (!token || doctors.length === 0) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        let datesToFetch = [];

        if (viewMode === "day") {
          datesToFetch = [selectedDate];
        } else if (viewMode === "week") {
          const start = new Date(selectedDate);
          start.setDate(start.getDate() - start.getDay() + 1);
          for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(day.getDate() + i);
            datesToFetch.push(day);
          }
        } else {
          const year = selectedDate.getFullYear();
          const month = selectedDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const startDate = new Date(firstDay);
          startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

          let current = new Date(startDate);
          while (datesToFetch.length < 42) {
            datesToFetch.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
        }

        const apptPromises = datesToFetch.map((day) =>
          apiClient(`/appointments?date=${formatLocalDate(day)}`, { token }),
        );
        const schedPromises = datesToFetch.map((day) =>
          apiClient(`/doctor-schedules?date=${formatLocalDate(day)}`, {
            token,
          }),
        );

        const [apptResults, schedResults] = await Promise.all([
          Promise.all(apptPromises),
          Promise.all(schedPromises),
        ]);

        const allAppts = apptResults.flat();
        const activeAppts = allAppts.filter((a) => {
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
        setAppointments(activeAppts);

        const allSchedules = schedResults.flat();
        setSchedules(Array.isArray(allSchedules) ? allSchedules : []);
      } catch (err) {
        console.error("Load data error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate, token, doctors.length, viewMode]);

  const getEndTime = (appt) => {
    const start = new Date(appt.appointment_date);
    const end = new Date(start.getTime() + (appt.duration || 30) * 60000);
    return end.toTimeString().slice(0, 5);
  };

  const getAppointmentAtTimeAndDate = (time, dateStr, doctorId) => {
    return appointments.find((appt) => {
      const apptDoctorId = appt.doctor_id || appt.doctor?.id;
      const apptDate = new Date(appt.appointment_date);
      const apptDateStr = formatLocalDate(apptDate);

      if (apptDateStr !== dateStr) return false;
      if (doctorId && apptDoctorId != doctorId) return false;

      const [slotHour, slotMin] = time.split(":").map(Number);
      const slotMinutes = slotHour * 60 + slotMin;
      const slotEndMinutes = slotMinutes + 30;

      const apptStartMinutes = apptDate.getHours() * 60 + apptDate.getMinutes();

      return (
        apptStartMinutes >= slotMinutes && apptStartMinutes < slotEndMinutes
      );
    });
  };

  const getRowSpan = (appt) => {
    const duration = appt.duration || 30;
    const apptDate = new Date(appt.appointment_date);
    const startMinute = apptDate.getMinutes();
    const minutesIntoFirstSlot = startMinute % 30;
    const totalMinutes = duration + minutesIntoFirstSlot;
    return Math.ceil(totalMinutes / 30);
  };

  const getBusyBlockAtTime = (time, doctorId, dateStr) => {
    return schedules.find((sched) => {
      if (sched.doctor_id !== doctorId) return false;
      const schedDate =
        sched.date || formatLocalDate(new Date(sched.created_at || Date.now()));
      if (schedDate !== dateStr) return false;
      if (sched.start_time === null) return true;
      const start = sched.start_time.slice(0, 5);
      return time === start;
    });
  };

  const getBusyBlockRowSpan = (busyBlock) => {
    if (busyBlock.start_time === null) {
      return TIME_SLOTS.length;
    }

    const start = busyBlock.start_time.slice(0, 5);
    const end = busyBlock.end_time ? busyBlock.end_time.slice(0, 5) : start;

    const [startHour, startMin] = start.split(":").map(Number);
    const [endHour, endMin] = end.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const durationMinutes = endMinutes - startMinutes;

    return Math.max(1, Math.ceil(durationMinutes / 30));
  };

  const getBusyLabel = (busyBlock) => {
    if (!busyBlock) return "";
    const reason = busyBlock.reason;
    if (reason && reason.toString().trim()) return reason.toString();
    const type = busyBlock.type ? busyBlock.type.toString() : "busy";
    const key = `schedule.types.${type}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return type.toUpperCase();
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay() + 1);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthGrid = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
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

  // Tracks which time slot rows are already covered by rowSpan in week view
  // Map keyed by date string -> Set of time slot indices covered for that day
  const usedRows = new Map();

  const handleTimeSlotClick = (time, doctorId, date = selectedDate) => {
    const dateStr = formatLocalDate(date);
    const busyBlock = getBusyBlockAtTime(time, doctorId, dateStr);
    if (busyBlock) {
      alert(t("errors.doctor_busy"));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      doctorId: doctorId.toString(),
      time,
    }));
    setSelectedDate(date);
    setEditingAppointment(null);
    setSelectedPatientId(null);
    setPatientSuggestEnabled(true);
    setCreateNewPlan(false);
    setShowAddModal(true);
  };

  const openEditAppointment = (appt) => {
    if (!appt || !appt.id) return;

    const apptDate = new Date(appt.appointment_date);
    const time = apptDate.toTimeString().slice(0, 5);

    setEditingAppointment(appt);
    setPatientSuggestEnabled(false);
    setSelectedDate(apptDate);
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
      doctorId: String(appt.doctor_id ?? appt.doctor?.id ?? ""),
      time,
      duration: appt.duration || 30,
      treatmentPlanId: String(
        appt.treatment_plan_id ?? appt.treatmentPlan?.id ?? "",
      ),
    });

    setModalError("");
    setShowAddModal(true);
  };

  const resetAppointmentModal = () => {
    setShowAddModal(false);
    setEditingAppointment(null);
    setSelectedPatientId(null);
    setPatientSuggestEnabled(true);
    setModalError("");
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      birthDate: "",
      address: "",
      notes: "",
      doctorId: "",
      time: "",
      duration: 30,
      treatmentPlanId: "",
    });
    setCreateNewPlan(false);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const required = [
      "firstName",
      "lastName",
      "phone",
      "birthDate",
      "doctorId",
      "time",
    ];
    const missing = required.find((f) => !formData[f]?.trim());
    if (missing) {
      setModalError(
        t("errors.fillAllFields") || "Barcha majburiy maydonlarni to'ldiring",
      );
      return;
    }

    setIsSubmitting(true);
    setModalError("");

    try {
      let patientId = selectedPatientId;
      const fullPhone = toUzPhone(formData.phone);
      if (!patientId) {
        const searchRes = await apiClient(
          `/patients?phone=${encodeURIComponent(fullPhone)}`,
          { token },
        );
        const existing = Array.isArray(searchRes) ? searchRes : [];
        if (existing.length > 0) {
          patientId = existing[0].id;
        } else {
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

      const appointmentDateTime = `${formatLocalDate(selectedDate)}T${formData.time}:00`;
      let planId = formData.treatmentPlanId || "";

      if (createNewPlan) {
        const planTitle =
          `${formData.firstName.trim()} ${formData.lastName.trim()} - ${formatLocalDate(selectedDate)}`.trim();
        const plan = await apiClient("/treatment-plans", {
          method: "POST",
          token,
          body: {
            patient_id: Number(patientId),
            doctor_id: Number(formData.doctorId) || null,
            title: planTitle || null,
          },
        });
        planId = plan?.id ? String(plan.id) : "";
      }

      const payload = {
        patient_id: Number(patientId),
        doctor_id: Number(formData.doctorId),
        appointment_date: new Date(appointmentDateTime).toISOString(),
        duration: Number(formData.duration),
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
        setAppointments((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a)),
        );
      } else {
        const created = await apiClient("/appointments", {
          method: "POST",
          token,
          body: payload,
        });
        if (created?.id) setAppointments((prev) => [...prev, created]);
      }

      setSelectedDate(new Date(selectedDate));

      resetAppointmentModal();
    } catch (err) {
      let errorMessage =
        err.message ||
        (editingAppointment?.id
          ? t("errors.updateFailed") || "Qabulni tahrirlashda xato"
          : t("errors.createFailed") || "Qabul qo'shishda xato");
      setModalError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete appointment by id (with confirmation)
  const handleDeleteAppointment = async (appt) => {
    if (!appt || !appt.id) return;
    const confirmMsg =
      t("schedule.busy.confirmDelete") || "Are you sure you want to delete?";
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      await apiClient(`/appointments/${appt.id}`, {
        method: "DELETE",
        token,
      });

      // Optimistically remove from local state
      setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
    } catch (err) {
      alert(err.message || t("errors.deleteFailed") || "Delete failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBusyTime = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const docIdStr = String(busyForm.doctorId ?? "");
    if (!docIdStr || docIdStr.trim() === "") {
      setModalError(t("common.selectDoctor") || "Doktor tanlang");
      return;
    }

    setIsSubmitting(true);
    setModalError("");

    try {
      const body = {
        doctor_id: Number(busyForm.doctorId),
        date: formatLocalDate(selectedDate),
        type: busyForm.type || "busy",
        reason: busyForm.reason ? busyForm.reason.trim() : "",
      };

      if (busyForm.allDay) {
        body.start_time = null;
        body.end_time = null;
      } else {
        if (!busyForm.startTime || !busyForm.endTime) {
          setModalError(
            t("schedule.busy.enterTimes") ||
              "Boshlanish va tugash vaqtini kiriting",
          );
          setIsSubmitting(false);
          return;
        }
        body.start_time = busyForm.startTime;
        body.end_time = busyForm.endTime;
      }

      await apiClient("/doctor-schedules", {
        method: "POST",
        token,
        body,
      });

      const dateStr = formatLocalDate(selectedDate);
      const schedRes = await apiClient(`/doctor-schedules?date=${dateStr}`, {
        token,
      });
      setSchedules(Array.isArray(schedRes) ? schedRes : []);

      setShowBusyModal(false);
      setBusyForm({
        doctorId: "",
        allDay: false,
        startTime: "",
        endTime: "",
        type: "busy",
        reason: "",
      });
    } catch (err) {
      console.error("Busy time error:", err);
      setModalError(
        err.message ||
          t("errors.busyCreateFailed") ||
          "Band vaqt qo'shishda xato yuz berdi",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBusy = async (busyBlock) => {
    if (!busyBlock || !busyBlock.id) return;
    const confirmMsg =
      t("schedule.busy.confirmDelete") || "Are you sure you want to delete?";
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    try {
      await apiClient(`/doctor-schedules/${busyBlock.id}`, {
        method: "DELETE",
        token,
      });

      // Optimistically remove from local state
      setSchedules((prev) => prev.filter((s) => s.id !== busyBlock.id));
    } catch (err) {
      console.error("Delete busy block error:", err);
      alert(err.message || t("errors.deleteFailed") || "Delete failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to check if a slot is covered by previous appointment/busy block
  const isCoveredByPrevious = (timeIndex, doctorId, dateStr) => {
    const [currentHour, currentMin] = TIME_SLOTS[timeIndex]
      .split(":")
      .map(Number);
    const currentSlotMinutes = currentHour * 60 + currentMin;

    // Check previous time slots for appointments
    for (let i = 0; i < timeIndex; i++) {
      const prevTime = TIME_SLOTS[i];
      const prevAppt = getAppointmentAtTimeAndDate(prevTime, dateStr, doctorId);

      if (prevAppt) {
        const apptDate = new Date(prevAppt.appointment_date);
        const apptStartMinutes =
          apptDate.getHours() * 60 + apptDate.getMinutes();
        const apptEndMinutes = apptStartMinutes + (prevAppt.duration || 30);

        if (
          currentSlotMinutes >= apptStartMinutes &&
          currentSlotMinutes < apptEndMinutes
        ) {
          return true;
        }
      }

      // Check busy blocks
      const prevBusy = getBusyBlockAtTime(prevTime, doctorId, dateStr);
      if (prevBusy) {
        if (prevBusy.start_time === null) {
          return true; // All day busy
        }

        const [startH, startM] = prevBusy.start_time
          .slice(0, 5)
          .split(":")
          .map(Number);
        const [endH, endM] = prevBusy.end_time
          ? prevBusy.end_time.slice(0, 5).split(":").map(Number)
          : [startH, startM];

        const busyStartMinutes = startH * 60 + startM;
        const busyEndMinutes = endH * 60 + endM;

        if (
          currentSlotMinutes >= busyStartMinutes &&
          currentSlotMinutes < busyEndMinutes
        ) {
          return true;
        }
      }
    }

    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile iPhone-style calendar */}
      <div className="md:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={goPrevMobile}
            className="p-2 -ml-2 rounded-full active:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6 text-blue-500" />
          </button>
          <div className="text-base font-semibold text-gray-900">
            {(() => {
              const lang = localStorage.getItem("lang") || "uz";
              const localeMap = { uz: "uz-UZ", uz_cyr: "uz-Cyrl-UZ", uz_new: "uz-UZ", ru: "ru-RU", en: "en-US" };
              return selectedDate.toLocaleDateString(localeMap[lang] || "uz-UZ", {
                month: "long",
                year: "numeric",
              });
            })()}
          </div>
          <button
            onClick={goNextMobile}
            className="p-2 -mr-2 rounded-full active:bg-gray-100"
          >
            <ChevronRight className="w-6 h-6 text-blue-500" />
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="grid grid-cols-7 gap-1">
            {getWeekDays().map((day) => {
              const isSelected =
                day.toDateString() === selectedDate.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setViewMode("day");
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-full py-2 text-sm transition-all active:scale-95 ${
                    isSelected
                      ? "bg-red-500 text-white"
                      : isToday
                        ? "bg-red-100 text-red-600"
                        : "text-gray-800"
                  }`}
                >
                  <span className="text-xs font-medium">
                    {weekDaysShort[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                  </span>
                  <span className="text-base font-semibold">
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pb-3">
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("common.selectDoctor")}</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setViewMode("day")}
              className={`py-2 rounded-lg text-sm font-semibold ${
                viewMode === "day"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600"
              }`}
            >
              {t("common.day") || "Day"}
            </button>
            <button
              onClick={() => setViewMode("month")}
              className={`py-2 rounded-lg text-sm font-semibold ${
                viewMode === "month"
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600"
              }`}
            >
              {t("common.month") || "Month"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile day timeline */}
      {viewMode === "day" && (
        <div className="md:hidden p-4 space-y-3">
          {loading ? (
            <div className="py-10 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            </div>
          ) : (
            TIME_SLOTS.map((time, timeIndex) => {
              const doctorId = selectedDoctorId || doctors[0]?.id;
              if (!doctorId) return null;

              const dateStr = formatLocalDate(selectedDate);
              if (isCoveredByPrevious(timeIndex, doctorId, dateStr))
                return null;

              const busyBlock = getBusyBlockAtTime(time, doctorId, dateStr);
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
                      disabled={isSubmitting}
                      className="p-1 rounded-full bg-white/80 text-pink-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              const appt = getAppointmentAtTimeAndDate(time, dateStr, doctorId);
              if (appt) {
                const apptDate = new Date(appt.appointment_date);
                const apptTime = apptDate.toTimeString().slice(0, 5);
                const isBreak = (appt.status || "").toLowerCase() === "break";
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
                      {!isCompleted && !isBreak && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAppointment(appt);
                          }}
                          title={t("common.delete") || "Delete"}
                          className="p-1.5 rounded-full bg-white/80 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {!editDisabled && (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={time}
                  type="button"
                  onClick={() =>
                    handleTimeSlotClick(time, doctorId, selectedDate)
                  }
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

      {/* Mobile month view */}
      {viewMode === "month" && (
        <div className="md:hidden p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {weekDaysShort.map((dayName) => (
                <div
                  key={dayName}
                  className="p-2 text-center text-xs font-semibold text-gray-500"
                >
                  {dayName}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100">
              {getMonthGrid().map((day) => {
                const isCurrentMonth =
                  day.getMonth() === selectedDate.getMonth();
                const isToday =
                  day.toDateString() === new Date().toDateString();
                const dateStr = formatLocalDate(day);
                const hasAppts = appointments.some((a) => {
                  const apptDate = new Date(a.appointment_date);
                  return formatLocalDate(apptDate) === dateStr;
                });

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day);
                      setViewMode("day");
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
                      {day.getDate()}
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

      {/* Desktop header */}
      <div className="hidden md:block bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={goPrev}
              className="p-2 rounded-lg hover:bg-white/20 transition"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex gap-4 text-sm font-medium">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === "month" ? "bg-white/30" : "hover:bg-white/20"
                }`}
              >
                {t("common.month")}
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === "week" ? "bg-white/30" : "hover:bg-white/20"
                }`}
              >
                {t("common.week")}
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === "day" ? "bg-white/30" : "hover:bg-white/20"
                }`}
              >
                {t("common.day")}
              </button>
            </div>

            <button
              onClick={goNext}
              className="p-2 rounded-lg hover:bg-white/20 transition"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="text-xl font-bold">{headerDate}</div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-400 hover:bg-blue-300 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              {t("common.add")}
            </button>

            <button
              onClick={() => setShowBusyModal(true)}
              className="bg-orange-500 hover:bg-orange-400 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              {t("schedule.addBusy")}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        {viewMode === "day" && (
          <div className="p-6 overflow-x-auto">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full border-collapse table-fixed">
                <thead>
                  <tr>
                    <th
                      style={{ width: "96px" }}
                      className="bg-gray-50 border-r-2 border-gray-300 w-24"
                    ></th>
                    {doctors.map((doctor) => (
                      <th
                        key={doctor.id}
                        style={{
                          width:
                            doctors.length > 0
                              ? `calc((100% - 96px) / ${doctors.length})`
                              : "auto",
                        }}
                        className="px-6 py-4 text-center font-medium text-gray-700 border-b-2 border-gray-300"
                      >
                        {doctor.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={doctors.length + 1}
                        className="text-center py-40"
                      >
                        <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
                      </td>
                    </tr>
                  ) : (
                    TIME_SLOTS.map((time, timeIndex) => {
                      const dateStr = formatLocalDate(selectedDate);

                      return (
                        <tr key={time} className="border-b border-gray-200">
                          <td
                            style={{ width: "96px" }}
                            className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 border-r-2 border-gray-300"
                          >
                            {time}
                          </td>
                          {doctors.map((doctor) => {
                            // Skip if this slot is covered by a previous appointment or busy block
                            if (
                              isCoveredByPrevious(timeIndex, doctor.id, dateStr)
                            ) {
                              return null;
                            }

                            // Check for busy block
                            const busyBlock = getBusyBlockAtTime(
                              time,
                              doctor.id,
                              dateStr,
                            );
                            if (busyBlock) {
                              const rowSpan = getBusyBlockRowSpan(busyBlock);
                              const isAllDay = busyBlock.start_time === null;

                              return (
                                <td
                                  key={doctor.id}
                                  rowSpan={rowSpan}
                                  className="p-0 border-l border-gray-300"
                                >
                                  <div className="relative h-full min-h-20 rounded-xl mx-2 my-1 px-4 py-3 text-center shadow-sm border bg-pink-50 border-pink-300 flex flex-col justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBusy(busyBlock);
                                      }}
                                      disabled={isSubmitting}
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
                              );
                            }

                            // Check for appointment starting at this time
                            const appt = getAppointmentAtTimeAndDate(
                              time,
                              dateStr,
                              doctor.id,
                            );
                            if (appt) {
                              const rowSpan = getRowSpan(appt);
                              const isBreak =
                                (appt.status || "").toLowerCase() === "break";
                              const isCompleted =
                                (appt.status || "").toLowerCase() ===
                                  "completed" ||
                                (appt.status || "").toLowerCase() === "done";
                              const isInProgress =
                                (appt.status || "").toLowerCase() ===
                                "in_progress";
                              const editDisabled =
                                isSubmitting ||
                                isCompleted ||
                                isInProgress ||
                                isBreak;
                              const name = isBreak
                                ? t("schedule.types.busy")
                                : `${appt.patient?.first_name || ""} ${
                                    appt.patient?.last_name || ""
                                  }`.trim() || t("common.unknown");

                              return (
                                <td
                                  key={doctor.id}
                                  rowSpan={rowSpan}
                                  className="p-0 border-l border-gray-300"
                                >
                                  <div
                                    className={`relative h-full min-h-20 rounded-xl mx-2 my-1 px-4 pt-10 pb-3 text-center shadow-sm border flex flex-col justify-center ${
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
                                        if (editDisabled) return;
                                        openEditAppointment(appt);
                                      }}
                                      disabled={editDisabled}
                                      title={
                                        editDisabled
                                          ? t("errors.cannot_edit") ||
                                            "Cannot edit"
                                          : t("common.edit") || "Edit"
                                      }
                                      className={`absolute top-2 right-10 p-1 rounded-full bg-white/80 text-blue-600 ${
                                        editDisabled
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
                                    {!isBreak && appt.notes && (
                                      <p
                                        className={`text-xs mt-1 truncate ${
                                          isCompleted
                                            ? "text-emerald-600"
                                            : "text-blue-600"
                                        }`}
                                        title={appt.notes}
                                      >
                                        {appt.notes}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Empty slot
                            return (
                              <td
                                key={doctor.id}
                                onClick={() =>
                                  handleTimeSlotClick(
                                    time,
                                    doctor.id,
                                    selectedDate,
                                  )
                                }
                                className="p-3 relative cursor-pointer group hover:bg-blue-50/70 transition border-l border-gray-300"
                              >
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                                  <span className="group-hover:hidden">
                                    {t("treatmentsPage.empty")}
                                  </span>
                                  <div className="hidden group-hover:flex items-center gap-1 text-blue-600">
                                    <Plus className="w-4 h-4" />
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="p-6">
            <div className="mb-6 flex justify-end">
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="px-6 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t("common.selectDoctor")}</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse table-fixed">
                <thead>
                  <tr>
                    <th
                      style={{ width: "96px" }}
                      className="bg-gray-50 border-r-2 border-gray-300 w-24"
                    ></th>
                    {getWeekDays().map((day) => (
                      <th
                        key={day.toISOString()}
                        style={{
                          width:
                            getWeekDays().length > 0
                              ? `calc((100% - 96px) / ${getWeekDays().length})`
                              : "auto",
                        }}
                        className="px-6 py-4 text-center font-medium text-gray-700 border-b-2 border-gray-300"
                      >
                        <div className="text-sm">
                          {
                            weekDaysShort[
                              day.getDay() === 0 ? 6 : day.getDay() - 1
                            ]
                          }
                        </div>
                        <div className="text-xl font-bold">{day.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-40">
                        <Loader2 className="w-16 h-16 animate-spin mx-auto text-blue-600" />
                      </td>
                    </tr>
                  ) : (
                    TIME_SLOTS.map((time, timeIndex) => {
                      const weekDays = getWeekDays();

                      // Note: we track covered rows per-day below, do not skip entire row here

                      return (
                        <tr key={time} className="border-b border-gray-200">
                          <td
                            style={{ width: "96px" }}
                            className="px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 border-r-2 border-gray-300"
                          >
                            {time}
                          </td>

                          {weekDays.map((day) => {
                            const dateStr = formatLocalDate(day);

                            // If this specific day already has this timeslot covered by a rowspan, skip cell
                            const dayUsed = usedRows.get(dateStr);
                            if (dayUsed && dayUsed.has(timeIndex)) return null;

                            // Check if slot is covered by previous appointment start times
                            let isCovered = false;
                            for (let i = 0; i < timeIndex; i++) {
                              const prevTime = TIME_SLOTS[i];
                              const prevAppt = getAppointmentAtTimeAndDate(
                                prevTime,
                                dateStr,
                                selectedDoctorId,
                              );
                              if (prevAppt) {
                                const apptStartMinutes =
                                  new Date(
                                    prevAppt.appointment_date,
                                  ).getHours() *
                                    60 +
                                  new Date(
                                    prevAppt.appointment_date,
                                  ).getMinutes();
                                const apptEndMinutes =
                                  apptStartMinutes + (prevAppt.duration || 30);
                                const currentMinutes =
                                  time.split(":").map(Number)[0] * 60 +
                                  time.split(":").map(Number)[1];
                                if (
                                  currentMinutes >= apptStartMinutes &&
                                  currentMinutes < apptEndMinutes
                                ) {
                                  isCovered = true;
                                  break;
                                }
                              }
                            }
                            if (isCovered) return null;

                            // First: busy block (doctor_schedule)
                            const busyBlock = schedules.find((s) => {
                              if (s.doctor_id != selectedDoctorId) return false;
                              // ensure schedule is for this day
                              const schedDate =
                                s.date ||
                                formatLocalDate(
                                  new Date(s.created_at || Date.now()),
                                );
                              if (schedDate !== dateStr) return false;
                              if (s.start_time === null) return true; // all-day for this date
                              const start = s.start_time.slice(0, 5);
                              return time === start;
                            });

                            if (busyBlock) {
                              const isAllDay = busyBlock.start_time === null;
                              const rowSpan = isAllDay
                                ? TIME_SLOTS.length
                                : getBusyBlockRowSpan(busyBlock);

                              // Mark covered rows for this date
                              for (let i = 0; i < rowSpan; i++) {
                                if (timeIndex + i < TIME_SLOTS.length) {
                                  const key = dateStr;
                                  let set = usedRows.get(key);
                                  if (!set) {
                                    set = new Set();
                                    usedRows.set(key, set);
                                  }
                                  set.add(timeIndex + i);
                                }
                              }

                              return (
                                <td
                                  key={day.toISOString()}
                                  rowSpan={rowSpan}
                                  className="p-0 border-l border-gray-300"
                                >
                                  <div className="relative h-full min-h-20 rounded-xl mx-2 my-1 px-4 py-3 text-center shadow-sm border bg-pink-50 border-pink-300 flex flex-col justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBusy(busyBlock);
                                      }}
                                      disabled={isSubmitting}
                                      title={t("common.delete") || "Delete"}
                                      className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white text-pink-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>

                                    <p className="font-semibold text-sm text-pink-800">
                                      {getBusyLabel(busyBlock)}
                                    </p>
                                    {!isAllDay && (
                                      <p className="text-xs text-pink-600 mt-1">
                                        {time} -{" "}
                                        {busyBlock.end_time?.slice(0, 5) ||
                                          time}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Then: normal appointment
                            const appt = getAppointmentAtTimeAndDate(
                              time,
                              dateStr,
                              selectedDoctorId,
                            );

                            if (appt) {
                              const rowSpan = getRowSpan(appt);
                              const isBreak =
                                (appt.status || "").toLowerCase() === "break";
                              const isCompleted =
                                (appt.status || "").toLowerCase() ===
                                  "completed" ||
                                (appt.status || "").toLowerCase() === "done";
                              const isInProgress =
                                (appt.status || "").toLowerCase() ===
                                "in_progress";
                              const editDisabled =
                                isSubmitting ||
                                isCompleted ||
                                isInProgress ||
                                isBreak;
                              for (let i = 0; i < rowSpan; i++) {
                                if (timeIndex + i < TIME_SLOTS.length) {
                                  const key = dateStr;
                                  let set = usedRows.get(key);
                                  if (!set) {
                                    set = new Set();
                                    usedRows.set(key, set);
                                  }
                                  set.add(timeIndex + i);
                                }
                              }

                              const name =
                                `${appt.patient?.first_name || ""} ${
                                  appt.patient?.last_name || ""
                                }`.trim() || "Noma'lum";

                              return (
                                <td
                                  key={day.toISOString()}
                                  rowSpan={rowSpan}
                                  className="p-0 border-l border-gray-300"
                                >
                                  <div className="relative h-full min-h-20 rounded-xl mx-2 my-1 px-4 pt-10 pb-3 text-center shadow-sm border bg-blue-50 border-blue-200 flex flex-col justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (editDisabled) return;
                                        openEditAppointment(appt);
                                      }}
                                      disabled={editDisabled}
                                      title={
                                        editDisabled
                                          ? t("errors.cannot_edit") ||
                                            "Cannot edit"
                                          : t("common.edit") || "Edit"
                                      }
                                      className={`absolute top-2 right-10 p-1 rounded-full bg-white/80 text-blue-600 ${
                                        editDisabled
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
                                        className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white text-blue-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                    <p className="font-semibold text-sm text-blue-800">
                                      {name}
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      {time} - {getEndTime(appt)}
                                    </p>
                                    {appt.notes && (
                                      <p
                                        className="text-xs text-blue-600 mt-1 truncate"
                                        title={appt.notes}
                                      >
                                        {appt.notes}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Free slot
                            return (
                              <td
                                key={day.toISOString()}
                                onClick={() =>
                                  handleTimeSlotClick(
                                    time,
                                    selectedDoctorId || doctors[0]?.id,
                                    day,
                                  )
                                }
                                className="p-3 relative cursor-pointer group hover:bg-blue-50/70 transition border-l border-gray-300"
                              >
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                                  <span className="group-hover:hidden">
                                    {t("treatmentsPage.empty")}
                                  </span>
                                  <div className="hidden group-hover:flex items-center gap-1 text-blue-600">
                                    <Plus className="w-4 h-4" />
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === "month" && (
          <div className="p-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="grid grid-cols-7 border-b-2 border-gray-300">
                {weekDaysShort.map((dayName) => (
                  <div
                    key={dayName}
                    className="p-4 text-center font-semibold text-gray-700"
                  >
                    {dayName}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getMonthGrid().map((day, idx) => {
                  const isCurrentMonth =
                    day.getMonth() === selectedDate.getMonth();
                  const isToday =
                    day.toDateString() === new Date().toDateString();
                  const dateStr = formatLocalDate(day);

                  const dayAppts = appointments.filter((a) => {
                    const apptDate = new Date(a.appointment_date);
                    const apptDateStr = formatLocalDate(apptDate);
                    return apptDateStr === dateStr;
                  });

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(day);
                        setViewMode("day");
                      }}
                      className={`min-h-32 border border-gray-200 p-3 hover:bg-blue-50 transition cursor-pointer ${
                        !isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                      } ${isToday ? "ring-4 ring-blue-400 ring-inset" : ""}`}
                    >
                      <div
                        className={`text-sm font-bold mb-2 ${
                          isCurrentMonth ? "text-gray-900" : "text-gray-500"
                        }`}
                      >
                        {day.getDate()}
                      </div>

                      {dayAppts.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-blue-600">
                            {dayAppts.length} {t("queue.queueLength")}
                          </div>

                          <div className="space-y-1">
                            {dayAppts.slice(0, 3).map((appt, i) => {
                              const isBreak =
                                (appt.status || "").toLowerCase() === "break";
                              const isCompleted =
                                (appt.status || "").toLowerCase() ===
                                  "completed" ||
                                (appt.status || "").toLowerCase() === "done";
                              const isInProgress =
                                (appt.status || "").toLowerCase() ===
                                "in_progress";
                              const editDisabled =
                                isSubmitting ||
                                isBreak ||
                                isCompleted ||
                                isInProgress;
                              const name = isBreak
                                ? t("schedule.types.busy")
                                : `${appt.patient?.first_name || ""} ${
                                    appt.patient?.last_name || ""
                                  }`.trim() || t("common.unknown");

                              const apptDate = new Date(appt.appointment_date);
                              const apptTime = apptDate
                                .toTimeString()
                                .slice(0, 5);

                              return (
                                <div
                                  key={i}
                                  className={`relative text-xs px-2 py-1 rounded truncate pr-7 ${
                                    isBreak
                                      ? "bg-pink-100 text-pink-700"
                                      : isCompleted
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (editDisabled) return;
                                      openEditAppointment(appt);
                                    }}
                                    disabled={editDisabled}
                                    title={
                                      editDisabled
                                        ? t("errors.cannot_edit") ||
                                          "Cannot edit"
                                        : t("common.edit") || "Edit"
                                    }
                                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded bg-white/70 text-blue-700 ${
                                      editDisabled
                                        ? "opacity-40 cursor-not-allowed"
                                        : "hover:bg-white"
                                    }`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {apptTime} - {name}
                                </div>
                              );
                            })}
                            {dayAppts.length > 3 && (
                              <div className="text-xs text-gray-500 pl-2">
                                +{dayAppts.length - 3} {t("common.more")}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          {t("treatmentsPage.empty")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-8 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">
                  {editingAppointment?.id
                    ? t("common.edit") || "Tahrirlash"
                    : t("appointments.newAppointment")}
                </h2>
                <button
                  onClick={resetAppointmentModal}
                  disabled={isSubmitting}
                  className="p-3 hover:bg-white/20 rounded-full transition"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
              <p className="mt-4 text-xl opacity-90">
                {headerDate} —{" "}
                {viewMode === "day"
                  ? t("common.day")
                  : viewMode === "week"
                    ? t("common.week")
                    : t("common.month")}{" "}
                {t("common.mode")}
              </p>
            </div>

            <form
              onSubmit={handleCreateAppointment}
              className="p-8 space-y-6 min-w-0"
            >
              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-red-700">
                  {modalError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder={t("patients.form.firstName")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("patients.form.lastName")}{" "}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder={t("patients.form.lastName")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("common.phone")} <span className="text-red-500">*</span>
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
                      className="w-full py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 pl-16 pr-4"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("patients.form.birthDate")}{" "}
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
                    className="w-full max-w-[240px] sm:max-w-none px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("patients.form.address")}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder={t("patients.form.address")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("common.notes") || "Izoh"}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  disabled={isSubmitting}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder={t("common.notes") || "Izoh (ixtiyoriy)"}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("common.doctor")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.doctorId}
                    onChange={(e) =>
                      setFormData({ ...formData, doctorId: e.target.value })
                    }
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">{t("common.selectDoctor")}</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("schedule.startTime")}{" "}
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
                    min="08:00"
                    max="18:30"
                    step="1800"
                    className="w-full max-w-[240px] sm:max-w-none px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 text-left appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("schedule.duration")}{" "}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  >
                    <option value={30}>30 {t("common.minutes")}</option>
                    <option value={45}>45 {t("common.minutes")}</option>
                    <option value={60}>1 {t("common.hour")}</option>
                    <option value={90}>1.5 {t("common.hour")}</option>
                    <option value={120}>2 {t("common.hour")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
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
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={resetAppointmentModal}
                  disabled={isSubmitting}
                  className="px-8 py-3 border-2 border-gray-300 rounded-2xl font-bold hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-2xl font-bold flex items-center gap-3 transition ${
                    isSubmitting
                      ? "bg-blue-400 text-white cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-6 h-6 animate-spin" />}
                  {isSubmitting ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBusyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-3 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-pink-600 text-white p-5 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t("schedule.addBusy")}</h2>
                <button
                  onClick={() => setShowBusyModal(false)}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="mt-2 text-sm opacity-90">{headerDate}</p>
            </div>

            <form
              onSubmit={handleCreateBusyTime}
              className="p-5 space-y-5 min-w-0"
            >
              {modalError && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-red-800 font-medium text-sm">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("common.doctor")} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={busyForm.doctorId}
                  onChange={(e) =>
                    setBusyForm({ ...busyForm, doctorId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition text-sm"
                >
                  <option value="">Tanlang</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={busyForm.allDay}
                  onChange={(e) =>
                    setBusyForm({ ...busyForm, allDay: e.target.checked })
                  }
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <label
                  htmlFor="allDay"
                  className="text-sm font-medium text-slate-700 cursor-pointer"
                >
                  {t("schedule.busy.allDay")}
                </label>
              </div>

              {!busyForm.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("schedule.startTime")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={busyForm.startTime}
                      onChange={(e) =>
                        setBusyForm({ ...busyForm, startTime: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      {t("schedule.endTime") || "Tugash vaqti"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={busyForm.endTime}
                      onChange={(e) =>
                        setBusyForm({ ...busyForm, endTime: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("schedule.busy.typeLabel") || "Turi"}
                </label>
                <select
                  value={busyForm.type}
                  onChange={(e) =>
                    setBusyForm({ ...busyForm, type: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition text-sm"
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t("schedule.busy.reasonLabel")}
                </label>
                <input
                  type="text"
                  value={busyForm.reason}
                  onChange={(e) =>
                    setBusyForm({ ...busyForm, reason: e.target.value })
                  }
                  placeholder="Masalan: Oilaviy sabab"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition text-sm"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBusyModal(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 transition text-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded-xl font-semibold flex items-center gap-3 text-sm transition ${
                    isSubmitting
                      ? "bg-orange-400"
                      : "bg-gradient-to-r from-orange-500 to-pink-600 shadow-lg hover:shadow-xl"
                  } text-white`}
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isSubmitting
                    ? t("common.saving")
                    : t("schedule.busy.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
