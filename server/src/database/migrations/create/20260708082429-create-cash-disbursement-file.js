'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cash_disbursement_file', {
      cdf_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      cdf_cash_disbursement_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cash_disbursement',
          key: 'cd_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      cdf_image: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      cdf_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cash_disbursement_file')
  },
}
