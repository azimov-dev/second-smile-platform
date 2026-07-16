module.exports = (sequelize, DataTypes) => {
  const SubscriptionPayment = sequelize.define(
    "SubscriptionPayment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      subscription_id: { type: DataTypes.INTEGER, allowNull: false },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.INTEGER, allowNull: false },
      currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "UZS" },
      click_trans_id: { type: DataTypes.STRING, allowNull: true },
      click_merchant_trans_id: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
        allowNull: false,
        defaultValue: "pending",
      },
      paid_at: { type: DataTypes.DATE, allowNull: true },
      raw_response: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      tableName: "subscription_payments",
      timestamps: true,
      underscored: true,
    },
  );

  return SubscriptionPayment;
};
