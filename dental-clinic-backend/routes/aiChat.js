const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sequelize = require("../db/index.js");
const auth = require("../middleware/authMiddleware.js");

const router = express.Router();
const apiKey = process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("uz-UZ");
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-20)
    .map((message) => {
      const role = message?.role === "user" ? "user" : "model";
      const text = String(
        message?.content || message?.parts?.[0]?.text || "",
      ).trim();
      return { role, parts: [{ text }] };
    })
    .filter((item) => item.parts[0].text.length > 0);
}

function getRoleGuidance(role) {
  const normalizedRole = String(role || "staff").toLowerCase();

  if (normalizedRole === "reception") {
    return "Asosiy fokus: navbatni boshqarish, bugungi bo'sh slotlar, qarzdorlar bilan aloqa rejasi.";
  }

  if (normalizedRole === "doctor") {
    return "Asosiy fokus: bugungi qabul yuklamasi, davom etayotgan davolashlar, bemorlarni ustuvorlashtirish.";
  }

  if (normalizedRole === "admin") {
    return "Asosiy fokus: klinika KPI, qarzdorlik dinamikasi, operatsion samaradorlik va jarayon optimizatsiyasi.";
  }

  return "Asosiy fokus: klinika boshqaruvi bo'yicha amaliy va qisqa tavsiyalar.";
}

async function getDashboardSnapshot() {
  const [patients, debts, todayAppointments, topDebtors, upcomingToday] =
    await Promise.all([
      sequelize.query("SELECT COUNT(*) AS count FROM patients", {
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(
        `SELECT 
         COUNT(*) AS count,
         COALESCE(SUM(total_amount - discount_amount - paid_amount), 0) AS total_debt
       FROM treatments
       WHERE
         total_amount - discount_amount - paid_amount > 0`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT 
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
         COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
       FROM appointments
       WHERE DATE(appointment_date) = CURRENT_DATE`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT 
         p.id,
         CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
         COALESCE(SUM(t.total_amount - t.discount_amount - t.paid_amount), 0) AS debt
       FROM treatments t
       JOIN appointments a ON a.id = t.appointment_id
       JOIN patients p ON p.id = a.patient_id
       WHERE (t.total_amount - t.discount_amount - t.paid_amount) > 0
       GROUP BY p.id, p.first_name, p.last_name
       ORDER BY debt DESC
       LIMIT 5`,
        { type: sequelize.QueryTypes.SELECT },
      ),
      sequelize.query(
        `SELECT 
         TO_CHAR(a.appointment_date, 'HH24:MI') AS time,
         CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
         COALESCE(u.full_name, '-') AS doctor_name,
         a.status
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.doctor_id
       WHERE DATE(a.appointment_date) = CURRENT_DATE
       ORDER BY a.appointment_date ASC
       LIMIT 7`,
        { type: sequelize.QueryTypes.SELECT },
      ),
    ]);

  const appointmentStats = todayAppointments[0] || {};

  return {
    totalPatients: Number(patients[0]?.count || 0),
    debtCount: Number(debts[0]?.count || 0),
    totalDebt: Number(debts[0]?.total_debt || 0),
    todaysAppointments: Number(appointmentStats.total || 0),
    todayStatus: {
      pending: Number(appointmentStats.pending || 0),
      confirmed: Number(appointmentStats.confirmed || 0),
      inProgress: Number(appointmentStats.in_progress || 0),
      completed: Number(appointmentStats.completed || 0),
      cancelled: Number(appointmentStats.cancelled || 0),
    },
    topDebtors: topDebtors.map((row) => ({
      patientId: Number(row.id),
      patientName: String(row.patient_name || "").trim() || "Noma'lum",
      debt: Number(row.debt || 0),
    })),
    upcomingToday: upcomingToday.map((row) => ({
      time: row.time || "",
      patientName: String(row.patient_name || "").trim() || "Noma'lum",
      doctorName: String(row.doctor_name || "-").trim() || "-",
      status: row.status || "pending",
    })),
  };
}

router.post("/chat", auth, async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    const user = req.user || { role: "staff" };

    if (!genAI) {
      return res.status(503).json({
        error: "AI xizmati sozlanmagan",
        detail: "GOOGLE_API_KEY topilmadi",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({ error: "Xabar bo'sh bo'lmasligi kerak" });
    }

    if (String(message).length > 1200) {
      return res
        .status(400)
        .json({ error: "Xabar juda uzun. Iltimos qisqaroq yozing." });
    }

    const snapshot = await getDashboardSnapshot();
    const normalizedHistory = normalizeHistory(history);
    const roleGuidance = getRoleGuidance(user.role);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.45, maxOutputTokens: 700 },
    });

    const systemInstruction = `
Siz tish klinikasining o'zbek/rus/ingliz tilidagi yordamchisisiz.
- Hech qachon tibbiy diagnoz yoki dori tavsiya bermang.
- Faqat operatsion boshqaruv, moliya, navbat, bemor kommunikatsiyasi bo'yicha maslahat bering.
- Foydalanuvchi qaysi tilda yozsa, shu tilda javob bering.
- Raqamlarni o'ylab topmang, faqat berilgan snapshotdan foydalaning.
- Javob formati: 1) Qisqa xulosa, 2) 3 ta aniq amaliy qadam, 3) 1 ta risk/ogohlantirish.
- Keraksiz uzunlikdan qoching, sodda va actionable yozing.

Foydalanuvchi roli: ${user.role || "staff"}
Rol bo'yicha yo'nalish: ${roleGuidance}

Snapshot (haqiqiy ma'lumotlar):
${JSON.stringify(
  {
    totalPatients: snapshot.totalPatients,
    todaysAppointments: snapshot.todaysAppointments,
    todayStatus: snapshot.todayStatus,
    debtCount: snapshot.debtCount,
    totalDebt: `${formatMoney(snapshot.totalDebt)} so'm`,
    topDebtors: snapshot.topDebtors.map((item) => ({
      patientName: item.patientName,
      debt: `${formatMoney(item.debt)} so'm`,
    })),
    upcomingToday: snapshot.upcomingToday,
  },
  null,
  2,
)}
    `.trim();

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Salom" }] },
        { role: "model", parts: [{ text: systemInstruction }] },
        ...normalizedHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text().trim();

    return res.json({
      reply,
      snapshot,
    });
  } catch (error) {
    console.error("AI Chat xatosi:", error.message || error);

    return res.status(500).json({
      error: "AI xizmati vaqtincha ishlamayapti",
      detail: error.message,
    });
  }
});

module.exports = router;
