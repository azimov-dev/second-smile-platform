module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      treatment_id: { type: DataTypes.INTEGER, allowNull: false },
      amount: { type: DataTypes.INTEGER, allowNull: false },
      payment_type: { type: DataTypes.STRING, allowNull: false },
      paid_at: { type: DataTypes.DATE, allowNull: false },
      comment: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "payments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      underscored: true,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return Payment;
};
