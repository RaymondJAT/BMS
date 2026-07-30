'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_particulars', {
      mpt_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      mpt_code: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mpt_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mpt_type: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      mpt_description: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      mpt_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DELETED'),
        defaultValue: 'ACTIVE',
        allowNull: false,
      },
      mpt_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_particulars')
  },
}
