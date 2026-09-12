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
        {
          mu_id: 2,
          mu_employee_id: 202,
          mu_access_id: 1,
          mu_username: 'requestor',
          mu_password: '344a687653e13091f041548b35ba138e',
          mu_status: 'ACTIVE',
          mu_createdAt: new Date(),
        },
        {
          mu_id: 3,
          mu_employee_id: 203,
          mu_access_id: 2,
          mu_username: 'teamlead',
          mu_password: 'ac618691e2a91cc8e9acaec4bb6b50ee',
          mu_status: 'ACTIVE',
          mu_createdAt: new Date(),
        },
        {
          mu_id: 4,
          mu_employee_id: 204,
          mu_access_id: 3,
          mu_username: 'custodian',
          mu_password: 'c9d2ecee7c9c3ecf607331a15c01f9f3',
          mu_status: 'ACTIVE',
          mu_createdAt: new Date(),
        },
        {
          mu_id: 5,
          mu_employee_id: 205,
          mu_access_id: 4,
          mu_username: 'finance',
          mu_password: 'bbc0acaa7b01d655432d40bb72d63770',
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
