require("dotenv").config();
const express = require("express");
const app = express();
const sequelize = require("./db");
const models = require("./models");
const cors = require("cors");

// Middleware
const tenantMiddleware = require("./middleware/tenantMiddleware");
const scopeMiddleware = require("./middleware/scopeMiddleware");
const subscriptionMiddleware = require("./middleware/subscriptionMiddleware");
const errorHandler = require("./middleware/errorHandler");

// CORS — allow *.second-smile.uz subdomains + localhost
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = [
        /^https?:\/\/localhost:\d+$/,
        /^https:\/\/([a-z0-9-]+\.)?second-smile\.uz$/,
        /^https:\/\/admin\.second-smile\.uz$/,
        /^https:\/\/second-smile[a-z0-9-]*\.vercel\.app$/,
      ];
      if (allowed.some((pattern) => pattern.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Clinic-Slug"],
    credentials: true,
  }),
);

const setupSwagger = require("./swagger");
setupSwagger(app);

app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const serviceRoutes = require("./routes/services");
const serviceCategoryRoutes = require("./routes/serviceCategories");
const patientRoutes = require("./routes/patients");
const appointmentRoutes = require("./routes/appointments");
const treatmentRoutes = require("./routes/treatments");
const treatmentItemRoutes = require("./routes/treatmentItems");
const paymentRoutes = require("./routes/payments");
const treatmentPlanRoutes = require("./routes/treatmentPlans");
const doctorRoutes = require("./routes/doctor");
const adminUserRoutes = require("./routes/adminUsers");
const doctorScheduleRoutes = require("./routes/doctorSchedules");
const aiChatRouter = require("./routes/aiChat.js");
const superAdminRoutes = require("./routes/superAdmin");
const clinicInfoRoutes = require("./routes/clinicInfo");
const clickWebhookRoutes = require("./routes/clickWebhook");

// Tenant-scoped routes (tenant resolution + subscription check + model scoping)
const tenantStack = [tenantMiddleware, subscriptionMiddleware, scopeMiddleware];

app.use("/api/auth", tenantMiddleware, scopeMiddleware, authRoutes);
app.use("/api/services", ...tenantStack, serviceRoutes);
app.use("/api/service-categories", ...tenantStack, serviceCategoryRoutes);
app.use("/api/patients", ...tenantStack, patientRoutes);
app.use("/api/appointments", ...tenantStack, appointmentRoutes);
app.use("/api/treatments", ...tenantStack, treatmentRoutes);
app.use("/api/treatment-items", ...tenantStack, treatmentItemRoutes);
app.use("/api/payments", ...tenantStack, paymentRoutes);
app.use("/api/treatment-plans", ...tenantStack, treatmentPlanRoutes);
app.use("/api/doctor", ...tenantStack, doctorRoutes);
app.use("/api/admin/users", ...tenantStack, adminUserRoutes);
app.use("/api/doctor-schedules", ...tenantStack, doctorScheduleRoutes);
app.use("/api/ai", ...tenantStack, aiChatRouter);

// Public clinic info endpoint (tenant-aware but no subscription check)
app.use("/api/clinic", tenantMiddleware, clinicInfoRoutes);

// Click payment webhooks (no tenant middleware — identified by merchant_trans_id)
app.use("/api/click", clickWebhookRoutes);

// Super admin routes (no tenant middleware)
app.use("/api/super-admin", superAdminRoutes);

// Test endpoint
app.get("/test", async (req, res) => {
  res.send("Backend v2 is working!");
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

sequelize
  .authenticate()
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database", err);
    process.exit(1);
  });
