'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('liquidation_activity', {
      la_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      la_liquidation_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'liquidation',
          key: 'l_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      la_action: {
        type: Sequelize.ENUM('REQUESTED', 'CHECKED', 'APPROVED', 'RECEIVED', 'REJECTED'),
        allowNull: false,
      },
      la_remarks: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      la_receipt: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      la_created_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      la_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('liquidation_activity')
  },
}
