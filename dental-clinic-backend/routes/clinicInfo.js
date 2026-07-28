const router = require("express").Router();
const { Op } = require("sequelize");
const auth = require("../middleware/authMiddleware");
const { buildCheckoutUrl } = require("../utils/clickHelper");

router.get("/info", async (req, res) => {
  const db = require("../models");
  const clinic = req.clinic;

  // Get subscription info
  const subscription = await db.Subscription.findOne({
    where: { clinic_id: clinic.id },
    include: [{ model: db.Plan, as: "plan" }],
    order: [["created_at", "DESC"]],
  });

  let subscriptionInfo = null;
  if (subscription) {
    const daysLeft = subscription.current_period_end
      ? Math.ceil((new Date(subscription.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    subscriptionInfo = {
      status: subscription.status,
      plan_name: subscription.plan?.name,
      current_period_end: subscription.current_period_end,
      days_left: daysLeft,
      is_trial: subscription.status === "trial",
    };

    console.log(`[/clinic/info] ${clinic.slug}:`, {
      sub_id: subscription.id,
      status: subscription.status,
      period_end: subscription.current_period_end,
      days_left: daysLeft
    });
  }

  res.json({
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    logo_url: clinic.logo_url,
    address: clinic.address,
    settings: clinic.settings,
    subscription: subscriptionInfo,
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

  if (!plan_id) {
    return res.status(400).json({ message: "plan_id required" });
  }

  const plan = await db.Plan.findByPk(plan_id);
  if (!plan) {
    return res.status(404).json({ message: "Plan not found" });
  }

  // Get existing subscription
  let subscription = await db.Subscription.findOne({
    where: { clinic_id: req.clinicId },
    include: [{ model: db.Plan, as: "plan" }],
  });

  // If no subscription exists, create one with current period (don't change if already exists)
  if (!subscription) {
    const trialDays = plan.trial_days || 14;
    subscription = await db.Subscription.create({
      clinic_id: req.clinicId,
      plan_id: plan.id,
      status: "trial",
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      trial_ends_at: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
    });
    subscription.plan = plan;
  }

  // Build payment URL with selected plan (payment callback will update the subscription)
  const amount = plan.price_monthly;
  const returnUrl = req.headers.origin || "https://second-smile.uz";

  const url = buildCheckoutUrl({
    subscriptionId: subscription.id,
    planId: plan.id,
    amount,
    returnUrl,
  });

  res.json({ checkout_url: url });
});

module.exports = router;
