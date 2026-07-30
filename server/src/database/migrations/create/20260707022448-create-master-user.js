'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_user', {
      mu_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      mu_employee_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_employee',
          key: 'me_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      mu_username: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mu_password: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      mu_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DELETED'),
        defaultValue: 'ACTIVE',
        allowNull: false,
      },
      mu_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_user')
  },
}
