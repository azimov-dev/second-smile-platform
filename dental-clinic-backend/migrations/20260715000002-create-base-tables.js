"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Users
    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      full_name: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: false },
      password: { type: Sequelize.STRING, allowNull: false },
      role: { type: Sequelize.ENUM("admin", "doctor", "reception"), allowNull: false },
      resetPasswordToken: { type: Sequelize.STRING, allowNull: true },
      resetPasswordExpires: { type: Sequelize.BIGINT, allowNull: true },
    });

    // Patients
    await queryInterface.createTable("patients", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      first_name: { type: Sequelize.STRING, allowNull: false },
      last_name: { type: Sequelize.STRING, allowNull: false },
      phone: { type: Sequelize.STRING, allowNull: false },
      birth_date: { type: Sequelize.STRING, allowNull: false },
      address: { type: Sequelize.STRING, allowNull: false },
      medical_history: { type: Sequelize.TEXT, allowNull: true },
    });

    // Service Categories
    await queryInterface.createTable("service_categories", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      color_hex: { type: Sequelize.STRING, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });

    // Services
    await queryInterface.createTable("services", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      category_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: "service_categories", key: "id" },
        onDelete: "SET NULL",
      },
      price: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      material_cost: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });

    // Treatment Plans
    await queryInterface.createTable("treatment_plans", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      patient_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "patients", key: "id" },
        onDelete: "CASCADE",
      },
      doctor_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      title: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.ENUM("active", "completed", "cancelled"), defaultValue: "active" },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Appointments
    await queryInterface.createTable("appointments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      appointment_date: { type: Sequelize.DATE, allowNull: false },
      duration: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      treatment_plan_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: "treatment_plans", key: "id" },
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM("pending", "confirmed", "in_progress", "completed", "cancelled"),
        defaultValue: "pending",
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Treatments
    await queryInterface.createTable("treatments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      appointment_id: {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: "appointments", key: "id" },
        onDelete: "CASCADE",
      },
      treatment_date: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.ENUM("active", "completed", "cancelled"), defaultValue: "active" },
      total_amount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      discount_amount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      paid_amount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Treatment Items
    await queryInterface.createTable("TreatmentItems", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      treatment_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "treatments", key: "id" },
        onDelete: "CASCADE",
      },
      service_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "services", key: "id" },
        onDelete: "CASCADE",
      },
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      price_at_time: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      tooth_numbers: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Payments
    await queryInterface.createTable("payments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      treatment_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "treatments", key: "id" },
        onDelete: "CASCADE",
      },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      payment_type: { type: Sequelize.STRING, allowNull: false },
      paid_at: { type: Sequelize.DATE, allowNull: false },
      comment: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Doctor Schedules
    await queryInterface.createTable("doctor_schedules", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: Sequelize.INTEGER, allowNull: false },
      doctor_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      start_time: { type: Sequelize.TIME, allowNull: true },
      end_time: { type: Sequelize.TIME, allowNull: true },
      type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "busy" },
      reason: { type: Sequelize.TEXT, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("doctor_schedules");
    await queryInterface.dropTable("payments");
    await queryInterface.dropTable("TreatmentItems");
    await queryInterface.dropTable("treatments");
    await queryInterface.dropTable("appointments");
    await queryInterface.dropTable("treatment_plans");
    await queryInterface.dropTable("services");
    await queryInterface.dropTable("service_categories");
    await queryInterface.dropTable("patients");
    await queryInterface.dropTable("users");
  },
};
