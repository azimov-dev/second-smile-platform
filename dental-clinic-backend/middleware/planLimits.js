const db = require("../models");
const { Op } = require("sequelize");

async function checkDoctorLimit(req, res, next) {
  const role = req.body.role;
  if (role !== "doctor") return next();

  const count = await db.User.count({
    where: { clinic_id: req.clinicId, role: "doctor" },
  });

  if (count >= req.plan.max_doctors) {
    return res.status(403).json({
      message: `Doctor limit reached (${req.plan.max_doctors}). Upgrade your plan.`,
      code: "PLAN_LIMIT_DOCTORS",
    });
  }
  next();
}

async function checkPatientLimit(req, res, next) {
  const count = await db.Patient.count({
    where: { clinic_id: req.clinicId },
  });

  if (count >= req.plan.max_patients) {
    return res.status(403).json({
      message: `Patient limit reached (${req.plan.max_patients}). Upgrade your plan.`,
      code: "PLAN_LIMIT_PATIENTS",
    });
  }
  next();
}

async function checkAppointmentLimit(req, res, next) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const count = await db.Appointment.count({
    where: {
      clinic_id: req.clinicId,
      appointment_date: { [Op.between]: [startOfMonth, endOfMonth] },
    },
  });

  if (count >= req.plan.max_appointments_per_month) {
    return res.status(403).json({
      message: `Monthly appointment limit reached (${req.plan.max_appointments_per_month}). Upgrade your plan.`,
      code: "PLAN_LIMIT_APPOINTMENTS",
    });
  }
  next();
}

module.exports = { checkDoctorLimit, checkPatientLimit, checkAppointmentLimit };
