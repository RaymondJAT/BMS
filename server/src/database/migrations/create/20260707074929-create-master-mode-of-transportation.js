'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_mode_of_transportation', {
      mmot_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      mmot_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mmot_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DELETED'),
        defaultValue: 'ACTIVE',
        allowNull: false,
      },
      mmot_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_mode_of_transportation')
  },
}
