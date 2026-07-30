'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('liquidation', {
      l_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      l_cash_request_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cash_request',
          key: 'cr_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      l_description: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      l_amount_obtained: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      l_amount_expended: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      l_reimburse_return: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      l_status: {
        type: Sequelize.ENUM(
          'PENDING',
          'APPROVED',
          'VERIFIED',
          'COMPLETED',
          'INCOMPLETE',
          'REJECTED',
        ),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      l_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('liquidation')
  },
}
