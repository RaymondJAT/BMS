'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_district', {
      mdt_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      mdt_store_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      mdt_store_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mdt_region: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mdt_city_province: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mdt_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DELETED'),
        defaultValue: 'ACTIVE',
        allowNull: false,
      },
      mdt_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_district')
  },
}
