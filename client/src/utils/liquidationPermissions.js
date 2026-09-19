// Role/status checks for the Liquidation workflow, centralized here so
// LiquidationDetailPage — which now hosts every action (Edit, Team
// Leader Approve, Fund Custodian Verify, Finance post-audit) — is the
// only place that needs to reason about "who can do what, right now".
// This used to live inline inside liquidationColumns.js when the list
// rendered these buttons itself.
const EDITABLE_STATUSES = ['PENDING', 'REJECTED', 'INCOMPLETE']

export function getLiquidationPermissions(userRole, currentEmployeeId, liquidation) {
  const hasFullAccess = !userRole || userRole === 'ADMINISTRATOR'
  const canApproveRole = hasFullAccess || ['TEAM LEADER', 'ADMINISTRATOR'].includes(userRole)
  const canVerifyRole = hasFullAccess || ['FUND CUSTODIAN', 'ADMINISTRATOR'].includes(userRole)
  const canFinanceRole = hasFullAccess || ['FINANCE', 'ADMINISTRATOR'].includes(userRole)
  const canActAsRequester = hasFullAccess || userRole === 'REQUESTER'

  const status = String(liquidation?.status || '').toUpperCase()
  const ownsRequest =
    hasFullAccess ||
    (canActAsRequester && String(liquidation?.employee_id) === String(currentEmployeeId))

  return {
    status,
    canEdit: ownsRequest && EDITABLE_STATUSES.includes(status),
    canApprove: canApproveRole && status === 'PENDING',
    canVerify: canVerifyRole && status === 'APPROVED',
    canFinance: canFinanceRole && status === 'VERIFIED',
  }
}

export default getLiquidationPermissions
