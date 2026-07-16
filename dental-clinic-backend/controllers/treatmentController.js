const { sequelize } = require("../models");
const { Op } = require("sequelize");

exports.getAllTreatments = async (req, res, next) => {
  try {
    const { Treatment, Appointment, Patient, User, TreatmentPlan, Payment, TreatmentItem, Service } = req.models;
    const { from, to, status, search } = req.query;

    const appointmentWhere = {};
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

    const treatmentWhere = {};
    if (status) treatmentWhere.status = status;

    const treatments = await Treatment.findAll({
      where: treatmentWhere,
      include: [
        {
          model: Appointment.unscoped(), as: "appointment", required: true,
          where: Object.keys(appointmentWhere).length > 0 ? appointmentWhere : undefined,
          include: [
            { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"], where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined },
            { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
            { model: TreatmentPlan.unscoped(), as: "treatmentPlan", attributes: ["id", "title", "status"] },
          ],
        },
        { model: Payment.unscoped(), as: "payments", attributes: ["amount", "payment_type", ["created_at", "createdAt"]] },
        { model: TreatmentItem.unscoped(), as: "items", attributes: ["id", "quantity", ["price_at_time", "price"], "tooth_numbers", "notes"],
          include: [{ model: Service.unscoped(), as: "service", attributes: ["id", "name"] }] },
      ],
      order: [[{ model: Appointment.unscoped(), as: "appointment" }, "appointment_date", "DESC"]],
    });

    const enriched = treatments.map((t) => {
      const totalPaid = t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const json = t.toJSON();
      json.paid_amount = totalPaid;
      json.debt_amount = (json.total_amount || 0) - (json.discount_amount || 0) - totalPaid;
      return json;
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.getMyTreatments = async (req, res, next) => {
  try {
    const { Treatment, Appointment, Patient, User, TreatmentPlan, Payment, TreatmentItem, Service } = req.models;
    const doctorId = req.user.id;
    const { from, to, status, search } = req.query;

    const appointmentWhere = { doctor_id: doctorId };
    if (from || to) {
      appointmentWhere.appointment_date = {};
      if (from) appointmentWhere.appointment_date[Op.gte] = new Date(from);
      if (to) { const toDate = new Date(to); toDate.setHours(23, 59, 59, 999); appointmentWhere.appointment_date[Op.lte] = toDate; }
    }

    const treatmentWhere = {};
    if (status) treatmentWhere.status = status;

    const patientWhere = {};
    if (search) {
      patientWhere[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const treatments = await Treatment.findAll({
      where: treatmentWhere,
      include: [
        {
          model: Appointment.unscoped(), as: "appointment", required: true, where: appointmentWhere,
          include: [
            { model: Patient.unscoped(), as: "patient", attributes: ["id", "first_name", "last_name", "phone"], where: Object.keys(patientWhere).length > 0 ? patientWhere : undefined },
            { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
            { model: TreatmentPlan.unscoped(), as: "treatmentPlan", attributes: ["id", "title", "status"] },
          ],
        },
        { model: Payment.unscoped(), as: "payments", attributes: ["amount", "payment_type", ["created_at", "createdAt"]] },
        { model: TreatmentItem.unscoped(), as: "items", attributes: ["id", "quantity", ["price_at_time", "price"], "tooth_numbers", "notes"],
          include: [{ model: Service.unscoped(), as: "service", attributes: ["id", "name"] }] },
      ],
      order: [[{ model: Appointment.unscoped(), as: "appointment" }, "appointment_date", "DESC"]],
    });

    const enriched = treatments.map((t) => {
      const totalPaid = t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const json = t.toJSON();
      json.paid_amount = totalPaid;
      json.debt_amount = (json.total_amount || 0) - (json.discount_amount || 0) - totalPaid;
      return json;
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.getMyDebtTreatments = async (req, res, next) => {
  try {
    const { Treatment, Appointment, Patient, User, Payment } = req.models;
    const doctorId = req.user.id;

    const treatments = await Treatment.findAll({
      include: [
        {
          model: Appointment.unscoped(), as: "appointment", required: true, where: { doctor_id: doctorId },
          include: [
            { model: Patient.unscoped(), as: "patient" },
            { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
          ],
        },
        { model: Payment.unscoped(), as: "payments", attributes: ["amount"] },
      ],
      order: [[{ model: Appointment.unscoped(), as: "appointment" }, "appointment_date", "DESC"]],
    });

    const withDebt = treatments.map((t) => {
      const totalPaid = t.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const debt = (t.total_amount || 0) - (t.discount_amount || 0) - totalPaid;
      if (debt <= 0) return null;
      const json = t.toJSON();
      json.paid_amount = totalPaid;
      json.debt_amount = debt;
      return json;
    }).filter(Boolean);

    res.json(withDebt);
  } catch (err) {
    next(err);
  }
};

exports.createTreatment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Treatment, Appointment } = req.models;
    const doctorId = req.user.id;
    const { appointment_id, total_amount = 0, notes } = req.body;

    if (!appointment_id) { await t.rollback(); return res.status(400).json({ message: "appointment_id required" }); }

    const appointment = await Appointment.findOne({ where: { id: appointment_id }, transaction: t });
    if (!appointment) { await t.rollback(); return res.status(404).json({ message: "Appointment not found" }); }
    if (appointment.doctor_id !== doctorId && req.user.role !== "admin") {
      await t.rollback(); return res.status(403).json({ message: "Not your appointment" });
    }

    const existing = await Treatment.findOne({ where: { appointment_id }, transaction: t });
    if (existing) { await t.rollback(); return res.status(400).json({ message: "Treatment already exists" }); }

    const treatment = await Treatment.create(
      { clinic_id: req.clinicId, appointment_id, status: "active", total_amount, notes: notes || null },
      { transaction: t },
    );

    await t.commit();
    res.status(201).json(treatment);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.updateTreatment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Treatment, Appointment } = req.models;
    const { id } = req.params;
    const { status, total_amount, discount_amount, notes } = req.body;

    const treatment = await Treatment.findOne({
      where: { id },
      include: [{ model: Appointment.unscoped(), as: "appointment" }],
      transaction: t,
    });

    if (!treatment) { await t.rollback(); return res.status(404).json({ message: "Treatment not found" }); }
    if (treatment.appointment.doctor_id !== req.user.id && req.user.role !== "admin") {
      await t.rollback(); return res.status(403).json({ message: "Forbidden" });
    }

    if (status) treatment.status = status;
    if (total_amount !== undefined) treatment.total_amount = total_amount;
    if (discount_amount !== undefined) treatment.discount_amount = discount_amount;
    if (notes !== undefined) treatment.notes = notes;

    await treatment.save({ transaction: t });

    if (status === "completed") await treatment.appointment.update({ status: "completed" }, { transaction: t });
    else if (status === "cancelled") await treatment.appointment.update({ status: "cancelled" }, { transaction: t });

    await t.commit();
    res.json(treatment);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
