import React from 'react'
import { FileCheck2, AlertCircle, CheckCircle2, Calendar, Eye, Edit3, Clock } from 'lucide-react'

/**
 * Helper to extract YYYY-MM-DD (Year, Month, Day) from any date representation.
 */
function formatDate(dateValue) {
  if (!dateValue || dateValue === '—') return '—'

  const str = String(dateValue).trim()
  if (str.includes('T')) {
    return str.split('T')[0]
  }

  const parsed = new Date(str)
  if (isNaN(parsed.getTime())) {
    return str
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Professional Revolving Fund Columns Definition.
 */
export function createRevolvingColumns({
  onView,
  onEdit,
  onSubmit,
  onLiquidate,
  getReimbursedAmount,
  getFundLabel,
}) {
  const handleSubmitAction = onSubmit || onLiquidate

  return [
    {
      header: 'Fund Name & Reference',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => {
        const fundName = getFundLabel
          ? getFundLabel(row)
          : row.name || row.fund_name || 'Unnamed Fund'
        const fundId = row.id || row.revolving_fund_id || 'N/A'

        return (
          <div className="py-0.5">
            <p className="font-semibold text-slate-900 text-sm">{fundName}</p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {fundId}</p>
          </div>
        )
      },
    },
    {
      header: 'Reporting Period',
      accessorKey: 'start_date',
      cell: (row) => {
        const rawStartDate = row.start_date || row.startDate || '—'
        const rawEndDate = row.end_date || row.endDate || '—'

        const startDate = formatDate(rawStartDate)
        const endDate = formatDate(rawEndDate)

        const statusUpper = String(row.status || '').toUpperCase()

        // Report is strictly finalized ONLY when CLOSED, CLEARED, or CLEAR
        const isFinalized =
          statusUpper === 'CLOSED' || statusUpper === 'CLEARED' || statusUpper === 'CLEAR'

        const isOnReview = statusUpper === 'ON REVIEW'

        return (
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
              <Calendar className="w-3 h-3 text-slate-400" />
              {startDate} – {endDate}
            </div>

            {isFinalized ? (
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Report Finalized
              </div>
            ) : isOnReview ? (
              <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                Pending Review
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
      accessorKey: 'total_fund',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const beginning = parseFloat(row.beginning ?? row.baseCap ?? row.base_cap ?? 0)
        const replenished = parseFloat(row.replenished ?? row.added ?? 0)
        const total = parseFloat(row.total_fund ?? row.totalAvailable ?? beginning + replenished)

        return (
          <div>
            <div className="font-bold text-slate-900 text-sm">
              ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            {replenished > 0 ? (
              <div className="text-[10px] text-emerald-600 font-medium">
                (+₱{replenished.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                replenishment)
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
        const expended = parseFloat(row.amount_expended ?? row.expended ?? 0)
        const unliquidated = Math.max(0, issued - liquidated)
        const fundId = row.id || row.revolving_fund_id
        const reimbursed = getReimbursedAmount ? getReimbursedAmount(fundId) : 0

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

            {expended > 0 && (
              <div className="text-[11px] text-orange-600 font-medium">
                Expended:{' '}
                <span className="font-semibold">
                  ₱{expended.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {returned > 0 && (
              <div className="text-[11px] text-blue-600 font-medium">
                Returned:{' '}
                <span className="font-semibold">
                  ₱{returned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {reimbursed > 0 && (
              <div className="text-[11px] text-purple-600 font-medium">
                Reimbursed:{' '}
                <span className="font-semibold">
                  ₱{reimbursed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
        const balance = parseFloat(row.balance ?? row.endingBalance ?? 0)
        const rawEnded = row.ended_amount ?? row.endedAmount
        const endedAmount =
          rawEnded !== undefined && rawEnded !== null ? parseFloat(rawEnded) : null

        const rawStatus = String(row.status || '').toUpperCase()
        const isClosed =
          rawStatus === 'CLOSED' ||
          rawStatus === 'CLEARED' ||
          rawStatus === 'CLEAR' ||
          rawStatus === 'ON REVIEW' ||
          Boolean(row.ended_date || row.endedDate)
        const isLow = balance < 10000 && !isClosed

        return (
          <div>
            <span className={`text-sm font-bold ${isLow ? 'text-[#E31837]' : 'text-slate-900'}`}>
              ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>

            {endedAmount !== null ? (
              <div className="text-[10px] text-slate-500 font-medium">
                Ended Amount: ₱{endedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            ) : isLow ? (
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
        const isSubmitted = Boolean(
          row.ended_date || row.endedDate || row.reportedDate || row.submittedAt,
        )

        const rawStatus = String(row.status || '').trim()
        let displayStatus = rawStatus

        if (!rawStatus) {
          displayStatus = isSubmitted ? 'REPORTED' : 'ACTIVE'
        } else if (rawStatus.toUpperCase() === 'OPEN') {
          displayStatus = 'ACTIVE'
        }

        const statusKey = displayStatus.toLowerCase()

        const statusStyles = {
          active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          reported: 'bg-blue-50 text-blue-700 border-blue-200',
          'on review': 'bg-orange-50 text-orange-700 border-orange-200',
          cleared: 'bg-teal-50 text-teal-700 border-teal-200',
          clear: 'bg-teal-50 text-teal-700 border-teal-200',
          closed: 'bg-slate-100 text-slate-600 border-slate-200',
          'low balance': 'bg-amber-50 text-amber-700 border-amber-200',
        }

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              statusStyles[statusKey] || statusStyles.closed
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
      cell: (row) => {
        const statusUpper = String(row.status || '').toUpperCase()

        // Disable ONLY when the status is CLOSED or CLEARED / CLEAR
        const isDisabled =
          statusUpper === 'CLOSED' || statusUpper === 'CLEARED' || statusUpper === 'CLEAR'

        return (
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
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
              type="button"
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(row, e)
              }}
              title={isDisabled ? 'Fund finalized' : 'Edit Fund Details'}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={isDisabled}
              onClick={(e) => {
                e.stopPropagation()
                handleSubmitAction?.(row, e)
              }}
              title={isDisabled ? 'Fund finalized' : 'Submit Fund Report'}
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
