"use strict";

const TENANT_TABLES = [
  "users",
  "patients",
  "services",
  "service_categories",
  "appointments",
  "treatments",
  "TreatmentItems",
  "treatment_plans",
  "payments",
  "doctor_schedules",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add clinic_id indexes to all tenant tables
    for (const table of TENANT_TABLES) {
      await queryInterface.addIndex(table, ["clinic_id"], {
        name: `idx_${table}_clinic_id`,
      });
    }

    // Add composite unique constraint on users (clinic_id, phone)
    await queryInterface.addConstraint("users", {
      fields: ["clinic_id", "phone"],
      type: "unique",
      name: "users_clinic_id_phone_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("users", "users_clinic_id_phone_unique");

    for (const table of TENANT_TABLES) {
      await queryInterface.removeIndex(table, `idx_${table}_clinic_id`);
    }
  },
};
