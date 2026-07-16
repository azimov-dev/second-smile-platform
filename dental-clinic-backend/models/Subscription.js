module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define(
    "Subscription",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      plan_id: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM("active", "trial", "past_due", "cancelled", "expired"),
        allowNull: false,
        defaultValue: "trial",
      },
      current_period_start: { type: DataTypes.DATE, allowNull: true },
      current_period_end: { type: DataTypes.DATE, allowNull: true },
      trial_ends_at: { type: DataTypes.DATE, allowNull: true },
      click_transaction_id: { type: DataTypes.STRING, allowNull: true },
      cancelled_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "subscriptions",
      timestamps: true,
      underscored: true,
    },
  );

  return Subscription;
};
