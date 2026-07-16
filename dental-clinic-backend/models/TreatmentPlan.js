module.exports = (sequelize, DataTypes) => {
  const TreatmentPlan = sequelize.define(
    "TreatmentPlan",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      patient_id: { type: DataTypes.INTEGER, allowNull: false },
      doctor_id: { type: DataTypes.INTEGER, allowNull: true },
      title: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM("active", "completed", "cancelled"),
        defaultValue: "active",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "treatment_plans",
      timestamps: true,
      underscored: true,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return TreatmentPlan;
};
