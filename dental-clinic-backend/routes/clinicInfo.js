const router = require("express").Router();
const { Op } = require("sequelize");
const auth = require("../middleware/authMiddleware");
const { buildCheckoutUrl } = require("../utils/clickHelper");

router.get("/info", async (req, res) => {
  const clinic = req.clinic;
  res.json({
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    logo_url: clinic.logo_url,
    address: clinic.address,
    settings: clinic.settings,
  });
});

router.get("/subscription", auth, async (req, res) => {
  const db = require("../models");
  const subscription = await db.Subscription.findOne({
    where: { clinic_id: req.clinicId, status: { [Op.in]: ["active", "trial", "past_due"] } },
    include: [{ model: db.Plan, as: "plan" }],
    order: [["created_at", "DESC"]],
  });

  if (!subscription) return res.json(null);
  res.json(subscription);
});

router.get("/plans", async (req, res) => {
  const db = require("../models");
  const plans = await db.Plan.findAll({
    where: { is_active: true },
    order: [["price_monthly", "ASC"]],
  });
  res.json(plans);
});

router.get("/usage", auth, async (req, res) => {
  const db = require("../models");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [doctors, patients, appointments] = await Promise.all([
    db.User.count({ where: { clinic_id: req.clinicId, role: "doctor" } }),
    db.Patient.count({ where: { clinic_id: req.clinicId } }),
    db.Appointment.count({
      where: {
        clinic_id: req.clinicId,
        appointment_date: { [Op.between]: [startOfMonth, endOfMonth] },
      },
    }),
  ]);

  res.json({ doctors, patients, appointments_this_month: appointments });
});

router.post("/pay", auth, async (req, res) => {
  const db = require("../models");
  const { plan_id } = req.body;

  const plan = plan_id
    ? await db.Plan.findByPk(plan_id)
    : null;

  let subscription = await db.Subscription.findOne({
    where: { clinic_id: req.clinicId },
    include: [{ model: db.Plan, as: "plan" }],
    order: [["created_at", "DESC"]],
  });

  if (plan_id && plan && (!subscription || subscription.plan_id !== plan_id)) {
    subscription = await db.Subscription.create({
      clinic_id: req.clinicId,
      plan_id: plan.id,
      status: "pending",
      current_period_start: new Date(),
      current_period_end: new Date(),
    });
    subscription.plan = plan;
  }

  if (!subscription) {
    return res.status(400).json({ message: "No subscription found" });
  }

  const amount = subscription.plan.price_monthly;
  const returnUrl = req.headers.origin || "https://second-smile.uz";

  const url = buildCheckoutUrl({
    subscriptionId: subscription.id,
    amount,
    returnUrl,
  });

  res.json({ checkout_url: url });
});

module.exports = router;
