'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'master_access',
      [
        { ma_name: 'REQUESTER', ma_status: 'ACTIVE', ma_createdAt: new Date() },
        { ma_name: 'TEAM LEADER', ma_status: 'ACTIVE', ma_createdAt: new Date() },
        { ma_name: 'FUND CUSTODIAN', ma_status: 'ACTIVE', ma_createdAt: new Date() },
        { ma_name: 'FINANCE', ma_status: 'ACTIVE', ma_createdAt: new Date() },
        { ma_name: 'ADMINISTRATOR', ma_status: 'ACTIVE', ma_createdAt: new Date() },
        { ma_name: 'DEVELOPER', ma_status: 'ACTIVE', ma_createdAt: new Date() },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_access', null, {})
  },
}
