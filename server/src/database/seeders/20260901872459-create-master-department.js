'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'master_department',
      [
        {
          md_id: 1,
          md_code: 'MD-1',
          md_name: 'Finance',
          md_description: '',
          md_status: 'ACTIVE',
          md_createdAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_department', null, {})
  },
}
