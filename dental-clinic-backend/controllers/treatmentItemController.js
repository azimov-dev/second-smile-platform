const { sequelize } = require("../models");

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

exports.getTreatmentItems = async (req, res, next) => {
  try {
    const { Treatment, TreatmentItem, Appointment, Service } = req.models;
    const appointmentId = req.query.appointment_id;
    if (!appointmentId) return res.status(400).json({ message: "appointment_id required" });

    const treatment = await Treatment.findOne({
      where: { appointment_id: appointmentId },
      include: [{ model: Appointment.unscoped(), as: "appointment" }],
    });

    if (!treatment || !treatment.appointment) return res.status(404).json({ message: "Treatment not found" });

    const isAdminOrReception = ["admin", "reception"].includes(req.user.role);
    const isOwnDoctor = treatment.appointment.doctor_id === req.user.id;
    if (!isAdminOrReception && !isOwnDoctor) return res.status(403).json({ message: "Forbidden" });

    const items = await TreatmentItem.findAll({
      where: { treatment_id: treatment.id },
      include: [{ model: Service.unscoped(), as: "service", attributes: ["id", "name", "price", "category_id", "is_active"] }],
      order: [["id", "ASC"]],
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.deleteTreatmentItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { TreatmentItem, Treatment, Appointment } = req.models;
    const { id } = req.params;

    const item = await TreatmentItem.findOne({
      where: { id },
      include: [{ model: Treatment.unscoped(), include: [{ model: Appointment.unscoped(), as: "appointment" }] }],
      transaction: t,
    });

    if (!item) { await t.rollback(); return res.status(404).json({ message: "Item not found" }); }
    if (!item.Treatment || !item.Treatment.appointment) { await t.rollback(); return res.status(500).json({ message: "Item is missing relations" }); }

    const isAuthorized = req.user.role === "admin" || req.user.role === "reception" || item.Treatment.appointment.doctor_id === req.user.id;
    if (!isAuthorized) { await t.rollback(); return res.status(403).json({ message: "Forbidden" }); }

    if (["completed", "cancelled"].includes(item.Treatment.status)) {
      await t.rollback(); return res.status(400).json({ message: "Cannot delete items for a closed treatment" });
    }

    const treatmentId = item.treatment_id;
    const removeAmount = toNumber(item.price_at_time) * toNumber(item.quantity);

    await item.destroy({ transaction: t });

    const db = require("../models");
    await db.Treatment.increment({ total_amount: -removeAmount }, { where: { id: treatmentId }, transaction: t });

    await t.commit();
    return res.status(204).end();
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
