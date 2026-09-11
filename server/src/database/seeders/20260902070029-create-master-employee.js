'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'master_employee',
      [
        {
          me_id: 201,
          me_employee_id: '123456',
          me_fullname: 'John Doe',
          me_department_id: 1,
          me_position_id: 1,
          me_status: 'REGULAR',
          me_createdAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_employee', null, {})
  },
}
