module.exports = (sequelize, DataTypes) => {
  const Treatment = sequelize.define(
    "Treatment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      appointment_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      treatment_date: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM("active", "completed", "cancelled"),
        defaultValue: "active",
      },
      total_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      paid_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "treatments",
      timestamps: true,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return Treatment;
};
