import { Download } from 'lucide-react'

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

/**
 * Liquidation list columns. Deliberately read-only besides Download —
 * Edit, Team Leader Approve/Reject, Fund Custodian Verify/Reject, and
 * Finance post-audit all moved to LiquidationDetailPage, since every one
 * of those decisions requires checking line items against receipts
 * first, which only the detail page shows. Clicking a row (onRowClick,
 * wired by the page) or the reference id navigates there.
 */
export function createLiquidationColumns({ onDownload, getEmployeeName }) {
  return [
    {
      header: 'Reference',
      accessorKey: 'reference_id',
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-slate-900 text-sm hover:text-[#E31837] hover:underline">
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
      cell: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDownload?.(row)
            }}
            title="Download Liquidation PDF"
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]
}

export default createLiquidationColumns
