const { sequelize } = require("../models");
const { Op } = require("sequelize");

async function isDoctor(User, userId) {
  const user = await User.findOne({ where: { id: userId, role: "doctor" } });
  return !!user;
}

exports.createAppointment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment, Patient, User, TreatmentPlan } = req.models;
    const {
      patient_id, doctor_id, appointment_date, duration = 30, notes, treatment_plan_id,
    } = req.body;

    if (!patient_id) return res.status(400).json({ message: "patient_id required" });
    if (!appointment_date) return res.status(400).json({ message: "appointment_date required" });

    let validDoctorId = null;
    if (doctor_id) {
      const doctorExists = await isDoctor(User, doctor_id);
      if (!doctorExists) return res.status(400).json({ message: "Invalid doctor_id" });
      validDoctorId = doctor_id;
    }

    let planId = null;
    if (treatment_plan_id) {
      const plan = await TreatmentPlan.findOne({ where: { id: treatment_plan_id } });
      if (!plan) return res.status(400).json({ message: "Invalid treatment_plan_id" });
      if (String(plan.patient_id) !== String(patient_id)) {
        return res.status(400).json({ message: "Patient does not match treatment plan" });
      }
      if (!validDoctorId && plan.doctor_id) validDoctorId = plan.doctor_id;
      planId = plan.id;
    }

    const startDate = new Date(appointment_date);

    const overlapping = await Appointment.findOne({
      where: {
        doctor_id: validDoctorId,
        [Op.and]: [
          { appointment_date: { [Op.lt]: new Date(startDate.getTime() + duration * 60000) } },
          sequelize.literal(`"appointment_date" + "duration" * interval '1 minute' > '${startDate.toISOString()}'`),
        ],
      },
      transaction: t,
    });

    if (overlapping) {
      await t.rollback();
      return res.status(409).json({ message: "Bu vaqtda doktor band" });
    }

    const appointment = await Appointment.create(
      {
        clinic_id: req.clinicId,
        patient_id,
        doctor_id: validDoctorId,
        appointment_date: startDate,
        duration,
        status: "confirmed",
        notes: notes ?? null,
        treatment_plan_id: planId,
      },
      { transaction: t },
    );

    await t.commit();

    const fullAppointment = await Appointment.findOne({
      where: { id: appointment.id },
      include: [
        { model: Patient.unscoped(), as: "patient" },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
        { model: TreatmentPlan.unscoped(), as: "treatmentPlan" },
      ],
    });

    res.status(201).json(fullAppointment);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.updateAppointmentNotes = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment } = req.models;
    const { id } = req.params;
    const { notes } = req.body;

    const appointment = await Appointment.findOne({ where: { id }, transaction: t });
    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isAuthorized =
      req.user.role === "admin" || req.user.role === "reception" || appointment.doctor_id === req.user.id;
    if (!isAuthorized) {
      await t.rollback();
      return res.status(403).json({ message: "Forbidden" });
    }

    await appointment.update({ notes: notes ?? null }, { transaction: t });
    await t.commit();
    res.json(appointment);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.updateAppointment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment, Patient, User, Treatment, TreatmentPlan } = req.models;
    const { id } = req.params;
    const { patient_id, doctor_id, appointment_date, duration, notes, treatment_plan_id } = req.body;

    const hasAnyUpdate =
      patient_id !== undefined || doctor_id !== undefined || appointment_date !== undefined ||
      duration !== undefined || notes !== undefined || treatment_plan_id !== undefined;

    if (!hasAnyUpdate) {
      await t.rollback();
      return res.status(400).json({ message: "No fields to update" });
    }

    const appointment = await Appointment.findOne({
      where: { id },
      include: [{ model: Treatment.unscoped(), as: "treatment", required: false }],
      transaction: t,
    });

    if (!appointment) {
      await t.rollback();
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isAuthorized =
      req.user.role === "admin" || req.user.role === "reception" || appointment.doctor_id === req.user.id;
    if (!isAuthorized) {
      await t.rollback();
      return res.status(403).json({ message: "Forbidden" });
    }

    const tryingToEditCoreFields =
      patient_id !== undefined || doctor_id !== undefined ||
      appointment_date !== undefined || duration !== undefined || treatment_plan_id !== undefined;

    if (tryingToEditCoreFields &&
      (appointment.treatment || appointment.status === "in_progress" || appointment.status === "completed")) {
      await t.rollback();
      return res.status(400).json({ message: "Cannot edit appointment details after treatment has started (you can still edit notes)" });
    }

    if (patient_id !== undefined) {
      const patient = await Patient.findOne({ where: { id: patient_id }, transaction: t });
      if (!patient) { await t.rollback(); return res.status(400).json({ message: "Invalid patient_id" }); }
      appointment.patient_id = patient_id;
    }

    if (treatment_plan_id !== undefined) {
      if (treatment_plan_id === null || treatment_plan_id === "") {
        appointment.treatment_plan_id = null;
      } else {
        const plan = await TreatmentPlan.findOne({ where: { id: treatment_plan_id }, transaction: t });
        if (!plan) { await t.rollback(); return res.status(400).json({ message: "Invalid treatment_plan_id" }); }
        const patientMatch = patient_id !== undefined
          ? String(plan.patient_id) === String(patient_id)
          : String(plan.patient_id) === String(appointment.patient_id);
        if (!patientMatch) { await t.rollback(); return res.status(400).json({ message: "Patient does not match treatment plan" }); }
        appointment.treatment_plan_id = plan.id;
      }
    }

    if (doctor_id !== undefined) {
      if (doctor_id === null || doctor_id === "") {
        appointment.doctor_id = null;
      } else {
        const doctorExists = await isDoctor(User, doctor_id);
        if (!doctorExists) { await t.rollback(); return res.status(400).json({ message: "Invalid doctor_id" }); }
        appointment.doctor_id = doctor_id;
      }
    }

    if (appointment_date !== undefined) {
      const parsed = new Date(appointment_date);
      if (Number.isNaN(parsed.getTime())) { await t.rollback(); return res.status(400).json({ message: "Invalid appointment_date" }); }
      appointment.appointment_date = parsed;
    }

    if (duration !== undefined) {
      const d = Number(duration);
      if (!Number.isFinite(d) || d <= 0) { await t.rollback(); return res.status(400).json({ message: "Invalid duration" }); }
      appointment.duration = d;
    }

    if (notes !== undefined) appointment.notes = notes ?? null;

    if (appointment.doctor_id && appointment.appointment_date && appointment.duration) {
      const startDate = new Date(appointment.appointment_date);
      const checkDuration = Number(appointment.duration);
      const overlapping = await Appointment.findOne({
        where: {
          id: { [Op.ne]: appointment.id },
          doctor_id: appointment.doctor_id,
          [Op.and]: [
            { appointment_date: { [Op.lt]: new Date(startDate.getTime() + checkDuration * 60000) } },
            sequelize.literal(`"appointment_date" + "duration" * interval '1 minute' > '${startDate.toISOString()}'`),
          ],
        },
        transaction: t,
      });
      if (overlapping) { await t.rollback(); return res.status(409).json({ message: "Bu vaqtda doktor band" }); }
    }

    await appointment.save({ transaction: t });
    await t.commit();

    const fullAppointment = await Appointment.findOne({
      where: { id: appointment.id },
      include: [
        { model: Patient.unscoped(), as: "patient" },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name"] },
        { model: TreatmentPlan.unscoped(), as: "treatmentPlan" },
      ],
    });

    res.json(fullAppointment);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.deleteAppointment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment, Treatment } = req.models;
    const { id } = req.params;

    const appointment = await Appointment.findOne({
      where: { id },
      include: [{ model: Treatment.unscoped(), as: "treatment", required: false }],
      transaction: t,
    });

    if (!appointment) { await t.rollback(); return res.status(404).json({ message: "Appointment not found" }); }

    const isAuthorized =
      req.user.role === "admin" || req.user.role === "reception" || appointment.doctor_id === req.user.id;
    if (!isAuthorized) { await t.rollback(); return res.status(403).json({ message: "Not authorized to delete this appointment" }); }
    if (appointment.treatment) { await t.rollback(); return res.status(400).json({ message: "Cannot delete appointment: treatment has already started" }); }
    if (appointment.status === "completed") { await t.rollback(); return res.status(400).json({ message: "Cannot delete a completed appointment" }); }

    await appointment.destroy({ transaction: t });
    await t.commit();
    res.json({ message: "Appointment successfully deleted", appointment_id: id });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.startTreatment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment, Patient, User, Treatment, TreatmentItem, Service } = req.models;
    const { id } = req.params;
    const doctorId = req.user.id;
    const { services = [], discount_amount } = req.body;

    const parsedDiscount = discount_amount === undefined || discount_amount === null ? null : Number(discount_amount);
    if (parsedDiscount !== null && (!Number.isFinite(parsedDiscount) || parsedDiscount < 0)) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid discount_amount" });
    }

    const appointment = await Appointment.findOne({
      where: { id },
      include: [
        { model: Patient.unscoped(), as: "patient" },
        { model: User.unscoped(), as: "doctor" },
      ],
      transaction: t,
    });

    if (!appointment) { await t.rollback(); return res.status(404).json({ message: "Appointment not found" }); }
    if (appointment.doctor_id !== doctorId && req.user.role !== "admin") {
      await t.rollback(); return res.status(403).json({ message: "Not your appointment" });
    }

    const existingTreatment = await Treatment.findOne({ where: { appointment_id: id }, transaction: t });
    if (existingTreatment) { await t.rollback(); return res.status(400).json({ message: "Treatment already started" }); }

    const treatment = await Treatment.create(
      { clinic_id: req.clinicId, appointment_id: id, treatment_date: new Date(), status: "active", total_amount: 0, discount_amount: 0, paid_amount: 0 },
      { transaction: t },
    );

    let totalAmount = 0;
    if (services.length > 0) {
      const serviceIds = services.map((s) => s.service_id).filter(Boolean);
      const foundServices = await Service.findAll({ where: { id: serviceIds }, transaction: t });
      const serviceMap = Object.fromEntries(foundServices.map((s) => [s.id, s]));

      for (const item of services) {
        const svc = serviceMap[item.service_id];
        if (!svc) { await t.rollback(); return res.status(400).json({ message: `Service not found: ${item.service_id}` }); }
        const qty = item.quantity > 0 ? item.quantity : 1;
        totalAmount += svc.price * qty;
        await TreatmentItem.create(
          { clinic_id: req.clinicId, treatment_id: treatment.id, service_id: svc.id, quantity: qty, price_at_time: svc.price, tooth_numbers: item.tooth_numbers ?? item.toothNumbers ?? null, notes: item.notes ?? null },
          { transaction: t },
        );
      }
    }

    const appliedDiscount = parsedDiscount === null ? 0 : Math.min(Math.max(parsedDiscount, 0), Number(totalAmount || 0));
    await treatment.update({ total_amount: totalAmount, discount_amount: appliedDiscount }, { transaction: t });
    await appointment.update({ status: "in_progress" }, { transaction: t });
    await t.commit();

    res.json({ message: "Treatment started successfully", treatment: { id: treatment.id, total_amount: totalAmount, discount_amount: treatment.discount_amount } });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.addServices = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment, Treatment, TreatmentItem, Service } = req.models;
    const { id } = req.params;
    const { services = [] } = req.body;

    if (services.length === 0) { await t.rollback(); return res.status(400).json({ message: "Hech qanday xizmat tanlanmagan" }); }

    const appointment = await Appointment.findOne({
      where: { id },
      include: [{ model: Treatment.unscoped(), as: "treatment" }],
      transaction: t,
    });

    if (!appointment || !appointment.treatment) { await t.rollback(); return res.status(400).json({ message: "Davolash hali boshlanmagan" }); }
    if (appointment.doctor_id !== req.user.id && req.user.role !== "admin") {
      await t.rollback(); return res.status(403).json({ message: "Ruxsat etilmagan" });
    }

    const treatment = appointment.treatment;
    let totalAdd = 0;

    for (const item of services) {
      const service = await Service.findOne({ where: { id: item.service_id }, transaction: t });
      if (!service) { await t.rollback(); return res.status(400).json({ message: `Xizmat topilmadi: ${item.service_id}` }); }
      const qty = item.quantity > 0 ? item.quantity : 1;
      totalAdd += service.price * qty;
      await TreatmentItem.create(
        { clinic_id: req.clinicId, treatment_id: treatment.id, service_id: service.id, quantity: qty, price_at_time: service.price, tooth_numbers: item.tooth_numbers ?? item.toothNumbers ?? null, notes: item.notes ?? null },
        { transaction: t },
      );
    }

    await treatment.increment("total_amount", { by: totalAdd, transaction: t });
    await treatment.reload({ transaction: t });
    await t.commit();

    res.json({ message: "Xizmatlar muvaffaqiyatli qo'shildi", added_amount: totalAdd, new_total: treatment.total_amount });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.syncServices = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment, Treatment, TreatmentItem, Service } = req.models;
    const { id } = req.params;
    const { services = [], discount_amount } = req.body;

    const parsedDiscount = discount_amount === undefined || discount_amount === null ? null : Number(discount_amount);
    if (parsedDiscount !== null && (!Number.isFinite(parsedDiscount) || parsedDiscount < 0)) {
      await t.rollback(); return res.status(400).json({ message: "Invalid discount_amount" });
    }

    const appointment = await Appointment.findOne({
      where: { id },
      include: [{ model: Treatment.unscoped(), as: "treatment", include: [{ model: TreatmentItem.unscoped(), as: "items" }] }],
      transaction: t,
    });

    if (!appointment || !appointment.treatment) { await t.rollback(); return res.status(400).json({ message: "Davolash hali boshlanmagan" }); }

    const isAuthorized = req.user.role === "admin" || req.user.role === "reception" || appointment.doctor_id === req.user.id;
    if (!isAuthorized) { await t.rollback(); return res.status(403).json({ message: "Ruxsat etilmagan" }); }

    const treatment = appointment.treatment;
    if (["completed", "cancelled"].includes(treatment.status)) {
      await t.rollback(); return res.status(400).json({ message: "Cannot edit services for a closed treatment" });
    }

    const desiredByServiceId = new Map();
    for (const item of services) {
      const serviceId = item?.service_id ?? item?.serviceId;
      if (!serviceId) { await t.rollback(); return res.status(400).json({ message: "service_id required" }); }
      desiredByServiceId.set(Number(serviceId), {
        quantity: item.quantity > 0 ? item.quantity : 1,
        tooth_numbers: item.tooth_numbers ?? item.toothNumbers ?? null,
        notes: item.notes ?? null,
      });
    }

    const desiredServiceIds = Array.from(desiredByServiceId.keys());
    const foundServices = desiredServiceIds.length
      ? await Service.findAll({ where: { id: desiredServiceIds }, transaction: t })
      : [];

    if (foundServices.length !== desiredServiceIds.length) {
      const foundIds = new Set(foundServices.map((s) => s.id));
      const missing = desiredServiceIds.filter((sid) => !foundIds.has(sid));
      await t.rollback();
      return res.status(400).json({ message: `Xizmat topilmadi: ${missing.join(",")}` });
    }

    const serviceMap = Object.fromEntries(foundServices.map((s) => [s.id, s]));
    const existingItems = treatment.items || [];

    for (const existing of existingItems) {
      if (!desiredByServiceId.has(Number(existing.service_id))) {
        await existing.destroy({ transaction: t });
      }
    }

    for (const [serviceId, desired] of desiredByServiceId.entries()) {
      const matches = existingItems.filter((it) => Number(it.service_id) === Number(serviceId));
      const keep = matches[0] || null;
      if (matches.length > 1) {
        for (const extra of matches.slice(1)) await extra.destroy({ transaction: t });
      }
      if (keep) {
        keep.quantity = desired.quantity;
        keep.tooth_numbers = desired.tooth_numbers;
        keep.notes = desired.notes;
        await keep.save({ transaction: t });
      } else {
        const svc = serviceMap[serviceId];
        await TreatmentItem.create(
          { clinic_id: req.clinicId, treatment_id: treatment.id, service_id: svc.id, quantity: desired.quantity, price_at_time: svc.price, tooth_numbers: desired.tooth_numbers, notes: desired.notes },
          { transaction: t },
        );
      }
    }

    const finalItems = await TreatmentItem.findAll({
      where: { treatment_id: treatment.id },
      attributes: ["quantity", "price_at_time"],
      transaction: t,
    });

    const newTotal = finalItems.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.price_at_time || 0), 0);
    const appliedDiscount = parsedDiscount === null
      ? Number(treatment.discount_amount || 0)
      : Math.min(Math.max(parsedDiscount, 0), Number(newTotal || 0));

    await treatment.update({ total_amount: newTotal, discount_amount: appliedDiscount }, { transaction: t });
    await t.commit();

    const refreshed = await Appointment.findOne({
      where: { id: appointment.id },
      include: [{ model: Treatment.unscoped(), as: "treatment", include: [{ model: TreatmentItem.unscoped(), as: "items", include: [{ model: Service.unscoped(), as: "service", attributes: ["id", "name"] }] }] }],
    });

    res.json({ message: "Services synced", appointment: refreshed });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.getAppointments = async (req, res, next) => {
  try {
    const { Appointment, Patient, User, TreatmentPlan } = req.models;
    const { date, status } = req.query;
    const where = {};

    if (status) where.status = status;
    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end = new Date(date); end.setHours(23, 59, 59, 999);
      where.appointment_date = { [Op.between]: [start, end] };
    }

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: Patient.unscoped(), as: "patient" },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name", "phone"], where: { role: "doctor" }, required: false },
        { model: TreatmentPlan.unscoped(), as: "treatmentPlan" },
      ],
      order: [["appointment_date", "ASC"]],
    });

    res.json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentById = async (req, res, next) => {
  try {
    const { Appointment, Patient, User, Treatment, TreatmentPlan } = req.models;
    const appt = await Appointment.findOne({
      where: { id: req.params.id },
      include: [
        { model: Patient.unscoped(), as: "patient" },
        { model: User.unscoped(), as: "doctor", attributes: ["id", "full_name", "phone"], where: { role: "doctor" }, required: false },
        { model: TreatmentPlan.unscoped(), as: "treatmentPlan" },
        { model: Treatment.unscoped(), as: "treatment", required: false, attributes: ["id", "status", "total_amount", "discount_amount", "paid_amount", "treatment_date"] },
      ],
    });

    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    res.json(appt);
  } catch (err) {
    next(err);
  }
};

