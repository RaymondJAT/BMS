import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'

const ELIGIBLE_LIQUIDATION_STATUSES = ['OPEN', 'ON REVIEW']

/**
 * Records a return and/or expended amount against an existing disbursement.
 * Automates Return vs. Reimbursement calculations based on Amount Expended vs Amount Issued.
 *
 * The "Target Revolving Fund" here is the LIQUIDATION fund — where a return
 * or reimbursement gets credited — which may differ from the disbursement's
 * ORIGINAL fund (the one it was issued from). The original fund keeps its
 * own association untouched no matter what's picked here (see
 * returnCashDisbursement/reimburseCashDisbursement in the backend): this
 * modal only ever supplies revolving_fund_id as the liquidation target, it
 * never changes which fund the disbursement was created under. Only
 * eligible (OPEN / ON REVIEW) funds are offered, since a CLOSED fund can't
 * receive a return or issue a reimbursement — the disbursement's original
 * fund is allowed to be CLOSED (that's exactly the case this list excludes
 * it for the liquidation target while amount_expended still always posts
 * back to it regardless of its status).
 */
export default function SubmitCashDisbursementModal({
  isOpen,
  onClose,
  disbursement,
  revolvingFunds = [],
  onSubmit,
  isSubmitting,
  getFundLabel,
}) {
  const [revolvingFundId, setRevolvingFundId] = useState('')
  const [amountExpended, setAmountExpended] = useState('')
  const [formError, setFormError] = useState(null)

  const eligibleFunds = useMemo(
    () =>
      revolvingFunds.filter((fund) =>
        ELIGIBLE_LIQUIDATION_STATUSES.includes(String(fund.status || '').toUpperCase()),
      ),
    [revolvingFunds],
  )

  const originalFund = useMemo(
    () =>
      disbursement
        ? revolvingFunds.find((f) => String(f.id) === String(disbursement.revolving_fund_id))
        : null,
    [revolvingFunds, disbursement],
  )

  const isOriginalFundEligible = originalFund
    ? ELIGIBLE_LIQUIDATION_STATUSES.includes(String(originalFund.status || '').toUpperCase())
    : false

  useEffect(() => {
    if (disbursement) {
      // Only pre-select the disbursement's original fund if it's still
      // eligible to receive a return/reimbursement. If it's since been
      // CLOSED, leave the field blank so the user has to actively choose
      // one of the still-eligible funds instead of silently submitting
      // against a fund that's no longer valid as a liquidation target.
      setRevolvingFundId(
        disbursement.revolving_fund_id && isOriginalFundEligible
          ? String(disbursement.revolving_fund_id)
          : '',
      )
      setAmountExpended('')
      setFormError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disbursement])

  const amountIssued = disbursement ? parseFloat(disbursement.amount_issued || 0) : 0

  // Calculate return or reimbursement dynamically
  const { difference, isReimbursement, displayAmount } = useMemo(() => {
    const exp = parseFloat(amountExpended) || 0
    const diff = amountIssued - exp

    return {
      difference: diff,
      isReimbursement: diff < 0,
      displayAmount: Math.abs(diff).toFixed(2),
    }
  }, [amountIssued, amountExpended])

  if (!disbursement) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!revolvingFundId) {
      setFormError('Please select an active revolving fund to liquidate against.')
      return
    }

    const exp = parseFloat(amountExpended)
    if (isNaN(exp) || exp < 0) {
      setFormError('Please enter a valid amount expended.')
      return
    }

    // Amount to return to company (positive difference) or 0 if reimbursed
    const ret = difference > 0 ? difference : 0

    const result = await onSubmit({
      disbursement,
      revolving_fund_id: revolvingFundId,
      amount_return: ret,
      amount_expended: exp,
      is_reimbursement: isReimbursement,
      reimbursement_amount: isReimbursement ? Math.abs(difference) : 0,
    })

    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to record liquidation.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Liquidation"
      subtitle="Settle outstanding cash for this disbursement voucher."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {formError}
          </div>
        )}

        {/* Read-Only Metadata Card */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Cash Voucher
            </span>
            <span className="font-bold text-slate-800">{disbursement.cash_voucher || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Disbursement ID
            </span>
            <span className="font-bold text-slate-800">{disbursement.id ?? 'N/A'}</span>
          </div>
        </div>

        {!isOriginalFundEligible && originalFund && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
            This disbursement's original fund (
            {getFundLabel ? getFundLabel(originalFund.id) : `Fund #${originalFund.id}`}) is{' '}
            {originalFund.status} and can no longer receive a return or reimbursement. Select a
            different, active fund below — the disbursement will still be recorded against its
            original fund once liquidated.
          </div>
        )}

        {/* Revolving Fund (75% Width) & Amount Expended (25% Width) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Revolving Fund <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={revolvingFundId}
              onChange={(e) => setRevolvingFundId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            >
              <option value="">Select an active Revolving Fund...</option>
              {eligibleFunds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {getFundLabel ? getFundLabel(fund.id) : fund.name || `Fund #${fund.id}`}
                </option>
              ))}
            </select>
            {eligibleFunds.length === 0 && (
              <p className="text-[11px] text-red-600 mt-1 font-medium">
                No active revolving funds are currently available to liquidate against.
              </p>
            )}
          </div>

          <div className="sm:col-span-1">
            <label
              className="block text-xs font-bold text-slate-700 mb-1 truncate"
              title="Amount Expended"
            >
              Amount Expended <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amountExpended}
                onChange={(e) => setAmountExpended(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Amount Summary Displays */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-amber-50/60 border border-amber-200/70 rounded-lg">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Requested Amount (Issued)
            </span>
            <span className="text-sm font-extrabold text-amber-900">
              ₱{amountIssued.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div
            className={`p-2.5 border rounded-lg ${
              isReimbursement
                ? 'bg-blue-50/60 border-blue-200/70'
                : 'bg-emerald-50/60 border-emerald-200/70'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                isReimbursement ? 'text-blue-700' : 'text-emerald-700'
              }`}
            >
              {isReimbursement ? 'For Reimbursement' : 'To Be Returned'}
            </span>
            <span
              className={`text-sm font-extrabold ${
                isReimbursement ? 'text-blue-900' : 'text-emerald-900'
              }`}
            >
              ₱{parseFloat(displayAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || eligibleFunds.length === 0}
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Liquidation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
