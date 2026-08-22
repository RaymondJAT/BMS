import {
  LayoutDashboard,
  Database,
  Wallet,
  FileCheck2,
  BarChart3,
  Building2,
  Banknote,
} from 'lucide-react'

export const NAVIGATION_ITEMS = [
  // ==========================================
  // 1. DASHBOARD
  // Access: Requester, Team Leader, Custodian, Finance, Admin
  // ==========================================
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'link',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  // ==========================================
  // 2. MASTER FILES
  // Core setup, lookup tables, and RBAC permissions
  // Access: Admin (Managed via permission setup for system setup)
  // ==========================================
  {
    id: 'master-files',
    title: 'Master Files',
    type: 'dropdown',
    icon: Database,
    children: [
      { id: 'master-access', title: 'User Access & Permissions', to: '/master/access' },
      { id: 'master-users', title: 'Users', to: '/master/users' },
      { id: 'master-route-access', title: 'Route Access', to: '/master/route-access' },
      { id: 'master-departments', title: 'Departments', to: '/master/departments' },
      { id: 'master-positions', title: 'Positions', to: '/master/positions' },
      { id: 'master-employees', title: 'Employees', to: '/master/employees' },
      { id: 'master-districts', title: 'Districts & Stores', to: '/master/districts' },
      { id: 'master-transport', title: 'Modes of Transportation', to: '/master/transportation' },
      { id: 'master-particulars', title: 'Particulars & Expense Types', to: '/master/particulars' },
    ],
  },
  // ==========================================
  // 3. FUND MANAGEMENT
  // Budget allocation and cash drawer tracking
  // Access: Custodian, Finance, Admin
  // ==========================================
  {
    id: 'fund-management',
    title: 'Fund Management',
    type: 'dropdown',
    icon: Building2,
    children: [
      // Access: Finance, Admin (Allocating budgets per department/store)
      { id: 'fund-allocations', title: 'Budget Allocations', to: '/funds/budget' },

      // Access: Custodian, Finance, Admin (Managing active revolving funds/petty cash)
      { id: 'fund-revolving', title: 'Revolving Funds', to: '/funds/revolving' },

      // Access: Custodian, Finance, Admin
      { id: 'fund-disbursements', title: 'Disbursement Register', to: '/funds/disbursements' },

      // Access: Finance, Admin
      { id: 'fund-history', title: 'Audit History', to: '/funds/history' },
    ],
  },
  // ==========================================
  // 4. FINANCE & CASH FLOW
  // High-level financial sign-offs and liquidation approvals
  // Access: Finance, Admin
  // ==========================================
  {
    id: 'finance',
    title: 'Finance & Cash Flow',
    type: 'dropdown',
    icon: FileCheck2,
    children: [
      // Access: Finance, Admin (Final financial sign-off before/after custodian)
      { id: 'fin-pending', title: 'Pending Final Approvals', to: '/finance/pending' },

      // Access: Finance, Admin (Final validated liquidations)
      { id: 'fin-completed', title: 'Completed Liquidations', to: '/finance/completed' },

      // Access: Finance, Admin
      { id: 'fin-rejected', title: 'Rejected Liquidations', to: '/finance/rejected' },

      // Access: Finance, Admin (Master transaction list)
      { id: 'fin-all', title: 'All Cash Requests', to: '/finance/all' },
    ],
  },
  // ==========================================
  // 5. MY WORKBENCH
  // Core personal workflow hub for end-users and immediate supervisors
  // ==========================================
  {
    id: 'my-workbench',
    title: 'My Workbench',
    type: 'dropdown',
    icon: Wallet,
    children: [
      // Access: Requester, Team Leader, Custodian, Finance, Admin
      { id: 'wb-cash-requests', title: 'Cash Requests', to: '/workbench/request' },

      // Access: Requester, Team Leader, Custodian, Finance, Admin
      { id: 'wb-liquidations', title: 'Liquidations', to: '/workbench/liquidations' },

      // Access: Team Leader, Admin (First-level review/approval for direct reports)
      { id: 'wb-approvals', title: 'Approvals & Reviews', to: '/workbench/approvals' },
    ],
  },
  // ==========================================
  // 6. DISBURSEMENTS
  // Payout processing and physical liquidation verification
  // Access: Custodian, Finance, Admin
  // ==========================================
  {
    id: 'disbursements',
    title: 'Disbursements',
    type: 'dropdown',
    icon: Banknote,
    children: [
      // Access: Custodian, Admin (Releasing cash for approved requests)
      { id: 'disb-processing', title: 'For Processing', to: '/disbursements/processing' },

      // Access: Custodian, Admin (Checking/verifying physical receipts)
      {
        id: 'disb-verification',
        title: 'Liquidation Verification',
        to: '/disbursements/verification',
      },

      // Access: Custodian, Finance, Admin (Audit log of released funds)
      { id: 'disb-history', title: 'Disbursement History', to: '/disbursements/history' },
    ],
  },
  // ==========================================
  // 7. REPORTS & LOGS
  // Analytical reports and logs
  // Access: Team Leader, Custodian, Finance, Admin
  // ==========================================
  {
    id: 'reports',
    title: 'Reports & Logs',
    type: 'dropdown',
    icon: BarChart3,
    children: [
      // Access: Team Leader, Finance, Admin
      { id: 'report-budget', title: 'Budget Reports', to: '/reports/budget' },

      // Access: Finance, Admin
      { id: 'report-flag-analysis', title: 'Flag Analysis', to: '/reports/flag-analysis' },
    ],
  },
]