exports.assignDoctor = async (req, res, next) => {
  try {
    const { Appointment, User } = req.models;
    const appt = await Appointment.findOne({ where: { id: req.params.id } });
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    const doctorExists = await isDoctor(User, req.body.doctor_id);
    if (!doctorExists) return res.status(400).json({ message: "Invalid doctor_id" });

    appt.doctor_id = req.body.doctor_id;
    await appt.save();
    res.json(appt);
  } catch (err) {
    next(err);
  }
};

exports.getMyQueue = async (req, res, next) => {
  try {
    const { Appointment, Patient } = req.models;
    const doctorId = req.user.id;
    const { date, status } = req.query;

    const where = { doctor_id: doctorId };
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const start = new Date(targetDate); start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate); end.setHours(23, 59, 59, 999);
    where.appointment_date = { [Op.between]: [start, end] };
    if (status) where.status = status;

    const appointments = await Appointment.findAll({
      where,
      include: [{ model: Patient.unscoped(), as: "patient" }],
      order: [["appointment_date", "ASC"]],
    });

    res.json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { Appointment } = req.models;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) { await t.rollback(); return res.status(400).json({ message: "status required" }); }
    const validStatuses = ["confirmed", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status.toLowerCase())) { await t.rollback(); return res.status(400).json({ message: "Invalid status" }); }

    const appointment = await Appointment.findOne({ where: { id }, transaction: t });
    if (!appointment) { await t.rollback(); return res.status(404).json({ message: "Appointment not found" }); }

    if (req.user.role !== "admin" && req.user.role !== "reception" && appointment.doctor_id !== req.user.id) {
      await t.rollback(); return res.status(403).json({ message: "Not authorized" });
    }

    await appointment.update({ status }, { transaction: t });
    await t.commit();
    res.json({ message: "Status updated", appointment });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
