module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    "Appointment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      appointment_date: { type: DataTypes.DATE, allowNull: false },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
        validate: { min: 15, max: 240 },
      },
      treatment_plan_id: { type: DataTypes.INTEGER, allowNull: true },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "in_progress", "completed", "cancelled"),
        defaultValue: "pending",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "appointments",
      timestamps: true,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return Appointment;
};
