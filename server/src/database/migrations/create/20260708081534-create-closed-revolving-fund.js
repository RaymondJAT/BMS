'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('closed_revolving_fund', {
      crf_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      crf_revolving_fund_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'revolving_fund',
          key: 'rf_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      crf_beginning: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      crf_cash_inflow: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      crf_cash_outflow: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      crf_ending: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      crf_cashonhand: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      crf_gcash: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      crf_total_cash: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      crf_sub_total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      crf_status: {
        type: Sequelize.ENUM('BALANCED', 'SHORT', 'OVER'),
        defaultValue: 'BALANCED',
        allowNull: false,
      },
      crf_created_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('closed_revolving_fund')
  },
}
