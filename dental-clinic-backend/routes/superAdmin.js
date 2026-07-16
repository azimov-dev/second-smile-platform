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
