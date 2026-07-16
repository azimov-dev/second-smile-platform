module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define(
    "Service",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      clinic_id: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      category_id: { type: DataTypes.INTEGER, allowNull: true },
      price: { type: DataTypes.INTEGER, allowNull: false },
      material_cost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      freezeTableName: true,
      tableName: "services",
      timestamps: false,
      scopes: {
        clinic(clinicId) {
          return { where: { clinic_id: clinicId } };
        },
      },
    },
  );

  return Service;
};
