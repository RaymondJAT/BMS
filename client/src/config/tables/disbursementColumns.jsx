import { Edit3, Send, Calendar, User, Building, AlertCircle } from 'lucide-react'

/**
 * Cash Disbursement Columns — aligned with the real backend field names
 * (id, date_issued, received_by, department_id, particulars, cash_voucher,
 * amount_issued, amount_returned, amount_expended, outstanding_amount,
 * status). received_by / department_id / particulars are all foreign key
 * ids, resolved to display names via the lookup functions passed in.
 *
 * The "View" action from the original mock UI is intentionally omitted —
 * there's no ViewCashDisbursementModal wired up on the backend side yet.
 */
export function createDisbursementColumns({
  onEdit,
  onSubmit,
  getEmployeeName,
  getDepartmentName,
  getParticularsName,
}) {
  return [
    {
      header: 'ID & Voucher',
      accessorKey: 'cash_voucher',
      sortable: true,
      cell: (row) => (
        <div className="py-0.5">
          <p className="font-semibold text-slate-900 text-sm">{row.cash_voucher || 'N/A'}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {row.id ?? 'N/A'}</p>
        </div>
      ),
    },
    {
      header: 'Purpose',
      accessorKey: 'particulars',
      sortable: true,
      cell: (row) => {
        const label = getParticularsName(row.particulars)
        return (
          <div className="py-0.5 max-w-50">
            <p
              className="text-xs text-slate-700 font-medium line-clamp-2 leading-snug"
              title={label}
            >
              {label}
            </p>
          </div>
        )
      },
    },
    {
      header: 'Payee & Department',
      accessorKey: 'received_by',
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5 py-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{getEmployeeName(row.received_by)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Building className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{getDepartmentName(row.department_id)}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Date Issued',
      accessorKey: 'date_issued',
      cell: (row) => {
        const rawDate = row.date_issued
        const formattedDate =
          rawDate && !isNaN(new Date(rawDate).getTime())
            ? new Date(rawDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'N/A'

        return (
          <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formattedDate}
          </div>
        )
      },
    },
    {
      header: 'Disbursements Breakdown',
      align: 'right',
      cell: (row) => {
        const issued = parseFloat(row.amount_issued || 0)
        const expended = parseFloat(row.amount_expended || 0)
        const returned = parseFloat(row.amount_returned || 0)

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
                  ₱
                  {expended.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}

            {returned > 0 && (
              <div className="text-[11px] text-blue-600 font-medium">
                Returned:{' '}
                <span className="font-semibold">
                  ₱
                  {returned.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      header: 'Outstanding Amount',
      accessorKey: 'outstanding_amount',
      sortable: true,
      align: 'right',
      cell: (row) => {
        const outstanding = parseFloat(row.outstanding_amount || 0)
        const isSettled = outstanding === 0

        return (
          <div className="py-0.5 text-right">
            <span
              className={`text-sm font-bold ${!isSettled ? 'text-amber-600' : 'text-slate-900'}`}
            >
              ₱
              {outstanding.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
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
        // Real backend ENUM: LIQUIDATED / UNLIQUIDATED — not the mock's
        // Issued/Liquidated/Cancelled set.
        const status = row.status || 'UNLIQUIDATED'

        const statusStyles = {
          UNLIQUIDATED: 'bg-amber-50 text-amber-700 border-amber-200',
          LIQUIDATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        }

        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              statusStyles[status] || statusStyles.UNLIQUIDATED
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
      width: 'w-20',
      cell: (row) => {
        const isClosed = row.status === 'LIQUIDATED'

        return (
          <div className="flex items-center justify-center gap-1">
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
              title={isClosed ? 'Disbursement settled' : 'Record Return / Expended'}
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
