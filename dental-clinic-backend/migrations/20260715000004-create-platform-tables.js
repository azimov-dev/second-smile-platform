"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Plans table
    await queryInterface.createTable("plans", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, unique: true, allowNull: false },
      price_monthly: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      price_yearly: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      max_doctors: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 2 },
      max_patients: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 500 },
      max_appointments_per_month: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 200 },
      features: { type: Sequelize.JSONB, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Subscriptions table
    await queryInterface.createTable("subscriptions", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "clinics", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      plan_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "plans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      status: {
        type: Sequelize.ENUM("active", "trial", "past_due", "cancelled", "expired"),
        allowNull: false,
        defaultValue: "trial",
      },
      current_period_start: { type: Sequelize.DATE, allowNull: true },
      current_period_end: { type: Sequelize.DATE, allowNull: true },
      trial_ends_at: { type: Sequelize.DATE, allowNull: true },
      click_transaction_id: { type: Sequelize.STRING, allowNull: true },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Subscription payments table
    await queryInterface.createTable("subscription_payments", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      subscription_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "subscriptions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      clinic_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "clinics", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      currency: { type: Sequelize.STRING, allowNull: false, defaultValue: "UZS" },
      click_trans_id: { type: Sequelize.STRING, allowNull: true },
      click_merchant_trans_id: { type: Sequelize.STRING, allowNull: true },
      status: {
        type: Sequelize.ENUM("pending", "completed", "failed", "refunded"),
        allowNull: false,
        defaultValue: "pending",
      },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      raw_response: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Super admins table
    await queryInterface.createTable("super_admins", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: Sequelize.STRING, unique: true, allowNull: false },
      password: { type: Sequelize.STRING, allowNull: false },
      full_name: { type: Sequelize.STRING, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Indexes
    await queryInterface.addIndex("subscriptions", ["clinic_id"]);
    await queryInterface.addIndex("subscriptions", ["status"]);
    await queryInterface.addIndex("subscription_payments", ["clinic_id"]);
    await queryInterface.addIndex("subscription_payments", ["subscription_id"]);

    // Seed default plans
    await queryInterface.bulkInsert("plans", [
      {
        name: "Starter",
        slug: "starter",
        price_monthly: 200000,
        price_yearly: 2000000,
        max_doctors: 2,
        max_patients: 300,
        max_appointments_per_month: 150,
        features: JSON.stringify({ ai_chat: false, sms_reminders: false }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "Professional",
        slug: "professional",
        price_monthly: 500000,
        price_yearly: 5000000,
        max_doctors: 5,
        max_patients: 1000,
        max_appointments_per_month: 500,
        features: JSON.stringify({ ai_chat: true, sms_reminders: true }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "Enterprise",
        slug: "enterprise",
        price_monthly: 1000000,
        price_yearly: 10000000,
        max_doctors: 20,
        max_patients: 5000,
        max_appointments_per_month: 2000,
        features: JSON.stringify({ ai_chat: true, sms_reminders: true, priority_support: true }),
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Create a default subscription for the existing clinic (active, no expiry)
    await queryInterface.bulkInsert("subscriptions", [
      {
        clinic_id: 1,
        plan_id: 3, // Enterprise for the original clinic
        status: "active",
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        trial_ends_at: null,
        click_transaction_id: null,
        cancelled_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("subscription_payments");
    await queryInterface.dropTable("subscriptions");
    await queryInterface.dropTable("plans");
    await queryInterface.dropTable("super_admins");
  },
};
