'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('budget', {
      b_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      b_department_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_department',
          key: 'md_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      b_type: {
        type: Sequelize.ENUM('CASH', 'GCASH', 'ETC'),
        allowNull: false,
      },
      b_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      b_beginning_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      b_status: {
        type: Sequelize.ENUM('ACTIVE', 'EXHAUSTED', 'CLOSED'),
        allowNull: false,
      },
      b_createdBy: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      b_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('budget')
  },
}
