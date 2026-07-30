'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cash_disbursement_activity', {
      cda_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      cda_cash_disbursement_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cash_disbursement',
          key: 'cd_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      cda_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      cda_remarks: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      cda_particulars: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      cda_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cash_disbursement_activity')
  },
}
