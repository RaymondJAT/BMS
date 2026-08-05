import React from 'react'
import { FileCheck2, AlertCircle, CheckCircle2, Calendar, Eye, Edit3 } from 'lucide-react'

/**
 * Professional Revolving Fund Columns Definition
 * Preserves initial stacked layout style while clearly displaying Disbursed, Liquidated, Returned, and Unliquidated figures.
 */
export function createRevolvingColumns({ onView, onEdit, onSubmit, onLiquidate }) {
  const handleSubmitAction = onSubmit || onLiquidate

  return [
    {
      header: 'Fund Name & Reference',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="py-0.5">
          <p className="font-semibold text-slate-900 text-sm">{row.name}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {row.id || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Reporting Period',
      accessorKey: 'startDate',
      cell: (row) => {
        const isClosed = Boolean(row.endedDate || row.reportedDate || row.submittedAt)

        return (
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
              <Calendar className="w-3 h-3 text-slate-400" />
              {row.startDate} – {row.endDate}
            </div>

            {isClosed ? (
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Report Finalized
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic">Active Cycle</div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Allocated Capital',
      accessorKey: 'totalAvailable',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const beginning = parseFloat(row.baseCap || row.beginning || 0)
        const added = parseFloat(row.replenished || row.added || 0)
        const total = beginning + added

        return (
          <div>
            <div className="font-bold text-slate-900 text-sm">
              ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            {added > 0 ? (
              <div className="text-[10px] text-emerald-600 font-medium">
                (+₱{added.toLocaleString(undefined, { minimumFractionDigits: 2 })} replenishment)
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">
                Initial: ₱{beginning.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Disbursements & Liquidation',
      align: 'right',
      cell: (row) => {
        const issued = parseFloat(row.issued || 0)
        const liquidated = parseFloat(row.liquidated || 0)
        const returned = parseFloat(row.returned || row.cashReturned || 0)
        const unliquidated = parseFloat(row.unliquidated || 0)

        return (
          <div className="space-y-0.5">
            <div className="text-xs text-slate-700">
              Disbursed:{' '}
              <span className="font-semibold text-slate-900">
                ₱{issued.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="text-[11px] text-emerald-600 font-medium">
              Liquidated:{' '}
              <span className="font-semibold">
                ₱{liquidated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {returned > 0 && (
              <div className="text-[11px] text-blue-600 font-medium">
                Returned:{' '}
                <span className="font-semibold">
                  ₱{returned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {unliquidated > 0 ? (
              <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1 justify-end">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>
                  ₱{unliquidated.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                  unliquidated
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400">Fully Settled</div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Available Balance',
      accessorKey: 'balance',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const balance = parseFloat(row.endingBalance ?? row.balance ?? 0)
        const endedAmount = row.endedAmount !== undefined ? parseFloat(row.endedAmount) : null
        const isClosed = Boolean(row.endedDate || row.status === 'Closed')
        const isLow = balance < 10000

        return (
          <div>
            <span
              className={`text-sm font-bold ${isLow && !isClosed ? 'text-[#E31837]' : 'text-slate-900'}`}
            >
              ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>

            {endedAmount !== null ? (
              <div className="text-[10px] text-slate-500 font-medium">
                Ended Amount: ₱{endedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            ) : isLow && !isClosed ? (
              <div className="text-[10px] text-red-500 font-medium">Low Balance Threshold</div>
            ) : null}
          </div>
        )
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      cell: (row) => {
        const isSubmitted = Boolean(row.endedDate || row.reportedDate || row.submittedAt)
        const status = isSubmitted ? 'Reported' : row.status || 'Active'

        const statusStyles = {
          Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          Reported: 'bg-blue-50 text-blue-700 border-blue-200',
          Closed: 'bg-slate-100 text-slate-600 border-slate-200',
          'Low Balance': 'bg-amber-50 text-amber-700 border-amber-200',
        }

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              statusStyles[status] || statusStyles.Closed
            }`}
          >
            {status}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      align: 'center',
      width: 'w-24',
      cell: (row) => {
        const isClosed = row.status === 'Closed' || Boolean(row.endedDate)

        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onView?.(row, e)
              }}
              title="View Fund Details"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              disabled={isClosed}
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(row, e)
              }}
              title={isClosed ? 'Fund closed' : 'Edit Fund Details'}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              disabled={isClosed}
              onClick={(e) => {
                e.stopPropagation()
                handleSubmitAction?.(row, e)
              }}
              title={isClosed ? 'Fund closed' : 'Submit Fund Report'}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
            </button>
          </div>
        )
      },
    },
  ]
}
