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
        {
          me_id: 202,
          me_employee_id: '654321',
          me_fullname: 'Jane Smith',
          me_department_id: 1,
          me_position_id: 1,
          me_status: 'REGULAR',
          me_createdAt: new Date(),
        },
        {
          me_id: 203,
          me_employee_id: '987654',
          me_fullname: 'Bob Johnson',
          me_department_id: 1,
          me_position_id: 1,
          me_status: 'REGULAR',
          me_createdAt: new Date(),
        },
        {
          me_id: 204,
          me_employee_id: '111111',
          me_fullname: 'Alice Brown',
          me_department_id: 1,
          me_position_id: 1,
          me_status: 'REGULAR',
          me_createdAt: new Date(),
        },
        {
          me_id: 205,
          me_employee_id: '222222',
          me_fullname: 'Charlie Davis',
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
