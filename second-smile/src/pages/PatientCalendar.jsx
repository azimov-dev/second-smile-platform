import { useEffect, useState } from "react";
import { apiClient } from "../api/client.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../features/auth/useAuth";
import { Loader2 } from "lucide-react";

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
  if (h < 20) TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
}

// Helper function to format date to local YYYY-MM-DD
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function PatientCalendar() {
  const { t } = useLanguage();
  const { token } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [currentDate] = useState(formatLocalDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const lang = localStorage.getItem("lang") || "uz";
    const localeMap = { uz: "uz-UZ", uz_cyr: "uz-Cyrl-UZ", uz_new: "uz-UZ", ru: "ru-RU", en: "en-US" };
    const locale = localeMap[lang] || "uz-UZ";
    return date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const todayFormatted = formatDisplayDate(currentDate);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;

    const loadDoctors = async () => {
      try {
        const data = await apiClient("/admin/users", { token });
        console.log("Raw doctor data:", data);
        const doctorsOnly = (Array.isArray(data) ? data : []).filter(
          (u) => u.role === "doctor",
        );
        console.log("Filtered doctors:", doctorsOnly);
        setDoctors(
          doctorsOnly.map((d) => ({
            id: d.id,
            name: d.full_name || "Doktor",
          })),
        );
      } catch (err) {
        console.error("Failed to load doctors", err);
      }
    };
    loadDoctors();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const loadAppointments = async () => {
      try {
        setLoading(true);
        const data = await apiClient(`/appointments?date=${currentDate}`, {
          token,
        });
        const list = Array.isArray(data) ? data : [];

        const active = list.filter((a) => {
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

        setAppointments(active);
        // also load doctor schedules (busy times) for the same date
        try {
          const sched = await apiClient(
            `/doctor-schedules?date=${currentDate}`,
            {
              token,
            },
          );
          setSchedules(Array.isArray(sched) ? sched : []);
        } catch (e) {
          console.error("Failed to load schedules", e);
          setSchedules([]);
        }
      } catch (err) {
        console.error("Failed to load appointments", err);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();

    const interval = setInterval(loadAppointments, 30000);
    return () => clearInterval(interval);
  }, [currentDate, token]);

  const getBusyBlockAtTime = (doctorId, dateStr, time) => {
    return schedules.find((s) => {
      const schedDate =
        s.date || formatLocalDate(new Date(s.created_at || Date.now()));
      if (schedDate !== dateStr) return false;
      const apptDoctorId = s.doctor_id || s.doctor?.id;
      if (apptDoctorId != doctorId && apptDoctorId != Number(doctorId))
        return false;
      if (s.start_time === null) return s; // all-day busy for this date
      const start = s.start_time.slice(0, 5);
      if (start === time) return s;

      // also allow matching when time sits inside a busy range
      if (s.start_time && s.end_time) {
        const [sh, sm] = s.start_time.slice(0, 5).split(":").map(Number);
        const [eh, em] = s.end_time.slice(0, 5).split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        const [th, tm] = time.split(":").map(Number);
        const tMin = th * 60 + tm;
        if (tMin >= startMin && tMin < endMin) return s;
      }

      return false;
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
    const duration = Math.max(30, endMin - startMin);
    return Math.max(1, Math.ceil(duration / 30));
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

  const getEndTime = (appt) => {
    const start = new Date(appt.appointment_date);
    const end = new Date(start.getTime() + (appt.duration || 30) * 60000);
    return end.toTimeString().slice(0, 5);
  };

  const getAppointmentAtTimeAndDate = (time, doctorId) => {
    return appointments.find((appt) => {
      const apptDoctorId = appt.doctor_id || appt.doctor?.id;
      const doctorMatch =
        apptDoctorId == doctorId || apptDoctorId == Number(doctorId);
      if (!doctorMatch) return false;

      const apptDate = new Date(appt.appointment_date);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {t("patientCalendar.title") || "Bugungi navbat jadvali"}
            </h1>
            <p className="text-lg mt-1 opacity-90">{todayFormatted}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {currentTime.toLocaleTimeString("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
            <div className="text-sm opacity-90 mt-1">
              {t("patientCalendar.currentTime") || "Hozirgi vaqt"}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Table */}
      <div className="p-6">
        {doctors.length === 0 && !loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-2xl text-gray-600 mb-4">
              {t("noDoctorsFound") || "Doktorlar topilmadi"}
            </p>
            <p className="text-gray-500">
              Iltimos, tizimda doktorlar mavjudligini tekshiring.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th
                    style={{ width: "96px" }}
                    className="bg-gray-50 border-r-2 border-gray-300 w-20 px-4 py-3"
                  ></th>
                  {doctors.map((doctor) => (
                    <th
                      key={doctor.id}
                      style={{
                        width: `calc((100% - 96px) / ${doctors.length})`,
                      }}
                      className="px-4 py-3 text-center font-semibold text-gray-700 border-b-2 border-gray-300 text-lg"
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
                      className="text-center py-20"
                    >
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : (
                  TIME_SLOTS.map((time, timeIndex) => (
                    <tr key={time} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border-r-2 border-gray-300 text-center">
                        {time}
                      </td>

                      {doctors.map((doctor) => {
                        const [currentHour, currentMin] = time
                          .split(":")
                          .map(Number);
                        const currentSlotMinutes =
                          currentHour * 60 + currentMin;

                        let isCovered = false;
                        for (let i = 0; i < timeIndex; i++) {
                          const prevTime = TIME_SLOTS[i];
                          const prevAppt = getAppointmentAtTimeAndDate(
                            prevTime,
                            doctor.id,
                          );

                          if (prevAppt) {
                            const apptDate = new Date(
                              prevAppt.appointment_date,
                            );
                            const apptStartMinutes =
                              apptDate.getHours() * 60 + apptDate.getMinutes();
                            const apptEndMinutes =
                              apptStartMinutes + (prevAppt.duration || 30);

                            if (
                              currentSlotMinutes >= apptStartMinutes &&
                              currentSlotMinutes < apptEndMinutes
                            ) {
                              isCovered = true;
                              break;
                            }
                          }

                          // also check previous busy blocks that may cover this slot
                          const prevBusy = getBusyBlockAtTime(
                            doctor.id,
                            currentDate,
                            prevTime,
                          );
                          if (prevBusy) {
                            if (prevBusy.start_time === null) {
                              isCovered = true;
                              break;
                            }
                            const [sh, sm] = prevBusy.start_time
                              .slice(0, 5)
                              .split(":")
                              .map(Number);
                            const [eh, em] = (
                              prevBusy.end_time || prevBusy.start_time
                            )
                              .slice(0, 5)
                              .split(":")
                              .map(Number);
                            const busyStart = sh * 60 + sm;
                            const busyEnd = eh * 60 + em;
                            if (
                              currentSlotMinutes >= busyStart &&
                              currentSlotMinutes < busyEnd
                            ) {
                              isCovered = true;
                              break;
                            }
                          }
                        }

                        if (isCovered) return null;

                        // Check for busy block at this time for this doctor
                        const busyBlock = getBusyBlockAtTime(
                          doctor.id,
                          currentDate,
                          time,
                        );
                        if (busyBlock) {
                          const isAllDay = busyBlock.start_time === null;
                          const rowSpan = isAllDay
                            ? TIME_SLOTS.length
                            : getBusyBlockRowSpan(busyBlock);

                          return (
                            <td
                              key={`${doctor.id}-busy-${time}`}
                              rowSpan={rowSpan}
                              className="p-0 border-l border-gray-300"
                            >
                              <div className="h-full min-h-16 rounded-lg px-3 py-2 text-center shadow-sm border flex flex-col justify-center bg-pink-50 border-pink-200">
                                <p className="font-semibold text-base text-pink-800">
                                  {getBusyLabel(busyBlock)}
                                </p>
                                {!isAllDay && (
                                  <p className="text-xs mt-1 text-pink-600">
                                    {busyBlock.start_time?.slice(0, 5)} -{" "}
                                    {busyBlock.end_time?.slice(0, 5)}
                                  </p>
                                )}
                              </div>
                            </td>
                          );
                        }

                        const appt = getAppointmentAtTimeAndDate(
                          time,
                          doctor.id,
                        );

                        if (appt) {
                          const rowSpan = getRowSpan(appt);
                          const isBreak =
                            (appt.status || "").toLowerCase() === "break";
                          const isCompleted =
                            (appt.status || "").toLowerCase() === "completed" ||
                            (appt.status || "").toLowerCase() === "done";
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
                                className={`h-full min-h-16 rounded-lg px-3 py-2 text-center shadow-sm border flex flex-col justify-center ${
                                  isBreak
                                    ? "bg-pink-50 border-pink-200"
                                    : isCompleted
                                    ? "bg-emerald-50 border-emerald-200"
                                    : "bg-blue-50 border-blue-200"
                                }`}
                              >
                                <p
                                  className={`font-semibold text-base ${
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
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={doctor.id}
                            className="p-2 text-center text-gray-400 text-sm border-l border-gray-300"
                          >
                            {t("treatmentsPage.empty") || "Bo'sh"}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-6 px-6">
        <p className="text-lg text-indigo-700">
          {t("patientCalendar.footer") ||
            "Iltimos, o'z navbatingizni kuting. Rahmat!"}
        </p>
      </div>
    </div>
  );
}
