import { Eye, Pencil, CheckCircle2, Banknote, User, Building, Calendar, Folder } from 'lucide-react'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (val) => {
  if (!val) return 'N/A'
  const dateObj = new Date(val)
  return !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A'
}

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

// PENDING here means "pending Team Leader" and APPROVED means "Team-Lead-
// approved, pending Fund Custodian" — matching the actual cr_status ENUM
// (no separate PENDING_TL/PENDING_FC statuses exist on the backend).
const EDITABLE_STATUSES = ['PENDING', 'REJECTED']

/**
 * Column/action set for the Cash Request table. Field names match the
 * backend's actual getCashRequest response shape: id, reference_id,
 * cv_number, purpose, project, amount, revolving_fund_id, employee_id,
 * department_id, team_lead, request_date, status, createdAt.
 *
 * Edit is now supported (PUT /cash-request/update) — visible only to the
 * Requester who owns the row, and only while it's PENDING (still with
 * the Team Leader) or REJECTED (returned for correction). Once the Team
 * Leader approves (status flips to APPROVED) or the Fund Custodian
 * completes it (COMPLETED), Edit disappears — see §6 of the workflow
 * spec.
 *
 * Actions are gated by userRole + ownership client-side only, for now —
 * the backend's requireRole() in cash-request.controller.js and the
 * status guard in updateCashRequest are the real enforcement points.
 */
export function createRequestColumns({
  userRole,
  currentEmployeeId,
  onView,
  onEdit,
  onApprove,
  onComplete,
  getEmployeeName,
  getDepartmentName,
  getFundLabel,
}) {
  // DEV MODE: no role wired up yet, or explicitly Administrator, means
  // "can see and do everything" — this is intentional while access
  // control isn't built out, so every action is visible/testable without
  // needing real auth first. Once real roles land, remove this fallback
  // and rely purely on the specific role checks below.
  const hasFullAccess = !userRole || userRole === 'ADMINISTRATOR'

  const canApprove = hasFullAccess || ['TEAM_LEAD', 'ADMIN'].includes(userRole)
  const canComplete = hasFullAccess || ['FUND_CUSTODIAN', 'ADMIN'].includes(userRole)
  const canActAsRequester = hasFullAccess || userRole === 'REQUESTER'

  const resolveEmployee = (row) => {
    if (typeof getEmployeeName === 'function') {
      const resolved = getEmployeeName(row.employee_id)
      if (resolved && resolved !== 'N/A') return resolved
    }
    return `Employee #${row.employee_id ?? 'N/A'}`
  }

  const resolveDepartment = (row) => {
    if (typeof getDepartmentName === 'function') {
      const resolved = getDepartmentName(row.department_id)
      if (resolved && resolved !== 'N/A') return resolved
    }
    return `Dept #${row.department_id ?? 'N/A'}`
  }

  const resolveFund = (row) => {
    if (typeof getFundLabel === 'function') {
      const resolved = getFundLabel(row.revolving_fund_id)
      if (resolved) return resolved
    }
    return `Fund #${row.revolving_fund_id ?? 'N/A'}`
  }

  return [
    {
      header: 'Reference',
      accessorKey: 'reference_id',
      sortable: true,
      cell: (row) => (
        <div className="py-0.5">
          <p className="font-semibold text-slate-900 text-sm">{row.reference_id || `#${row.id}`}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {row.id ?? 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Project / Purpose',
      accessorKey: 'purpose',
      cell: (row) => (
        <div className="py-0.5 max-w-50 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <Folder className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-40" title={row.project}>
              {row.project}
            </span>
          </div>
          <p
            className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-snug"
            title={row.purpose}
          >
            {row.purpose}
          </p>
        </div>
      ),
    },
    {
      header: 'Requester',
      accessorKey: 'employee_id',
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5 py-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{resolveEmployee(row)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Building className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{resolveDepartment(row)}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Revolving Fund',
      accessorKey: 'revolving_fund_id',
      cell: (row) =>
        row.revolving_fund_id ? (
          <span className="text-xs font-medium text-slate-700">{resolveFund(row)}</span>
        ) : (
          <span className="text-xs font-medium text-slate-400 italic">
            Assigned at Fund Custodian approval
          </span>
        ),
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      align: 'right',
      cell: (row) => (
        <div className="py-0.5 text-right">
          <span className="font-bold text-slate-900 text-sm">{formatCurrency(row.amount)}</span>
        </div>
      ),
    },
    {
      header: 'Request Date',
      accessorKey: 'request_date',
      sortable: true,
      align: 'center',
      cell: (row) => (
        <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
          <Calendar className="w-3 h-3 text-slate-400" />
          {formatDate(row.request_date || row.createdAt)}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      cell: (row) => {
        const status = String(row.status || '').toUpperCase()
        const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 border-slate-200'
        const label =
          status === 'PENDING'
            ? 'PENDING TEAM LEADER'
            : status === 'APPROVED'
              ? 'PENDING FUND CUSTODIAN'
              : status
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${style}`}
          >
            {label || 'UNKNOWN'}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      align: 'center',
      cell: (row) => {
        const status = String(row.status || '').toUpperCase()

        // Under full access (no role yet, or Administrator), ownership
        // doesn't gate anything — you can edit any row to test the flow.
        // With a real REQUESTER role, it's still locked to rows you own.
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
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                title={status === 'REJECTED' ? 'Edit & Resubmit' : 'Edit'}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            {canComplete && status === 'APPROVED' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onComplete?.(row)
                }}
                title="Fund Custodian Approve / Reject"
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      },
    },
  ]
}

export default createRequestColumns
