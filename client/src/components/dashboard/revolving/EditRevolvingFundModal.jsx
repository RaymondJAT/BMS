import React, { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'
import { PlusCircle, Wallet, ArrowUpRight, Lock, Loader2 } from 'lucide-react'

export default function EditRevolvingFundModal({
  fund,
  isOpen,
  onClose,
  onSave,
  isSubmitting,
  getFundLabel,
}) {
  const [name, setName] = useState('')
  const [baseCap, setBaseCap] = useState('')
  const [previouslyAdded, setPreviouslyAdded] = useState(0)
  const [addAmount, setAddAmount] = useState('')

  useEffect(() => {
    if (fund) {
      setName(
        getFundLabel
          ? getFundLabel(fund)
          : fund.name || fund.fund_name || `Fund #${fund.id ?? fund.revolving_fund_id ?? 'N/A'}`,
      )
      setBaseCap(fund.baseCap || fund.beginning || '')
      setPreviouslyAdded(parseFloat(fund.replenished || fund.added || 0) || 0)
      setAddAmount('')
    }
  }, [fund, getFundLabel])

  const handleAmountKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
    }
  }

  if (!fund) return null

  const beginningAmount = parseFloat(baseCap) || 0
  const addDelta = parseFloat(addAmount) || 0
  const previewNewAddedTotal = previouslyAdded + addDelta
  const previewTotalFund = beginningAmount + previewNewAddedTotal

  const handleSubmit = (e) => {
    e.preventDefault()
    if (addDelta <= 0) return
    onSave({
      id: fund.id || fund.revolving_fund_id,
      add_amount: addDelta,
    })
  }

  const formatCurrency = (val) =>
    `₱${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Revolving Fund" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* FUND NAME */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
            <span>Fund Name</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-normal">
              <Lock className="w-2.5 h-2.5" /> Read-only
            </span>
          </label>
          <input
            type="text"
            readOnly
            disabled
            value={name}
            className="w-full px-3 py-2 sm:py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-500 cursor-not-allowed select-none truncate"
          />
        </div>

        {/* RESPONSIVE AMOUNT GRID */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-2">
            {/* Beginning Amount */}
            <div>
              <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1 truncate">
                <span>Beginning</span>
                <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={formatCurrency(beginningAmount)}
                className="w-full px-2.5 sm:px-2 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none truncate"
              />
            </div>

            {/* Added So Far */}
            <div>
              <label className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-1 truncate">
                <span>Added So Far</span>
                <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={formatCurrency(previouslyAdded)}
                className="w-full px-2.5 sm:px-2 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none truncate"
              />
            </div>

            {/* Add to Fund Now */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 truncate">
                Add Now (PHP) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                placeholder="0.00"
                value={addAmount}
                onKeyDown={handleAmountKeyDown}
                onChange={(e) => setAddAmount(e.target.value)}
                className="w-full px-2.5 sm:px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 leading-tight">
            This amount adds on top of existing funds without requiring re-entering previous totals.
          </p>
        </div>

        {/* SUMMARY BREAKDOWN */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2">
          <h4 className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Fund Allocation Breakdown
          </h4>

          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between items-center">
              <span>Beginning Amount:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(beginningAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Added So Far:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(previouslyAdded)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="inline-flex items-center gap-1">
                <PlusCircle className="w-3 h-3 text-emerald-600" /> Adding Now:
              </span>
              <span className="font-semibold text-emerald-600">+{formatCurrency(addDelta)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs font-bold text-slate-900">
            <span className="inline-flex items-center gap-1 text-slate-800">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#E31837]" />
              New Total Fund:
            </span>
            <span className="text-xs sm:text-sm font-extrabold">
              {formatCurrency(previewTotalFund)}
            </span>
          </div>
        </div>

        {/* ACTION CONTROLS */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={addDelta <= 0 || isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
