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
    // Add clinic_id column with default 1 to all tenant tables
    for (const table of TENANT_TABLES) {
      await queryInterface.addColumn(table, "clinic_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: { model: "clinics", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });

      // Add index on clinic_id
      await queryInterface.addIndex(table, ["clinic_id"], {
        name: `idx_${table}_clinic_id`,
      });
    }

    // Remove the old unique constraint on users.phone and add composite unique
    try {
      await queryInterface.removeConstraint("users", "users_phone_key");
    } catch (e) {
      // Constraint might have a different name
      try {
        await queryInterface.removeIndex("users", "users_phone_unique");
      } catch (e2) {
        // If neither exists, the unique was defined differently
      }
    }

    await queryInterface.addConstraint("users", {
      fields: ["clinic_id", "phone"],
      type: "unique",
      name: "users_clinic_id_phone_unique",
    });

    // Remove default value from clinic_id after backfill
    for (const table of TENANT_TABLES) {
      await queryInterface.changeColumn(table, "clinic_id", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: null,
        references: { model: "clinics", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove composite unique and restore old unique on phone
    await queryInterface.removeConstraint("users", "users_clinic_id_phone_unique");
    await queryInterface.addConstraint("users", {
      fields: ["phone"],
      type: "unique",
      name: "users_phone_key",
    });

    // Remove clinic_id from all tables
    for (const table of TENANT_TABLES) {
      await queryInterface.removeIndex(table, `idx_${table}_clinic_id`);
      await queryInterface.removeColumn(table, "clinic_id");
    }
  },
};
