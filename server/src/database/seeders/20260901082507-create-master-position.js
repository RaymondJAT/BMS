'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'master_position',
      [
        {
          mp_id: 1,
          mp_code: 'MP-1',
          mp_description: 'Finance',
          mp_status: 'ACTIVE',
          mp_createdAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_position', null, {})
  },
}
