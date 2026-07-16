"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await queryInterface.bulkInsert("super_admins", [
      {
        username: "admin",
        password: hashedPassword,
        full_name: "Super Admin",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("super_admins", { username: "admin" });
  },
};
