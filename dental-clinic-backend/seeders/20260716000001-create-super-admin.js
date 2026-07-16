"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash("azimov17!", 10);
    await queryInterface.bulkInsert("super_admins", [
      {
        username: "azymv",
        password: hashedPassword,
        full_name: "Azimov",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("super_admins", { username: "azymv" });
  },
};
