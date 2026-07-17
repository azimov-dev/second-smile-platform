module.exports = (sequelize, DataTypes) => {
  const TreatmentItem = sequelize.define(
    "TreatmentItem",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      treatment_id: { type: DataTypes.INTEGER, allowNull: false },
      service_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
      price_at_time: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      tooth_numbers: { type: DataTypes.TEXT, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "treatment_items",
      timestamps: true,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return TreatmentItem;
};
