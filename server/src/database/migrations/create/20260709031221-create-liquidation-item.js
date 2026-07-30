'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('liquidation_item', {
      li_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      li_liquidation_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'liquidation',
          key: 'l_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      li_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      li_rt: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      li_store_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      li_particulars: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_particulars',
          key: 'mpt_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      li_from: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      li_to: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      li_mode_of_transportation_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_mode_of_transportation',
          key: 'mmot_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      li_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('liquidation_item')
  },
}
