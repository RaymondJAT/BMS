import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ApproveLiquidationModal({
  isOpen,
  onClose,
  liquidation,
  onApprove,
  onReject,
  isSubmitting,
  getEmployeeName,
  receipt,
}) {
  const [remarks, setRemarks] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setRemarks('')
      setPendingAction(null)
      setFormError(null)
    }
  }, [isOpen])
  if (!liquidation) return null

  const handleApprove = async () => {
    setPendingAction('approve')
    const result = await onApprove({ remarks: remarks || undefined })
    setPendingAction(null)
    if (result?.success) onClose()
    else setFormError(result?.message || 'Failed to approve.')
  }
  const handleReject = async () => {
    if (!remarks.trim()) {
      setFormError('A reason is required to reject.')
      return
    }
    setPendingAction('reject')
    const result = await onReject({ remarks })
    setPendingAction(null)
    if (result?.success) onClose()
    else setFormError(result?.message || 'Failed to reject.')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Leader Review — Liquidation"
      subtitle={liquidation.reference_id}
      maxWidth="max-w-lg"
    >
      <div className="space-y-3">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Requester</div>
            <div className="font-semibold text-slate-800">
              {getEmployeeName
                ? getEmployeeName(liquidation.employee_id)
                : `#${liquidation.employee_id}`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Purpose</div>
            <div className="font-semibold text-slate-800">{liquidation.description}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">
              Cash Received
            </div>
            <div className="font-semibold text-slate-800">
              {formatCurrency(liquidation.amount_obtained)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">
              Total Liquidated
            </div>
            <div className="font-bold text-slate-900">
              {formatCurrency(liquidation.amount_expended)}
            </div>
          </div>
        </div>
        {receipt && (
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Receipt</div>
            <img
              src={receipt}
              alt="Receipt"
              className="max-h-48 rounded-lg border border-slate-200"
            />
          </div>
        )}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Remarks{' '}
            <span className="text-slate-400 normal-case font-medium">(required to reject)</span>
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 border border-red-200 text-red-600 font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {pendingAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {pendingAction === 'approve' ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
