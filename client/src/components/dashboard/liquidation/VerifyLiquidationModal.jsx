import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function VerifyLiquidationModal({
  isOpen,
  onClose,
  liquidation,
  onVerify,
  onReject,
  isSubmitting,
  getEmployeeName,
  receipt,
  revolvingFunds = [], // eligible (non-CLOSED) funds to settle against
  originalFundId, // the disbursement's own fund id
  originalFundStatus, // that fund's current status
}) {
  const [remarks, setRemarks] = useState('')
  const [selectedFundId, setSelectedFundId] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setRemarks('')
      setPendingAction(null)
      setFormError(null)
      setSelectedFundId('')
      return
    }
    // Preselect the original fund when it's still eligible; otherwise
    // leave blank so the custodian has to actively choose a fund.
    const originalIsEligible = revolvingFunds.some((f) => String(f.id) === String(originalFundId))
    setSelectedFundId(originalIsEligible ? String(originalFundId) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!liquidation) return null

  const cashReceived = parseFloat(liquidation.amount_obtained || 0)
  const totalLiquidated = parseFloat(liquidation.amount_expended || 0)
  const difference = Math.round((cashReceived - totalLiquidated) * 100) / 100
  const needsFundSelection = difference !== 0
  const originalFundClosed = originalFundStatus === 'CLOSED'

  const handleVerify = async () => {
    if (needsFundSelection && !selectedFundId) {
      setFormError('Select a revolving fund to settle the Cash to Return / Reimbursement against.')
      return
    }
    setPendingAction('verify')
    const result = await onVerify({
      remarks: remarks || undefined,
      revolving_fund_id: selectedFundId || undefined,
    })
    setPendingAction(null)
    if (result?.success) onClose()
    else setFormError(result?.message || 'Failed to verify.')
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
      title="Fund Custodian Review — Liquidation"
      subtitle={liquidation.reference_id}
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
              ? getEmployeeName(liquidation.employee_id)
              : `#${liquidation.employee_id}`}
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Cash Received</span>
            <span className="font-semibold">{formatCurrency(cashReceived)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Liquidated</span>
            <span className="font-semibold">{formatCurrency(totalLiquidated)}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-200">
            <span className="font-bold text-slate-800">
              {difference > 0
                ? 'Cash to Return'
                : difference < 0
                  ? 'Reimbursement'
                  : 'Fully Liquidated'}
            </span>
            <span className="font-bold">{formatCurrency(Math.abs(difference))}</span>
          </div>
        </div>

        {needsFundSelection && (
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Revolving Fund to Settle Against
            </label>
            <select
              value={selectedFundId}
              onChange={(e) => setSelectedFundId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="">Select a fund…</option>
              {revolvingFunds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label || `Fund #${f.id}`} — {f.status} (Balance: {formatCurrency(f.balance)})
                </option>
              ))}
            </select>
            {originalFundClosed && (
              <p className="text-[11px] text-orange-600 mt-1">
                The originating fund is closed — choose an open fund to receive this{' '}
                {difference > 0 ? 'return' : 'reimbursement'}.
              </p>
            )}
          </div>
        )}

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
            onClick={handleVerify}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {pendingAction === 'verify' ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
