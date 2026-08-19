import { Eye, Edit2, Trash2 } from 'lucide-react'

/**
 * Builds the DataTable column definitions for the Budget Management table.
 *
 * All money figures below come straight from budgetController.js's
 * getBudgetBudget, which derives every one of them LIVE from the actual
 * revolving_fund / cash_disbursement rows (see that function's docstring
 * for the full breakdown). Nothing here is recomputed client-side beyond
 * simple display formatting.
 *
 * @param {Object} handlers
 * @param {(row: object) => string} handlers.getDepartmentName
 * @param {(row: object, e: Event) => void} handlers.onViewHistory
 * @param {(row: object, e: Event) => void} handlers.onEdit
 * @param {(row: object, e: Event) => void} handlers.onDelete
 */
export function createBudgetColumns({ getDepartmentName, onViewHistory, onEdit, onDelete }) {
  const formatCurrency = (val) =>
    `₱${parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

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
      header: 'Budget Allocation',
      accessorKey: 'total_budget',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const beginning = parseFloat(row.beginning_amount || 0)
        const additional = parseFloat(row.additional_allocation || 0)
        const total = parseFloat(row.total_budget || 0)

        return (
          <div>
            <div className="font-bold text-slate-900 text-sm">{formatCurrency(total)}</div>
            {additional > 0 ? (
              <div className="text-[10px] text-emerald-600 font-medium">
                Beginning {formatCurrency(beginning)} + {formatCurrency(additional)} added
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">
                Beginning: {formatCurrency(beginning)}
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Deployed to Revolving Funds',
      accessorKey: 'deployed_to_revolving_funds',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const deployed = parseFloat(row.deployed_to_revolving_funds || 0)
        const utilized = parseFloat(row.cash_disbursement_utilized || 0)
        const cdUtilPercent = parseFloat(row.cash_disbursement_utilization_percent || 0)

        return (
          <div>
            <span className="font-medium text-slate-700">{formatCurrency(deployed)}</span>
            {deployed > 0 && (
              <div className="text-[10px] text-slate-400">
                {formatCurrency(utilized)} actually disbursed ({cdUtilPercent.toFixed(1)}%)
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Remaining',
      accessorKey: 'remaining_budget',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const remaining = parseFloat(row.remaining_budget || 0)
        const isNegative = remaining < 0

        return (
          <span className={`font-bold ${isNegative ? 'text-[#E31837]' : 'text-slate-900'}`}>
            {formatCurrency(remaining)}
          </span>
        )
      },
    },
    {
      header: 'Utilization',
      align: 'center',
      cell: (row) => {
        const percentage = parseFloat(row.utilization_percent || 0)
        const rounded = Math.round(percentage)
        const barWidth = Math.min(rounded, 100)
        const isOver = percentage > 100

        return (
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{rounded}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOver ? 'bg-[#E31837]' : rounded > 85 ? 'bg-amber-500' : 'bg-emerald-500'
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
