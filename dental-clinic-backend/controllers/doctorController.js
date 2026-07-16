const { Op } = require("sequelize");

exports.getDashboardStats = async (req, res, next) => {
  try {
    const { Treatment, Payment } = req.models;
    const doctorId = req.user.id;
    const { from, to } = req.query;

    const where = { doctor_id: doctorId };
    if (from || to) {
      where.treatment_date = {};
      if (from) where.treatment_date[Op.gte] = new Date(from);
      if (to) { const toDate = new Date(to); toDate.setDate(toDate.getDate() + 1); where.treatment_date[Op.lt] = toDate; }
    }

    const treatments = await Treatment.findAll({
      where,
      include: [{ model: Payment.unscoped(), as: "payments", attributes: ["amount"] }],
    });

    let totalRevenue = 0, totalPaid = 0, totalDebt = 0;
    for (const t of treatments) {
      const total = t.total_amount || 0;
      const discount = t.discount_amount || 0;
      const paidFromPayments = t.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const paid = t.paid_amount || paidFromPayments;
      const revenue = total - discount;
      totalRevenue += revenue;
      totalPaid += paid;
      totalDebt += revenue - paid;
    }

    res.json({ totalRevenue, totalPaid, totalDebt });
  } catch (err) {
    next(err);
  }
};

exports.getCalendarSummary = async (req, res, next) => {
  try {
    const { Appointment } = req.models;
    const doctorId = req.user.id;
    const { from, to } = req.query;

    if (!from || !to) return res.status(400).json({ message: "from and to required" });

    const where = { doctor_id: doctorId, appointment_date: {} };
    where.appointment_date[Op.gte] = new Date(from);
    const toDate = new Date(to); toDate.setDate(toDate.getDate() + 1);
    where.appointment_date[Op.lt] = toDate;

    const appointments = await Appointment.findAll({ where });
    const result = {};
    for (const a of appointments) {
      const d = a.appointment_date.toISOString().split("T")[0];
      result[d] = (result[d] || 0) + 1;
    }

    res.json(Object.entries(result).map(([date, count]) => ({ date, count })));
  } catch (err) {
    next(err);
  }
};

exports.getDayAppointments = async (req, res, next) => {
  try {
    const { Appointment, Patient } = req.models;
    const doctorId = req.user.id;
    const dateStr = req.params.date;

    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(start); end.setDate(end.getDate() + 1);

    const items = await Appointment.findAll({
      where: { doctor_id: doctorId, appointment_date: { [Op.gte]: start, [Op.lt]: end } },
      include: [{ model: Patient.unscoped(), as: "patient" }],
      order: [["appointment_date", "ASC"]],
    });

    res.json(items);
  } catch (err) {
    next(err);
  }
};
