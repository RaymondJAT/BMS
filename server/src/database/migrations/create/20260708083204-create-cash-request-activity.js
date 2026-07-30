'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cash_request_activity', {
      cra_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      cra_user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      cra_cash_request_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cash_request',
          key: 'cr_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      cra_action: {
        type: Sequelize.ENUM('REQUESTED', 'APPROVED', 'RECEIVED', 'REJECTED'),
        allowNull: false,
      },
      cra_remarks: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      cra_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      cra_updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cash_request_activity')
  },
}
