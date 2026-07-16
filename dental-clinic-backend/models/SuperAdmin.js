module.exports = (sequelize, DataTypes) => {
  const SuperAdmin = sequelize.define(
    "SuperAdmin",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING, unique: true, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      full_name: { type: DataTypes.STRING, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: "super_admins",
      timestamps: true,
      underscored: true,
    },
  );

  return SuperAdmin;
};
