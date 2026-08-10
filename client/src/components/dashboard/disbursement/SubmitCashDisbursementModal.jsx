import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'

/**
 * Records a return and/or expended amount against an existing disbursement.
 * Differences from the old mock version:
 * - Revolving Fund re-select removed — return/expend actions don't take a
 *   revolving_fund_id, it's derived server-side from the disbursement's
 *   existing revolving_fund_id.
 * - Submits via two sequential calls (submitLiquidation in the hook) since
 *   the backend has no combined return+expend endpoint. If one succeeds and
 *   the other fails, the error message reflects that and the table will
 *   show whichever half committed after a refetch.
 */
export default function SubmitCashDisbursementModal({
  isOpen,
  onClose,
  disbursement,
  onSubmit,
  isSubmitting,
  getFundLabel,
}) {
  const [amountExpended, setAmountExpended] = useState('')
  const [amountReturned, setAmountReturned] = useState('')
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (disbursement) {
      setAmountExpended('')
      setAmountReturned('')
      setFormError(null)
    }
  }, [disbursement])

  const amountIssued = disbursement ? parseFloat(disbursement.amount_issued || 0) : 0
  const currentOutstanding = disbursement ? parseFloat(disbursement.outstanding_amount || 0) : 0

  const dynamicRemainingOutstanding = useMemo(() => {
    const expended = parseFloat(amountExpended) || 0
    const returned = parseFloat(amountReturned) || 0
    const remaining = currentOutstanding - (expended + returned)
    return remaining < 0 ? 0 : remaining
  }, [currentOutstanding, amountExpended, amountReturned])

  if (!disbursement) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    const exp = parseFloat(amountExpended) || 0
    const ret = parseFloat(amountReturned) || 0

    if (exp <= 0 && ret <= 0) {
      setFormError('Enter an amount expended and/or returned greater than zero.')
      return
    }
    if (ret > currentOutstanding) {
      setFormError(
        `Return amount (₱${ret.toFixed(2)}) cannot exceed outstanding balance (₱${currentOutstanding.toFixed(2)}).`,
      )
      return
    }

    const totalAccounted = exp + ret
    if (totalAccounted < currentOutstanding - 0.01) {
      const shortfall = currentOutstanding - totalAccounted
      setFormError(
        `This report only accounts for ₱${totalAccounted.toFixed(2)} of the ₱${currentOutstanding.toFixed(2)} outstanding. Enter the remaining ₱${shortfall.toFixed(2)} (as expended or returned) to fully liquidate this disbursement.`,
      )
      return
    }

    const result = await onSubmit({
      disbursement,
      amount_return: ret,
      amount_expended: exp,
    })

    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to record return/expended.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Return / Expended"
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
          <div className="col-span-2">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Revolving Fund
            </span>
            <span className="font-semibold text-slate-700 truncate block">
              {getFundLabel(disbursement.revolving_fund_id)}
            </span>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-amber-50/60 border border-amber-200/70 rounded-lg">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Amount Issued
            </span>
            <span className="text-sm font-extrabold text-amber-900">
              ₱{amountIssued.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-red-50/60 border border-red-200/70 rounded-lg">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
              Remaining After This
            </span>
            <span className="text-sm font-extrabold text-red-900">
              ₱{dynamicRemainingOutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Current outstanding: ₱
          {currentOutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
        </p>

        {/* Amount Expended & Returned */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Amount Expended</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountExpended}
                onChange={(e) => setAmountExpended(e.target.value)}
                className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Amount Return</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountReturned}
                onChange={(e) => setAmountReturned(e.target.value)}
                className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
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
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
