module.exports = (sequelize, DataTypes) => {
  const Clinic = sequelize.define(
    "Clinic",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      slug: { type: DataTypes.STRING, unique: true, allowNull: false },
      owner_phone: { type: DataTypes.STRING, allowNull: true },
      logo_url: { type: DataTypes.STRING, allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      settings: { type: DataTypes.JSONB, allowNull: true },
    },
    {
      tableName: "clinics",
      timestamps: true,
      underscored: true,
    },
  );

  return Clinic;
};
