'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_wallet', {
      mw_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      mw_employee_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_employee',
          key: 'me_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      mw_previous_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      mw_current_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_wallet')
  },
}
