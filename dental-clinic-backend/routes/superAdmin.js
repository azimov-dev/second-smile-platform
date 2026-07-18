const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const superAdminAuth = require("../middleware/superAdminAuth");
const { Clinic, Plan, Subscription, SubscriptionPayment, SuperAdmin, User, Patient, Appointment } = require("../models");

// ===== AUTH =====
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username and password required" });

    const admin = await SuperAdmin.findOne({ where: { username } });
    if (!admin || !admin.is_active) return res.status(400).json({ message: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.SUPER_ADMIN_JWT_SECRET || "super-admin-secret",
      { expiresIn: "24h" },
    );

    res.json({ success: true, token, admin: { id: admin.id, username: admin.username, full_name: admin.full_name } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// All routes below require super admin auth
router.use(superAdminAuth);

// ===== DASHBOARD =====
router.get("/dashboard", async (req, res) => {
  try {
    const total_clinics = await Clinic.count();
    const active_clinics = await Clinic.count({ where: { is_active: true } });
    const total_users = await User.count();

    const { sequelize } = require("../models");
    const [mrrResult] = await sequelize.query(`
      SELECT COALESCE(SUM(p.price_monthly), 0) as mrr
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);

    const recent_payments = await SubscriptionPayment.findAll({
      include: [{ model: Clinic, as: "clinic", attributes: ["id", "name"] }],
      order: [["created_at", "DESC"]],
      limit: 10,
    });

    res.json({
      total_clinics,
      active_clinics,
      total_users,
      mrr: Number(mrrResult[0]?.mrr) || 0,
      recent_payments: recent_payments.map((p) => ({
        id: p.id,
        clinic_name: p.clinic?.name,
        clinic_id: p.clinic_id,
        amount: p.amount,
        status: p.status,
        paid_at: p.paid_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== STATISTICS =====

// Enhanced overview stats for dashboard
router.get("/stats/overview", async (req, res) => {
  try {
    const { sequelize, Op } = require("../models");
    const { Treatment } = require("../models");

    // Basic counts
    const total_clinics = await Clinic.count();
    const active_clinics = await Clinic.count({ where: { is_active: true } });
    const total_users = await User.count();
    const total_patients = await Patient.count();
    const total_appointments = await Appointment.count();

    // MRR
    const [mrrResult] = await sequelize.query(`
      SELECT COALESCE(SUM(p.price_monthly), 0) as mrr
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
    `);
    const mrr = Number(mrrResult[0]?.mrr) || 0;

    // Clinics growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [clinicsGrowth] = await sequelize.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM clinics
      WHERE created_at >= :sixMonthsAgo
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `, { replacements: { sixMonthsAgo } });

    // Revenue trend (last 6 months)
    const [revenueTrend] = await sequelize.query(`
      SELECT
        TO_CHAR(paid_at, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as revenue
      FROM subscription_payments
      WHERE status = 'completed' AND paid_at >= :sixMonthsAgo
      GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
      ORDER BY month
    `, { replacements: { sixMonthsAgo } });

    // Subscription status distribution
    const [subStatusDist] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM subscriptions
      GROUP BY status
    `);

    // Top 5 clinics by appointments
    const [topClinics] = await sequelize.query(`
      SELECT c.id, c.name, COUNT(a.id) as appointments_count
      FROM clinics c
      LEFT JOIN appointments a ON c.id = a.clinic_id
      GROUP BY c.id, c.name
      ORDER BY appointments_count DESC
      LIMIT 5
    `);

    // Expiring soon (within 7 days)
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const expiringSoon = await Subscription.findAll({
      where: {
        status: { [Op.in]: ['active', 'trial'] },
        current_period_end: { [Op.between]: [new Date(), sevenDaysLater] }
      },
      include: [
        { model: Clinic, as: "clinic", attributes: ["id", "name"] },
        { model: Plan, as: "plan", attributes: ["name"] }
      ],
      order: [["current_period_end", "ASC"]],
      limit: 10
    });

    res.json({
      total_clinics,
      active_clinics,
      total_users,
      total_patients,
      total_appointments,
      mrr,
      clinics_growth: clinicsGrowth,
      revenue_trend: revenueTrend,
      subscription_status: subStatusDist,
      top_clinics: topClinics,
      expiring_soon: expiringSoon.map(s => ({
        id: s.id,
        clinic_name: s.clinic?.name,
        clinic_id: s.clinic_id,
        plan_name: s.plan?.name,
        expires_at: s.current_period_end,
        days_left: Math.ceil((new Date(s.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
      }))
    });
  } catch (err) {
    console.error("stats/overview error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Revenue analytics
router.get("/stats/revenue", async (req, res) => {
  try {
    const { sequelize } = require("../models");
    const months = parseInt(req.query.months) || 12;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Monthly revenue
    const [monthlyRevenue] = await sequelize.query(`
      SELECT
        TO_CHAR(paid_at, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as payment_count
      FROM subscription_payments
      WHERE status = 'completed' AND paid_at >= :startDate
      GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
      ORDER BY month
    `, { replacements: { startDate } });

    // Revenue by plan
    const [revenueByPlan] = await sequelize.query(`
      SELECT
        p.name as plan_name,
        COALESCE(SUM(sp.amount), 0) as total_revenue
      FROM subscription_payments sp
      JOIN subscriptions s ON sp.subscription_id = s.id
      JOIN plans p ON s.plan_id = p.id
      WHERE sp.status = 'completed'
      GROUP BY p.name
      ORDER BY total_revenue DESC
    `);

    // Payment success rate
    const [paymentStats] = await sequelize.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM subscription_payments
      GROUP BY status
    `);

    const totalPayments = paymentStats.reduce((sum, p) => sum + parseInt(p.count), 0);
    const completedPayments = paymentStats.find(p => p.status === 'completed')?.count || 0;
    const successRate = totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(1) : 0;

    // Total revenue all time
    const [totalResult] = await sequelize.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM subscription_payments
      WHERE status = 'completed'
    `);

    res.json({
      monthly_revenue: monthlyRevenue,
      revenue_by_plan: revenueByPlan,
      payment_stats: paymentStats,
      success_rate: parseFloat(successRate),
      total_revenue: Number(totalResult[0]?.total) || 0
    });
  } catch (err) {
    console.error("stats/revenue error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Subscription health
router.get("/stats/subscriptions", async (req, res) => {
  try {
    const { sequelize, Op } = require("../models");

    // Status breakdown
    const [statusBreakdown] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM subscriptions
      GROUP BY status
    `);

    // Expiring within 7 days
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);

    const expiringIn7Days = await Subscription.count({
      where: {
        status: { [Op.in]: ['active', 'trial'] },
        current_period_end: { [Op.between]: [new Date(), sevenDays] }
      }
    });

    // Expiring within 30 days
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const expiringIn30Days = await Subscription.count({
      where: {
        status: { [Op.in]: ['active', 'trial'] },
        current_period_end: { [Op.between]: [new Date(), thirtyDays] }
      }
    });

    // Churn rate (cancellations per month, last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [churnData] = await sequelize.query(`
      SELECT
        TO_CHAR(cancelled_at, 'YYYY-MM') as month,
        COUNT(*) as cancellations
      FROM subscriptions
      WHERE cancelled_at >= :sixMonthsAgo
      GROUP BY TO_CHAR(cancelled_at, 'YYYY-MM')
      ORDER BY month
    `, { replacements: { sixMonthsAgo } });

    // Plan popularity
    const [planPopularity] = await sequelize.query(`
      SELECT
        p.name,
        COUNT(s.id) as subscriber_count
      FROM plans p
      LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.status IN ('active', 'trial')
      GROUP BY p.id, p.name
      ORDER BY subscriber_count DESC
    `);

    res.json({
      status_breakdown: statusBreakdown,
      expiring_in_7_days: expiringIn7Days,
      expiring_in_30_days: expiringIn30Days,
      churn_data: churnData,
      plan_popularity: planPopularity
    });
  } catch (err) {
    console.error("stats/subscriptions error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Platform activity
router.get("/stats/activity", async (req, res) => {
  try {
    const { sequelize } = require("../models");
    const { Treatment } = require("../models");

    // Total counts
    const total_patients = await Patient.count();
    const total_appointments = await Appointment.count();
    const total_treatments = await Treatment.count();

    // Appointments by status
    const [appointmentsByStatus] = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM appointments
      GROUP BY status
    `);

    // Activity trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [activityTrend] = await sequelize.query(`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as appointments
      FROM appointments
      WHERE "createdAt" >= :sixMonthsAgo
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month
    `, { replacements: { sixMonthsAgo } });

    // Most active clinics
    const [mostActiveClinics] = await sequelize.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT p.id) as patients,
        COUNT(DISTINCT a.id) as appointments,
        COUNT(DISTINCT t.id) as treatments
      FROM clinics c
      LEFT JOIN patients p ON c.id = p.clinic_id
      LEFT JOIN appointments a ON c.id = a.clinic_id
      LEFT JOIN treatments t ON c.id = t.clinic_id
      GROUP BY c.id, c.name
      ORDER BY appointments DESC
      LIMIT 10
    `);

    res.json({
      total_patients,
      total_appointments,
      total_treatments,
      appointments_by_status: appointmentsByStatus,
      activity_trend: activityTrend,
      most_active_clinics: mostActiveClinics
    });
  } catch (err) {
    console.error("stats/activity error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== CLINICS =====
router.get("/clinics", async (req, res) => {
  try {
    const clinics = await Clinic.findAll({
      include: [{ model: Subscription, as: "subscriptions", include: [{ model: Plan, as: "plan" }] }],
      order: [["id", "DESC"]],
    });
    const result = clinics.map((c) => {
      const plain = c.toJSON();
      const activeSub = plain.subscriptions?.find((s) => s.status === "active" || s.status === "trial");
      plain.subscription = activeSub || plain.subscriptions?.[0] || null;
      delete plain.subscriptions;
      return plain;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/clinics/:id", async (req, res) => {
  try {
    const clinic = await Clinic.findByPk(req.params.id, {
      include: [{ model: Subscription, as: "subscriptions", include: [{ model: Plan, as: "plan" }] }],
    });
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });
    const plain = clinic.toJSON();
    const activeSub = plain.subscriptions?.find((s) => s.status === "active" || s.status === "trial");
    plain.subscription = activeSub || plain.subscriptions?.[0] || null;
    delete plain.subscriptions;
    res.json(plain);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/clinics", async (req, res) => {
  try {
    const { name, slug, owner_phone, address, plan_id, admin_full_name, admin_phone, admin_password } = req.body;

    if (!name || !slug) return res.status(400).json({ message: "name and slug required" });
    if (!admin_phone || !admin_password) return res.status(400).json({ message: "admin_phone and admin_password required" });

    const existing = await Clinic.findOne({ where: { slug } });
    if (existing) return res.status(409).json({ message: "Clinic with this slug already exists" });

    const clinic = await Clinic.create({ name, slug, owner_phone, address, is_active: true });

    // Create the clinic's first admin user
    const hashed = await bcrypt.hash(admin_password, 10);
    await User.create({
      clinic_id: clinic.id,
      full_name: admin_full_name || "Admin",
      phone: admin_phone,
      password: hashed,
      role: "admin",
    });

    // Create subscription
    if (plan_id) {
      const plan = await Plan.findByPk(plan_id);
      if (plan) {
        await Subscription.create({
          clinic_id: clinic.id,
          plan_id: plan.id,
          status: "active",
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }
    }

    res.status(201).json(clinic);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

async function updateClinic(req, res) {
  try {
    const clinic = await Clinic.findByPk(req.params.id);
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });

    const { name, slug, is_active, address, owner_phone, logo_url } = req.body;
    if (name !== undefined) clinic.name = name;
    if (slug !== undefined) clinic.slug = slug;
    if (is_active !== undefined) clinic.is_active = is_active;
    if (address !== undefined) clinic.address = address;
    if (owner_phone !== undefined) clinic.owner_phone = owner_phone;
    if (logo_url !== undefined) clinic.logo_url = logo_url;

    await clinic.save();
    res.json(clinic);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
router.patch("/clinics/:id", updateClinic);
router.put("/clinics/:id", updateClinic);

router.get("/clinics/:id/stats", async (req, res) => {
  try {
    const clinicId = req.params.id;
    const doctors = await User.count({ where: { clinic_id: clinicId, role: "doctor" } });
    const patients = await Patient.count({ where: { clinic_id: clinicId } });
    const appointments = await Appointment.count({ where: { clinic_id: clinicId } });

    res.json({ doctors, patients, appointments });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== CLINIC SUBSCRIPTION MANAGEMENT =====
router.post("/clinics/:id/subscription", async (req, res) => {
  try {
    const { plan_id, duration_days } = req.body;
    const clinicId = req.params.id;

    if (!plan_id) return res.status(400).json({ message: "plan_id required" });

    const clinic = await Clinic.findByPk(clinicId);
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });

    const plan = await Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Deactivate any existing active subscription
    await Subscription.update(
      { status: "cancelled" },
      { where: { clinic_id: clinicId, status: ["active", "trial"] } },
    );

    // Create new active subscription
    const days = duration_days || 30;
    const sub = await Subscription.create({
      clinic_id: clinicId,
      plan_id: plan.id,
      status: "active",
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    });

    res.status(201).json(sub);
  } catch (err) {
    console.error("POST /clinics/:id/subscription error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/clinics/:id/subscription", async (req, res) => {
  try {
    const clinicId = req.params.id;
    await Subscription.update(
      { status: "cancelled", cancelled_at: new Date() },
      { where: { clinic_id: clinicId, status: ["active", "trial"] } },
    );
    res.json({ message: "Subscription cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== PLANS =====
router.get("/plans", async (req, res) => {
  try {
    const plans = await Plan.findAll({ order: [["price_monthly", "ASC"]] });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/plans", async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

async function updatePlan(req, res) {
  try {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    await plan.update(req.body);
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
router.patch("/plans/:id", updatePlan);
router.put("/plans/:id", updatePlan);

// ===== SUBSCRIPTIONS =====
router.get("/subscriptions", async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      include: [
        { model: Clinic, as: "clinic", attributes: ["id", "name", "slug"] },
        { model: Plan, as: "plan" },
      ],
      order: [["created_at", "DESC"]],
    });
    res.json(subscriptions);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const payments = await SubscriptionPayment.findAll({
      include: [{ model: Clinic, as: "clinic", attributes: ["id", "name", "slug"] }],
      order: [["created_at", "DESC"]],
      limit: 100,
    });
    res.json(payments.map((p) => {
      const plain = p.toJSON();
      plain.clinic_name = plain.clinic?.name;
      return plain;
    }));
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===== USERS =====
router.get("/users", async (req, res) => {
  try {
    const where = {};
    if (req.query.clinic_id) where.clinic_id = req.query.clinic_id;

    const users = await User.findAll({
      where,
      attributes: ["id", "clinic_id", "full_name", "phone", "role"],
      include: [{ model: Clinic, as: "clinic", attributes: ["id", "name"] }],
      order: [["id", "DESC"]],
    });
    res.json(users.map((u) => {
      const plain = u.toJSON();
      plain.clinic_name = plain.clinic?.name;
      delete plain.clinic;
      return plain;
    }));
  } catch (err) {
    console.error("GET /users error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { clinic_id, full_name, phone, password, role } = req.body;
    if (!clinic_id || !full_name || !phone || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existing = await User.findOne({ where: { clinic_id, phone } });
    if (existing) return res.status(409).json({ message: "User with this phone already exists in this clinic" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ clinic_id, full_name, phone, password: hashed, role });
    res.status(201).json({ id: user.id, clinic_id, full_name, phone, role });
  } catch (err) {
    console.error("POST /users error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.destroy();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
