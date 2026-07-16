module.exports = (sequelize, DataTypes) => {
  const ServiceCategory = sequelize.define(
    "ServiceCategory",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      color_hex: { type: DataTypes.STRING, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "service_categories",
      freezeTableName: true,
      timestamps: false,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return ServiceCategory;
};
