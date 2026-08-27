import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const NON_ISSUABLE_STATUSES = ['CLOSED', 'CLEARED', 'RETURN']

export default function DisburseCashRequestModal({
  isOpen,
  onClose,
  cashRequest,
  onDisburse,
  onReject,
  isSubmitting,
  getEmployeeName,
  revolvingFunds = [],
  getFundLabel,
}) {
  const [selectedFundId, setSelectedFundId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setSelectedFundId('')
      setRemarks('')
      setPendingAction(null)
      setFormError(null)
    }
  }, [isOpen])

  if (!cashRequest) return null

  const amount = parseFloat(cashRequest.amount || 0)

  // Fresh cash leaving a fund — same eligibility as issueCashDisbursement:
  // OPEN/ON REVIEW only, and enough balance to cover this request.
  const eligibleFunds = revolvingFunds.filter(
    (f) => !NON_ISSUABLE_STATUSES.includes(f.status) && parseFloat(f.balance || 0) >= amount,
  )

  const handleDisburse = async () => {
    if (!selectedFundId) {
      setFormError('Select a revolving fund to disburse this request from.')
      return
    }
    setPendingAction('disburse')
    const result = await onDisburse({
      id: cashRequest.id,
      revolving_fund_id: selectedFundId,
      remarks: remarks || undefined,
    })
    setPendingAction(null)
    if (result?.success) onClose()
    else setFormError(result?.message || 'Failed to disburse.')
  }

  const handleReject = async () => {
    if (!remarks.trim()) {
      setFormError('A reason is required to reject.')
      return
    }
    setPendingAction('reject')
    const result = await onReject({ id: cashRequest.id, remarks })
    setPendingAction(null)
    if (result?.success) onClose()
    else setFormError(result?.message || 'Failed to reject.')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fund Custodian — Disburse Cash Request"
      subtitle={cashRequest.reference_id}
      maxWidth="max-w-lg"
    >
      <div className="space-y-3">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}
        <div className="text-xs">
          <span className="text-slate-500">Requester: </span>
          <span className="font-semibold">
            {getEmployeeName
              ? getEmployeeName(cashRequest.employee_id)
              : `#${cashRequest.employee_id}`}
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Project</span>
            <span className="font-semibold">{cashRequest.project}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Purpose</span>
            <span className="font-semibold">{cashRequest.purpose}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-200">
            <span className="font-bold text-slate-800">Amount</span>
            <span className="font-bold">{formatCurrency(amount)}</span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Revolving Fund
          </label>
          <select
            value={selectedFundId}
            onChange={(e) => setSelectedFundId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <option value="">Select a fund…</option>
            {eligibleFunds.map((f) => (
              <option key={f.id} value={f.id}>
                {getFundLabel ? getFundLabel(f.id) : `Fund #${f.id}`} — {f.status} (Balance:{' '}
                {formatCurrency(f.balance)})
              </option>
            ))}
          </select>
          {eligibleFunds.length === 0 && (
            <p className="text-[11px] text-orange-600 mt-1">
              No active fund currently has enough balance to cover this request.
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            A cash voucher number is generated automatically on disbursement.
          </p>
        </div>

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
            onClick={handleDisburse}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {pendingAction === 'disburse' ? 'Disbursing...' : 'Disburse'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
