'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('master_route_access', [
      // DASHBOARD
      {
        mra_id: 1,
        mra_access_id: null,
        mra_name: 'dashboard',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },

      // MASTER FILES
      {
        mra_id: 2,
        mra_access_id: null,
        mra_name: 'access',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 3,
        mra_access_id: null,
        mra_name: 'users',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 4,
        mra_access_id: null,
        mra_name: 'route-access',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 5,
        mra_access_id: null,
        mra_name: 'departments',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 6,
        mra_access_id: null,
        mra_name: 'employees',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 7,
        mra_access_id: null,
        mra_name: 'districts',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 8,
        mra_access_id: null,
        mra_name: 'transportation',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 9,
        mra_access_id: null,
        mra_name: 'particulars',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 10,
        mra_access_id: null,
        mra_name: 'synchronize',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },

      // FUND MANAGEMENT
      {
        mra_id: 11,
        mra_access_id: null,
        mra_name: 'budget',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 12,
        mra_access_id: null,
        mra_name: 'revolving',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 13,
        mra_access_id: null,
        mra_name: 'disbursements',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 14,
        mra_access_id: null,
        mra_name: 'audit-history',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },

      // FINANCE & CASH FLOW
      {
        mra_id: 15,
        mra_access_id: null,
        mra_name: 'pending',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 16,
        mra_access_id: null,
        mra_name: 'completed',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 17,
        mra_access_id: null,
        mra_name: 'rejected',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 18,
        mra_access_id: null,
        mra_name: 'all-cash-requests',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },

      // MY WORKBENCH
      {
        mra_id: 19,
        mra_access_id: null,
        mra_name: 'requests',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 20,
        mra_access_id: null,
        mra_name: 'liquidations',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 21,
        mra_access_id: null,
        mra_name: 'approvals',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },

      // DISBURSEMENTS
      {
        mra_id: 22,
        mra_access_id: null,
        mra_name: 'processing',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 23,
        mra_access_id: null,
        mra_name: 'verification',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 24,
        mra_access_id: null,
        mra_name: 'disbursement-history',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },

      // REPORTS & LOGS
      {
        mra_id: 25,
        mra_access_id: null,
        mra_name: 'report-budget',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
      {
        mra_id: 26,
        mra_access_id: null,
        mra_name: 'flag-analysis',
        mra_status: 'NO-ACCESS',
        mra_createdAt: new Date(),
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_route_access', null, {})
  },
}
