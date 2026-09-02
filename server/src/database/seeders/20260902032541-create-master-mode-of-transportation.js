'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'master_mode_of_transportation',
      [
        {
          mmot_id: 1,
          mmot_name: 'CAR',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 2,
          mmot_name: 'TRUCK',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 3,
          mmot_name: 'MOTOR BIKE',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 4,
          mmot_name: 'BUS',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 5,
          mmot_name: 'JEEP',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 6,
          mmot_name: 'MODERN JEEPNEY',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 7,
          mmot_name: 'FX / UV EXPRESS',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 8,
          mmot_name: 'TAXI',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 9,
          mmot_name: 'MOTORCYCLE',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 10,
          mmot_name: 'TRICYCLE',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 11,
          mmot_name: 'PEDICAB',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 12,
          mmot_name: 'TRAIN (LRT/MRT/PNR)',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 13,
          mmot_name: 'FERRY / BOAT',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 14,
          mmot_name: 'RORO',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 15,
          mmot_name: 'AIRPLANE',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 16,
          mmot_name: 'PRIVATE CAR',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 17,
          mmot_name: 'BICYCLE',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
        {
          mmot_id: 18,
          mmot_name: 'WALKING',
          mmot_status: 'ACTIVE',
          mmot_createdAt: new Date(),
        },
      ],
      {},
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_mode_of_transportation', null, {})
  },
}
