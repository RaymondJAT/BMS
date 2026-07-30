'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('revolving_fund', {
      rf_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      rf_budget_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'budget',
          key: 'b_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      rf_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      rf_month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      rf_start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      rf_end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      rf_beginning: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_added: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_total_fund: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_issued: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_returned: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_outstanding: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_amount_expended: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_ending: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_liquidated: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_balance: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rf_status: {
        type: Sequelize.ENUM('OPEN', 'CLOSED', 'ON REVIEW', 'CLEARED', 'RETURN'),
        defaultValue: 'OPEN',
        allowNull: false,
      },
      rf_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('revolving_fund')
  },
}
