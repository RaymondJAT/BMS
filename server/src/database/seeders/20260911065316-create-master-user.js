'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'master_user',
      [
        {
          mu_id: 1,
          mu_employee_id: 201,
          mu_access_id: 5,
          mu_username: 'admin',
          mu_password: 'ab5f039be6c94ee5b6283aaaaf42b126',
          mu_status: 'ACTIVE',
          mu_createdAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_user', null, {})
  },
}
