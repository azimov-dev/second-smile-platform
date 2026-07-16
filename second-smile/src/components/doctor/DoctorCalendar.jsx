import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "../../api/client.js";

export function DoctorCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0–11

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startWeekday = firstDayOfMonth.getDay(); // 0–6 (Sun–Sat)
  const daysInMonth = lastDayOfMonth.getDate();

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const formatDateKey = (d) => {
    const y = year;
    const m = String(month + 1).padStart(2, "0");
    const day = String(d).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const loadAppointments = async (dateKey) => {
    if (!token) {
      setError("No token found. Please login as doctor.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await apiClient(`/doctor/calendar/${dateKey}/appointments`, {
        token,
      });

      const mapped = data.map((appt) => {
        const dt = new Date(appt.appointment_date);
        const time = dt.toTimeString().slice(0, 5);

        const patientName = appt.patient
          ? `${appt.patient.first_name} ${appt.patient.last_name}`
          : "Unknown patient";

        return {
          id: appt.id,
          time,
          patient: patientName,
          status: appt.status || "scheduled",
        };
      });

      setAppointments(mapped);
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Failed to load day appointments. Make sure you are logged in as doctor.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments(selectedDateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateKey]);

  const goPrevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setCurrentDate(d);
  };

  const goNextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setCurrentDate(d);
  };

  const isToday = (d) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  const isSelected = (d) => selectedDateKey === formatDateKey(d);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  // Build calendar cells
  const daysArray = [];
  for (let i = 0; i < startWeekday; i += 1) {
    daysArray.push(null); // empty cells before day 1
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    daysArray.push(d);
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Calendar */}
      <div className="md:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={goPrevMonth}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-sm font-medium text-gray-900">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            onClick={goNextMonth}
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekdays */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
          {weekdayLabels.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1 text-sm">
          {daysArray.map((day, idx) => {
            if (day === null) {
              return <div key={idx} />;
            }

            const dateKey = formatDateKey(day);
            const selected = isSelected(day);
            const today = isToday(day);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDateKey(dateKey)}
                className={[
                  "flex h-10 items-center justify-center rounded-lg border text-xs transition-colors",
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-transparent bg-gray-50 text-gray-800 hover:border-blue-300 hover:bg-blue-50",
                  today && !selected ? "ring-1 ring-blue-400" : "",
                ].join(" ")}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day details */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">
          Appointments on {selectedDateKey}
        </h3>
        <p className="mt-1 text-xs text-gray-500">From your doctor calendar</p>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="py-4 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">
              No appointments for this day
            </div>
          ) : (
            appointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5"
              >
                <div>
                  <div className="text-xs font-medium text-gray-900">
                    {appt.time}
                  </div>
                  <div className="text-sm text-gray-800">{appt.patient}</div>
                </div>
                <span
                  className={
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium " +
                    getStatusBadgeClass(appt.status)
                  }
                >
                  {appt.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
