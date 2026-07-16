require("dotenv").config();
const { Sequelize } = require("sequelize");

const DATABASE_URL = process.env.DATABASE_URL;

let sequelize;

if (DATABASE_URL) {
  // Use full connection string from Render
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: "postgres",
    protocol: "postgres",
    logging: console.log,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
    define: {
      underscored: true,
      timestamps: true,
    },
  });
} else {
  // Local fallback
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST || "localhost",
    port: DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
    define: {
      underscored: true,
      timestamps: true,
    },
  });
}

module.exports = sequelize;
