import React from 'react'
import { Eye, Edit3, Send, Calendar, User, Building, AlertCircle } from 'lucide-react'

/**
 * Cash Disbursement Columns Definition
 * Fully aligned with exact field structure:
 * ID, REVOLVING FUND, PARTICULARS, DATE ISSUED, RECEIVED BY, DEPARTMENT,
 * CASH VOUCHER, AMOUNT ISSUED, AMOUNT RETURNED, AMOUNT EXPENDED,
 * OUTSTANDING AMOUNT, STATUS, DATE LIQUIDATED, ACTIONS
 */
export function createDisbursementColumns({ onView, onEdit, onSubmit }) {
  return [
    {
      header: 'ID & Voucher',
      accessorKey: 'id',
      sortable: true,
      cell: (row) => (
        <div className="py-0.5">
          <p className="font-semibold text-slate-900 text-sm">{row.voucherNo || 'N/A'}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {row.id || 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Revolving Fund',
      accessorKey: 'fundName',
      sortable: true,
      cell: (row) => (
        <div className="py-0.5">
          <p className="font-semibold text-slate-900 text-sm">{row.fundName || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Purpose',
      accessorKey: 'particulars',
      sortable: true,
      cell: (row) => (
        <div className="py-0.5 max-w-50">
          <p
            className="text-xs text-slate-700 font-medium line-clamp-2 leading-snug"
            title={row.particulars}
          >
            {row.particulars || '—'}
          </p>
        </div>
      ),
    },
    {
      header: 'Payee & Department',
      accessorKey: 'receivedBy',
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5 py-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{row.receivedBy || 'N/A'}</span>
          </div>
          {row.department && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Building className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{row.department}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Dates',
      accessorKey: 'dateIssued',
      cell: (row) => (
        <div className="space-y-1 py-0.5">
          <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
            <Calendar className="w-3 h-3 text-slate-400" />
            Issued: {row.dateIssued || 'N/A'}
          </div>

          {row.dateLiquidated ? (
            <div className="text-[11px] text-emerald-700 font-medium">
              Liq: {row.dateLiquidated}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic">Unliquidated</div>
          )}
        </div>
      ),
    },
    {
      header: 'Disbursements Breakdown',
      align: 'right',
      cell: (row) => {
        const issued = parseFloat(row.amountIssued || 0)
        const expended = parseFloat(row.amountExpended || 0)
        const returned = parseFloat(row.amountReturned || 0)

        return (
          <div className="space-y-0.5 py-0.5 text-right">
            <div className="text-xs text-slate-700">
              Issued:{' '}
              <span className="font-semibold text-slate-900">
                ₱{issued.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {expended > 0 && (
              <div className="text-[11px] text-emerald-600 font-medium">
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
          </div>
        )
      },
    },
    {
      header: 'Outstanding Amount',
      accessorKey: 'outstandingAmount',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const outstanding = parseFloat(row.outstandingAmount || 0)
        const isSettled = outstanding === 0

        return (
          <div className="py-0.5 text-right">
            <span
              className={`text-sm font-bold ${!isSettled ? 'text-amber-600' : 'text-slate-900'}`}
            >
              ₱{outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>

            {!isSettled ? (
              <div className="text-[10px] text-amber-600 font-medium flex items-center justify-end gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Pending Settlement</span>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 mt-0.5">Fully Settled</div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      cell: (row) => {
        const status = row.status || 'Issued'

        const statusStyles = {
          Issued: 'bg-amber-50 text-amber-700 border-amber-200',
          Liquidated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          Pending: 'bg-blue-50 text-blue-700 border-blue-200',
          Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
        }

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              statusStyles[status] || statusStyles.Pending
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
        const isClosed = row.status === 'Liquidated' || row.status === 'Cancelled'

        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onView?.(row, e)
              }}
              title="View Disbursement Details"
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
              title={isClosed ? 'Disbursement settled' : 'Edit Disbursement Details'}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              disabled={isClosed}
              onClick={(e) => {
                e.stopPropagation()
                onSubmit?.(row, e)
              }}
              title={isClosed ? 'Disbursement settled' : 'Submit Disbursement Liquidation'}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )
      },
    },
  ]
}
