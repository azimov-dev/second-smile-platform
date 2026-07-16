const { sequelize } = require("../models");
const { Op } = require("sequelize");

exports.getMyPayments = async (req, res, next) => {
  try {
    const { Payment, Treatment, Appointment, Patient, User } = req.models;
    const doctorId = req.user.id;
    const { from, to, search } = req.query;

    const appointmentWhere = { doctor_id: doctorId };
    if (from || to) {
      appointmentWhere.appointment_date = {};
      if (from) appointmentWhere.appointment_date[Op.gte] = new Date(from);
      if (to) { const toDate = new Date(to); toDate.setHours(23, 59, 59, 999); appointmentWhere.appointment_date[Op.lte] = toDate; }
    }

    const patientWhere = {};
    if (search) {
      patientWhere[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const payments = await Payment.findAll({
      include: [{
        model: Treatment.unscoped(), as: "treatment", required: true,
        include: [{
          model: Appointment.unscoped(), as: "appointment", required: true, where: appointmentWhere,
          include: [
            { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"], where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined },
            { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
          ],
        }],
      }],
      order: [["paid_at", "DESC"]],
    });

    const treatmentPaidMap = {};
    payments.forEach((p) => { treatmentPaidMap[p.treatment_id] = (treatmentPaidMap[p.treatment_id] || 0) + p.amount; });

    const enriched = payments.map((p) => {
      const json = p.toJSON();
      const total = json.treatment?.total_amount || 0;
      const discount = json.treatment?.discount_amount || 0;
      const paid = treatmentPaidMap[p.treatment_id] || 0;
      json.debt_amount = total - discount - paid;
      return json;
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.createPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Payment, Treatment, Appointment, Patient, User } = req.models;
    const { treatment_id, amount, payment_type, comment, paid_at } = req.body;

    if (!treatment_id) return res.status(400).json({ message: "treatment_id required" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Valid amount required" });
    if (!payment_type) return res.status(400).json({ message: "payment_type required" });

    const treatment = await Treatment.findOne({
      where: { id: treatment_id },
      include: [{ model: Appointment.unscoped(), as: "appointment" }],
      transaction: t,
    });

    if (!treatment || !treatment.appointment) { await t.rollback(); return res.status(404).json({ message: "Treatment not found" }); }

    const allowedRoles = ["admin", "reception"];
    if (treatment.appointment.doctor_id !== req.user.id && !allowedRoles.includes(req.user.role)) {
      await t.rollback(); return res.status(403).json({ message: "Not authorized" });
    }

    const payment = await Payment.create(
      { clinic_id: req.clinicId, treatment_id, amount, payment_type, comment, paid_at: paid_at ? new Date(paid_at) : new Date() },
      { transaction: t },
    );

    await treatment.increment("paid_amount", { by: amount, transaction: t });
    await t.commit();

    const fullPayment = await Payment.findOne({
      where: { id: payment.id },
      include: [{
        model: Treatment.unscoped(), as: "treatment",
        include: [{ model: Appointment.unscoped(), as: "appointment", include: [{ model: Patient.unscoped(), as: "patient" }, { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] }] }],
      }],
    });

    res.status(201).json(fullPayment);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getDebts = async (req, res, next) => {
  try {
    const { Treatment, Appointment, Patient, User, Payment } = req.models;

    const allowedRoles = ["admin", "reception"];
    const showAll = allowedRoles.includes(req.user.role);
    const doctorId = showAll ? null : req.user.id;

    const treatments = await Treatment.findAll({
      include: [
        {
          model: Appointment.unscoped(), as: "appointment", required: true,
          include: [
            { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"] },
            { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
          ],
          where: doctorId ? { doctor_id: doctorId } : {},
        },
        { model: Payment.unscoped(), as: "payments", attributes: ["amount"] },
      ],
      where: { status: { [Op.in]: ["active", "completed"] } },
    });

    const debts = treatments.map((treatment) => {
      const totalPaid = treatment.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const discount = Number(treatment.discount_amount || 0);
      const debt = Number(treatment.total_amount || 0) - discount - totalPaid;
      if (debt <= 0) return null;
      const appt = treatment.appointment;
      return {
        treatment_id: treatment.id,
        patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
        patient_phone: appt.patient.phone || null,
        doctor_name: appt.doctor?.full_name || "Noma'lum",
        appointment_date: appt.appointment_date,
        total_amount: treatment.total_amount,
        discount_amount: treatment.discount_amount || 0,
        paid_amount: totalPaid,
        debt_amount: debt,
      };
    }).filter(Boolean).sort((a, b) => b.debt_amount - a.debt_amount);

    res.json(debts);
  } catch (err) {
    next(err);
  }
};
