import { Eye, Edit2, Trash2 } from 'lucide-react'

/**
 * Builds the DataTable column definitions for the Budget Management table.
 *
 * Note on the money columns: budget.amount (row.amount) is a LIVE balance —
 * it's debited when a Revolving Fund issues cash and credited when cash is
 * returned. It represents what's AVAILABLE right now, not the original
 * pool size. useBudgets derives:
 *   - row.expended  = sum of `outstanding` across this budget's Revolving
 *                     Funds (cash currently issued, not yet liquidated)
 *   - row.allocated = row.amount + row.expended (reconstructed total pool
 *                     at this moment)
 * so Allocated / Expended / Remaining / Utilization all stay consistent
 * and reflect live Revolving Fund + Cash Disbursement activity.
 *
 * @param {Object} handlers
 * @param {(row: object) => string} handlers.getDepartmentName - resolves a department name for a budget row
 * @param {(row: object, e: Event) => void} handlers.onViewHistory
 * @param {(row: object, e: Event) => void} handlers.onEdit
 * @param {(row: object, e: Event) => void} handlers.onDelete
 */
export function createBudgetColumns({ getDepartmentName, onViewHistory, onEdit, onDelete }) {
  return [
    {
      header: 'Code / Dept',
      accessorKey: 'department_id',
      sortable: true,
      cell: (row) => {
        const rawDate = row.createdAt || row.date
        const formattedDate =
          rawDate && !isNaN(new Date(rawDate).getTime())
            ? new Date(rawDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'N/A'

        const departmentName = getDepartmentName(row)

        return (
          <div>
            <p className="font-bold text-slate-900">{departmentName}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
              <span>{row.id ? row.id.toString().slice(0, 8) : 'N/A'}</span>
              <span>•</span>
              <span className="font-sans">{formattedDate}</span>
            </div>
          </div>
        )
      },
    },
    {
      header: 'Type',
      accessorKey: 'type',
      sortable: true,
      cell: (row) => (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {row.type || 'ETC'}
        </span>
      ),
    },
    {
      header: 'Allocated Amount',
      accessorKey: 'allocated',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const allocated = parseFloat(row.allocated || 0)
        return (
          <span className="font-semibold text-slate-900">
            ₱{allocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      header: 'Expended',
      align: 'right',
      cell: (row) => {
        const expended = parseFloat(row.expended || 0)
        return (
          <span className="font-medium text-slate-700">
            ₱{expended.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      header: 'Remaining',
      align: 'right',
      cell: (row) => {
        const allocated = parseFloat(row.allocated || 0)
        const expended = parseFloat(row.expended || 0)
        const remaining = allocated - expended
        const isNegative = remaining < 0

        return (
          <span className={`font-bold ${isNegative ? 'text-[#E31837]' : 'text-slate-900'}`}>
            ₱{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      header: 'Utilization',
      align: 'center',
      cell: (row) => {
        const allocated = parseFloat(row.allocated || 0)
        const expended = parseFloat(row.expended || 0)
        const rawPercentage = allocated > 0 ? Math.round((expended / allocated) * 100) : 0
        const barWidth = Math.min(rawPercentage, 100)
        const isOver = expended > allocated

        return (
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{rawPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOver ? 'bg-[#E31837]' : rawPercentage > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      header: 'Actions',
      align: 'center',
      width: 'w-24',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => onViewHistory(row, e)}
            title="View History Logs"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(row, e)
            }}
            title="Top Up / Edit"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => onDelete(row, e)}
            title="Soft Delete Allocation"
            className="p-1.5 text-slate-400 hover:text-[#E31837] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]
}
