'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('revolving_fund_activity', {
      rfa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      rfa_revolving_fund_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'revolving_fund',
          key: 'rf_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      rfa_remarks: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      rfa_user_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      rfa_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('revolving_fund_activity')
  },
}
