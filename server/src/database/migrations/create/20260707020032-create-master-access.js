'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_access', {
      ma_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      ma_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ma_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DELETED'),
        defaultValue: 'ACTIVE',
        allowNull: false,
      },
      ma_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_access')
  },
}
