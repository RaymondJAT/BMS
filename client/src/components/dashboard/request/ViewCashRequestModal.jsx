import { useMemo } from 'react'
import { Modal } from '../../ui/Modal'
import { amountToWords } from '../../../utils/numberToWords'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

/**
 * Read-only — cash-request.routes.js has no update endpoint, so there's
 * nothing editable here by design, only a details view.
 */
export default function ViewCashRequestModal({
  isOpen,
  onClose,
  request,
  getEmployeeName,
  getDepartmentName,
  getFundLabel,
}) {
  const amountInWords = useMemo(() => {
    return request?.amount ? amountToWords(request.amount) : ''
  }, [request?.amount])

  if (!request) return null

  const status = String(request.status || '').toUpperCase()
  const statusStyle = STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200'

  const fields = [
    ['Reference', request.reference_id || `#${request.id}`],
    ['Project', request.project],
    ['Purpose', request.purpose],
    ['Amount', formatCurrency(request.amount)],
    [
      'Revolving Fund',
      getFundLabel ? getFundLabel(request.revolving_fund_id) : `Fund #${request.revolving_fund_id}`,
    ],
    [
      'Requester',
      getEmployeeName ? getEmployeeName(request.employee_id) : `Employee #${request.employee_id}`,
    ],
    [
      'Department',
      getDepartmentName
        ? getDepartmentName(request.department_id)
        : `Dept #${request.department_id}`,
    ],
    ['Team Lead', request.team_lead],
    ['Cash Voucher', request.cv_number || '—'],
    [
      'Request Date',
      request.request_date ? new Date(request.request_date).toLocaleDateString('en-PH') : '—',
    ],
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cash Request Details"
      subtitle={request.reference_id}
      maxWidth="max-w-lg"
    >
      <div className="space-y-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusStyle}`}
        >
          {status}
        </span>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
          {fields.map(([label, value]) => (
            <div key={label}>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                {label}
              </div>
              <div className="font-semibold text-slate-800 wrap-break-word">{value}</div>
            </div>
          ))}
        </div>

        {/* Amount in Words Field */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Amount in Words
          </label>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={amountInWords}
            placeholder="N/A"
            className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 italic cursor-not-allowed select-none focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
