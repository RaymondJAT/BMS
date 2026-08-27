'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cash_disbursement', {
      cd_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      cd_cash_request_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cash_request',
          key: 'cr_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: true,
      },
      cd_date_issued: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      cd_received_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_employee',
          key: 'me_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      cd_revolving_fund_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'revolving_fund',
          key: 'rf_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      cd_department_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_department',
          key: 'md_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      cd_purpose: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      cd_amount_issued: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cd_cash_voucher: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      cd_amount_returned: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cd_outstanding_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cd_amount_expended: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cd_status: {
        type: Sequelize.ENUM('LIQUIDATED', 'UNLIQUIDATED'),
        defaultValue: 'UNLIQUIDATED',
        allowNull: false,
      },
      cd_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cash_disbursement')
  },
}
