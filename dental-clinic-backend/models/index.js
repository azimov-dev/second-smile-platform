const Sequelize = require("sequelize");
const sequelize = require("../db");

const db = {};

// Tenant-scoped models
db.User = require("./User")(sequelize, Sequelize.DataTypes);
db.Patient = require("./Patient")(sequelize, Sequelize.DataTypes);
db.Service = require("./Service")(sequelize, Sequelize.DataTypes);
db.ServiceCategory = require("./ServiceCategory")(sequelize, Sequelize.DataTypes);
db.Appointment = require("./Appointment")(sequelize, Sequelize.DataTypes);
db.DoctorSchedule = require("./DoctorSchedule")(sequelize, Sequelize.DataTypes);
db.Treatment = require("./Treatment")(sequelize, Sequelize.DataTypes);
db.TreatmentItem = require("./TreatmentItem")(sequelize, Sequelize.DataTypes);
db.Payment = require("./Payment")(sequelize, Sequelize.DataTypes);
db.TreatmentPlan = require("./TreatmentPlan")(sequelize, Sequelize.DataTypes);

// Platform models (not tenant-scoped)
db.Clinic = require("./Clinic")(sequelize, Sequelize.DataTypes);
db.Plan = require("./Plan")(sequelize, Sequelize.DataTypes);
db.Subscription = require("./Subscription")(sequelize, Sequelize.DataTypes);
db.SubscriptionPayment = require("./SubscriptionPayment")(sequelize, Sequelize.DataTypes);
db.SuperAdmin = require("./SuperAdmin")(sequelize, Sequelize.DataTypes);

const {
  User,
  Patient,
  Service,
  ServiceCategory,
  Appointment,
  DoctorSchedule,
  Treatment,
  TreatmentItem,
  Payment,
  TreatmentPlan,
  Clinic,
  Plan,
  Subscription,
  SubscriptionPayment,
} = db;

// ============= CLINIC ASSOCIATIONS ============= //

// Clinic has many tenant-scoped entities
Clinic.hasMany(User, { foreignKey: "clinic_id", as: "users" });
User.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(Patient, { foreignKey: "clinic_id", as: "patients" });
Patient.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(Service, { foreignKey: "clinic_id", as: "services" });
Service.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(ServiceCategory, { foreignKey: "clinic_id", as: "serviceCategories" });
ServiceCategory.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(Appointment, { foreignKey: "clinic_id", as: "appointments" });
Appointment.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(Treatment, { foreignKey: "clinic_id", as: "treatments" });
Treatment.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(TreatmentItem, { foreignKey: "clinic_id", as: "treatmentItems" });
TreatmentItem.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(TreatmentPlan, { foreignKey: "clinic_id", as: "treatmentPlans" });
TreatmentPlan.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(Payment, { foreignKey: "clinic_id", as: "payments" });
Payment.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Clinic.hasMany(DoctorSchedule, { foreignKey: "clinic_id", as: "doctorSchedules" });
DoctorSchedule.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

// ============= SUBSCRIPTION ASSOCIATIONS ============= //

Clinic.hasMany(Subscription, { foreignKey: "clinic_id", as: "subscriptions" });
Subscription.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

Plan.hasMany(Subscription, { foreignKey: "plan_id", as: "subscriptions" });
Subscription.belongsTo(Plan, { foreignKey: "plan_id", as: "plan" });

Subscription.hasMany(SubscriptionPayment, { foreignKey: "subscription_id", as: "payments" });
SubscriptionPayment.belongsTo(Subscription, { foreignKey: "subscription_id", as: "subscription" });

Clinic.hasMany(SubscriptionPayment, { foreignKey: "clinic_id", as: "subscriptionPayments" });
SubscriptionPayment.belongsTo(Clinic, { foreignKey: "clinic_id", as: "clinic" });

// ============= EXISTING ASSOCIATIONS ============= //

// Patient <-> Appointment
Appointment.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });
Patient.hasMany(Appointment, { foreignKey: "patient_id", as: "appointments" });

// Doctor (User) <-> Appointment
Appointment.belongsTo(User, { foreignKey: "doctor_id", as: "doctor" });
User.hasMany(Appointment, { foreignKey: "doctor_id", as: "appointments" });

// TreatmentPlan <-> Patient
TreatmentPlan.belongsTo(Patient, { foreignKey: "patient_id", as: "patient" });
Patient.hasMany(TreatmentPlan, { foreignKey: "patient_id", as: "treatment_plans" });

// TreatmentPlan <-> Doctor (User)
TreatmentPlan.belongsTo(User, { foreignKey: "doctor_id", as: "doctor" });
User.hasMany(TreatmentPlan, { foreignKey: "doctor_id", as: "treatment_plans" });

// TreatmentPlan <-> Appointment
Appointment.belongsTo(TreatmentPlan, { foreignKey: "treatment_plan_id", as: "treatmentPlan" });
TreatmentPlan.hasMany(Appointment, { foreignKey: "treatment_plan_id", as: "appointments" });

// Doctor <-> DoctorSchedule
User.hasMany(DoctorSchedule, { foreignKey: "doctor_id", as: "schedules", onDelete: "CASCADE" });
DoctorSchedule.belongsTo(User, { foreignKey: "doctor_id", as: "doctor" });
DoctorSchedule.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// Service <-> ServiceCategory
Service.belongsTo(ServiceCategory, { foreignKey: "category_id", as: "category" });
ServiceCategory.hasMany(Service, { foreignKey: "category_id", as: "services" });

// Appointment <-> Treatment (1:1)
Appointment.hasOne(Treatment, { foreignKey: "appointment_id", as: "treatment", onDelete: "CASCADE" });
Treatment.belongsTo(Appointment, { foreignKey: "appointment_id", as: "appointment" });

// Treatment <-> TreatmentItem
Treatment.hasMany(TreatmentItem, { foreignKey: "treatment_id", as: "items", onDelete: "CASCADE" });
TreatmentItem.belongsTo(Treatment, { foreignKey: "treatment_id" });

// TreatmentItem <-> Service
TreatmentItem.belongsTo(Service, { foreignKey: "service_id", as: "service" });
Service.hasMany(TreatmentItem, { foreignKey: "service_id", as: "treatment_items" });

// Treatment <-> Payment
Treatment.hasMany(Payment, { foreignKey: "treatment_id", as: "payments", onDelete: "CASCADE" });
Payment.belongsTo(Treatment, { foreignKey: "treatment_id", as: "treatment" });

// Export
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
