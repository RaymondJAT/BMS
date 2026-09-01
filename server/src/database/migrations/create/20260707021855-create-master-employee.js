'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_employee', {
      me_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        unique: true,
      },
      me_employee_id: {
        type: Sequelize.STRING(9),
        allowNull: false,
        unique: true,
      },
      me_fullname: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      me_department_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_department',
          key: 'md_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      me_position_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'master_position',
          key: 'mp_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false,
      },
      me_status: {
        type: Sequelize.ENUM(
          'PROBITIONARY',
          'REGULAR',
          'AWOL',
          'RESIGNED',
          'TERMINATED',
          'APPRENTICE',
          'DONE APPRENTICE',
          'END_OF_CONTRACT',
        ),
        allowNull: false,
      },
      me_createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('master_employee')
  },
}
