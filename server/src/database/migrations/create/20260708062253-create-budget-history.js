'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('budget_history', {
      bh_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      bh_budget_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'budget',
          key: 'b_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      bh_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      bh_previous_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      bh_new_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      bh_remarks: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      bh_department_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_department',
          key: 'md_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      bh_type: {
        type: Sequelize.ENUM('CASH', 'GCASH', 'ETC'),
        allowNull: false,
      },
      bh_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      bh_created_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      bh_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('budget_history')
  },
}
