module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      full_name: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM("admin", "doctor", "reception"),
        allowNull: false,
      },
      resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
      resetPasswordExpires: { type: DataTypes.BIGINT, allowNull: true },
    },
    {
      freezeTableName: true,
      tableName: "users",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["clinic_id", "phone"] },
      ],
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );
};
