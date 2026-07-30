'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('red_flag', {
      rfg_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      rfg_liquidation_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'liquidation',
          key: 'l_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      rfg_liquidation_item_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'liquidation_item',
          key: 'li_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      rfg_from: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      rfg_to: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      rfg_mode_of_transportation_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_mode_of_transportation',
          key: 'mmot_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      rfg_min_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rfg_max_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rfg_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      rfg_created_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      rfg_status: {
        type: Sequelize.ENUM('MINIMUM', 'MAXIMUM'),
        allowNull: false,
      },
      rfg_approval_status: {
        type: Sequelize.ENUM('PENDING', 'APPLIED', 'REJECTED'),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      rfg_updated_by: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_user',
          key: 'mu_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: true,
      },
      rfg_resolution_remarks: {
        type: Sequelize.TEXT('long'),
        allowNull: false,
      },
      rfg_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      rfg_updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('red_flag')
  },
}
