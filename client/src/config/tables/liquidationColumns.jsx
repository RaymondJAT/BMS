import { Eye, Pencil, CheckCircle2, ShieldCheck, ClipboardCheck } from 'lucide-react'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  VERIFIED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INCOMPLETE: 'bg-orange-50 text-orange-700 border-orange-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}
const EDITABLE_STATUSES = ['PENDING', 'REJECTED', 'INCOMPLETE']

export function createLiquidationColumns({
  userRole,
  currentEmployeeId,
  onView,
  onEdit,
  onApprove,
  onVerify,
  onFinanceReview,
  getEmployeeName,
}) {
  const hasFullAccess = !userRole || userRole === 'ADMINISTRATOR'
  const canApprove = hasFullAccess || ['TEAM_LEAD', 'ADMIN'].includes(userRole)
  const canVerify = hasFullAccess || ['FUND_CUSTODIAN', 'ADMIN'].includes(userRole)
  const canFinance = hasFullAccess || ['FINANCE', 'ADMIN'].includes(userRole)
  const canActAsRequester = hasFullAccess || userRole === 'REQUESTER'

  return [
    {
      header: 'Reference',
      accessorKey: 'reference_id',
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 text-sm">
          {row.reference_id || `#${row.id}`}
        </span>
      ),
    },
    {
      header: 'Requester',
      accessorKey: 'employee_id',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-800">
          {getEmployeeName ? getEmployeeName(row.employee_id) : `#${row.employee_id}`}
        </span>
      ),
    },
    {
      header: 'Purpose',
      accessorKey: 'description',
      cell: (row) => <span className="text-xs text-slate-700 line-clamp-2">{row.description}</span>,
    },
    {
      header: 'Cash Received',
      accessorKey: 'amount_obtained',
      align: 'right',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-800">
          {formatCurrency(row.amount_obtained)}
        </span>
      ),
    },
    {
      header: 'Total Liquidated',
      accessorKey: 'amount_expended',
      align: 'right',
      cell: (row) => (
        <span className="text-xs font-bold text-slate-900">
          {formatCurrency(row.amount_expended)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      cell: (row) => {
        const status = String(row.status || '').toUpperCase()
        const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200'
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style}`}
          >
            {status || 'UNKNOWN'}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      align: 'center',
      cell: (row) => {
        const status = String(row.status || '').toUpperCase()
        const ownsRequest =
          hasFullAccess ||
          (canActAsRequester && String(row.employee_id) === String(currentEmployeeId))
        const canEdit = ownsRequest && EDITABLE_STATUSES.includes(status)
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onView?.(row)
              }}
              title="View"
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(row)
                }}
                title="Edit & Resubmit"
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canApprove && status === 'PENDING' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove?.(row)
                }}
                title="Team Leader Approve / Reject"
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            {canVerify && status === 'APPROVED' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onVerify?.(row)
                }}
                title="Fund Custodian Verify / Reject"
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}
            {canFinance && status === 'VERIFIED' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onFinanceReview?.(row)
                }}
                title="Finance Post-Audit"
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      },
    },
  ]
}

export default createLiquidationColumns
