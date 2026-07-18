module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    "Plan",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, unique: true, allowNull: false },
      price_monthly: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      price_yearly: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      max_doctors: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },
      max_patients: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
      max_appointments_per_month: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 200 },
      trial_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 14 },
      features: { type: DataTypes.JSONB, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "plans",
      timestamps: true,
      underscored: true,
    },
  );

  return Plan;
};
