module.exports = (sequelize, DataTypes) => {
  const DoctorSchedule = sequelize.define(
    "DoctorSchedule",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      start_time: { type: DataTypes.TIME, allowNull: true },
      end_time: { type: DataTypes.TIME, allowNull: true },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "busy",
        validate: {
          isIn: [["busy", "lunch", "meeting", "off", "holiday", "sick"]],
        },
      },
      reason: { type: DataTypes.TEXT, allowNull: true },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
      },
    },
    {
      tableName: "doctor_schedules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return DoctorSchedule;
};
