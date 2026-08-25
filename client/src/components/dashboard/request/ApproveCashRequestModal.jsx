import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'
import { amountToWords } from '../../../utils/numberToWords'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

/**
 * Team Lead gate for a PENDING request — the FIRST approval stage.
 * Approve -> APPROVED (moves to Fund Custodian). Reject -> REJECTED
 * (returns to Requester, editable, with mandatory remarks). Neither
 * action touches cash_disbursement, revolving_fund, or budget.
 *
 * No Revolving Fund is shown here — it hasn't been selected yet at this
 * stage (the Fund Custodian picks it during completion, see
 * DisburseCashRequestModal). Showing it here would be misleading.
 */
export default function ApproveCashRequestModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
  isSubmitting,
  getDepartmentName,
  getEmployeeName,
}) {
  const [remarks, setRemarks] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // 'approve' | 'reject'
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setRemarks('')
      setPendingAction(null)
      setFormError(null)
    }
  }, [isOpen])

  const amountInWords = useMemo(() => {
    return request?.amount ? amountToWords(request.amount) : ''
  }, [request?.amount])

  if (!request) return null

  const handleApprove = async () => {
    setFormError(null)
    setPendingAction('approve')
    const result = await onApprove({ remarks: remarks || undefined })
    setPendingAction(null)
    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to approve cash request.')
    }
  }

  const handleReject = async () => {
    setFormError(null)
    if (!remarks.trim()) {
      setFormError('A reason is required to reject a cash request.')
      return
    }
    setPendingAction('reject')
    const result = await onReject({ remarks })
    setPendingAction(null)
    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to reject cash request.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Leader Review"
      subtitle={request.reference_id || `#${request.id}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-3 sm:space-y-3.5">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Project
            </div>
            <div className="font-semibold text-slate-800">{request.project}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Purpose
            </div>
            <div className="font-semibold text-slate-800">{request.purpose}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Requester
            </div>
            <div className="font-semibold text-slate-800">
              {getEmployeeName
                ? getEmployeeName(request.employee_id)
                : `Employee #${request.employee_id}`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Department
            </div>
            <div className="font-semibold text-slate-800">
              {getDepartmentName
                ? getDepartmentName(request.department_id)
                : `Dept #${request.department_id}`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Amount
            </div>
            <div className="font-bold text-slate-900">{formatCurrency(request.amount)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
              Team Leader
            </div>
            <div className="font-semibold text-slate-800">{request.team_lead}</div>
          </div>
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

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Remarks{' '}
            <span className="text-slate-400 normal-case font-medium">
              (required to reject, optional to approve)
            </span>
          </label>
          <textarea
            rows={3}
            placeholder="Add a note..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {pendingAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {pendingAction === 'approve' ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
