import { Eye, Edit2, Trash2 } from 'lucide-react'

/**
 * Builds the DataTable column definitions for the Budget Management table.
 */
export function createBudgetColumns({ getDepartmentName, onViewHistory, onEdit, onDelete }) {
  const formatCurrency = (val) =>
    `₱${parseFloat(val || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

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
      cell: (row) => {
        const typeUpper = String(row.type || 'ETC')
          .toUpperCase()
          .trim()

        const typeStyles = {
          GCASH: 'bg-blue-50 text-[#005CE6] border-blue-200',
          CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        }

        const currentStyle = typeStyles[typeUpper] || 'bg-slate-100 text-slate-700 border-slate-200'

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${currentStyle}`}
          >
            {typeUpper}
          </span>
        )
      },
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
      header: 'Deployed Funds',
      accessorKey: 'deployed_to_revolving_funds',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const deployed = parseFloat(row.deployed_to_revolving_funds || 0)
        const utilized = parseFloat(row.cash_disbursement_utilized || 0)
        const rawPercent = parseFloat(row.cash_disbursement_utilization_percent || 0)
        const cdUtilPercent = Number.isFinite(rawPercent) ? rawPercent : 0
        const roundedCd = Math.round(cdUtilPercent)
        const barWidth = Math.min(Math.max(roundedCd, 0), 100)

        return (
          <div className="space-y-1">
            <div className="font-semibold text-slate-800">{formatCurrency(deployed)}</div>
            {deployed > 0 && (
              <div className="w-32 ml-auto space-y-0.5 text-right">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Disbursed:</span>
                  <span>
                    {formatCurrency(utilized)} ({roundedCd}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      cdUtilPercent > 100
                        ? 'bg-[#E31837]'
                        : cdUtilPercent > 85
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
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
      accessorKey: 'utilization_percent',
      sortable: true,
      align: 'center',
      cell: (row) => {
        const rawPercent = parseFloat(row.utilization_percent || 0)
        const percentage = Number.isFinite(rawPercent) ? rawPercent : 0
        const rounded = Math.round(percentage)
        const barWidth = Math.min(Math.max(rounded, 0), 100)
        const isOver = percentage > 100

        return (
          <div className="w-28 mx-auto space-y-1">
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
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      align: 'center',
      cell: (row) => {
        const remaining = parseFloat(row.remaining_budget || 0)
        const utilization = parseFloat(row.utilization_percent || 0)

        const rawStatus = String(row.status || '').trim()
        let displayStatus = rawStatus

        if (!rawStatus) {
          if (remaining < 0 || utilization > 100) {
            displayStatus = 'OVER BUDGET'
          } else if (utilization >= 85) {
            displayStatus = 'NEAR LIMIT'
          } else if (remaining === 0) {
            displayStatus = 'EXHAUSTED'
          } else {
            displayStatus = 'ACTIVE'
          }
        }

        const statusKey = displayStatus.toLowerCase()

        const statusStyles = {
          active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          'near limit': 'bg-amber-50 text-amber-700 border-amber-200',
          'over budget': 'bg-red-50 text-[#E31837] border-red-200',
          exhausted: 'bg-slate-100 text-slate-600 border-slate-200',
          closed: 'bg-slate-100 text-slate-600 border-slate-200',
        }

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              statusStyles[statusKey] || statusStyles.active
            }`}
          >
            {displayStatus}
          </span>
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
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewHistory(row, e)
            }}
            title="View History Logs"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
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
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(row, e)
            }}
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
