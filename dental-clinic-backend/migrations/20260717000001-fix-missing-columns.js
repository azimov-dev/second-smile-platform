"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing patient_id and doctor_id to appointments
    await queryInterface.addColumn("appointments", "patient_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "patients", key: "id" },
      onDelete: "CASCADE",
    });
    await queryInterface.addColumn("appointments", "doctor_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    });

    // Fix timestamps: rename camelCase to snake_case where needed
    // appointments
    const appointmentsCols = await queryInterface.describeTable("appointments");
    if (appointmentsCols.createdAt && !appointmentsCols.created_at) {
      await queryInterface.renameColumn("appointments", "createdAt", "created_at");
      await queryInterface.renameColumn("appointments", "updatedAt", "updated_at");
    }

    // treatments
    const treatmentsCols = await queryInterface.describeTable("treatments");
    if (treatmentsCols.createdAt && !treatmentsCols.created_at) {
      await queryInterface.renameColumn("treatments", "createdAt", "created_at");
      await queryInterface.renameColumn("treatments", "updatedAt", "updated_at");
    }

    // TreatmentItems — also fix table name if needed
    const tables = await queryInterface.showAllTables();
    const tiTable = tables.includes("TreatmentItems") ? "TreatmentItems" : "treatment_items";
    if (tables.includes("TreatmentItems")) {
      await queryInterface.renameTable("TreatmentItems", "treatment_items");
    }
    const tiCols = await queryInterface.describeTable("treatment_items");
    if (tiCols.createdAt && !tiCols.created_at) {
      await queryInterface.renameColumn("treatment_items", "createdAt", "created_at");
      await queryInterface.renameColumn("treatment_items", "updatedAt", "updated_at");
    }

    // payments
    const paymentsCols = await queryInterface.describeTable("payments");
    if (paymentsCols.createdAt && !paymentsCols.created_at) {
      await queryInterface.renameColumn("payments", "createdAt", "created_at");
      await queryInterface.renameColumn("payments", "updatedAt", "updated_at");
    }

    // doctor_schedules
    const dsCols = await queryInterface.describeTable("doctor_schedules");
    if (dsCols.createdAt && !dsCols.created_at) {
      await queryInterface.renameColumn("doctor_schedules", "createdAt", "created_at");
      await queryInterface.renameColumn("doctor_schedules", "updatedAt", "updated_at");
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("appointments", "patient_id");
    await queryInterface.removeColumn("appointments", "doctor_id");
  },
};
