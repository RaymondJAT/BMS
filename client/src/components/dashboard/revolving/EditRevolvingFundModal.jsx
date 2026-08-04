import React, { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'
import { PlusCircle, Wallet, ArrowUpRight, Lock } from 'lucide-react'

export default function EditRevolvingFundModal({ fund, isOpen, onClose, onSave }) {
  const [name, setName] = useState('')
  const [baseCap, setBaseCap] = useState('')
  const [addedAmount, setAddedAmount] = useState('')

  useEffect(() => {
    if (fund) {
      setName(fund.name || '')
      setBaseCap(fund.baseCap || fund.beginning || '')
      setAddedAmount(fund.replenished || fund.added || '')
    }
  }, [fund])

  // --- EARLY RETURN AFTER HOOK DEFINITIONS ---
  if (!fund) return null

  const beginningAmount = parseFloat(baseCap) || 0
  const added = parseFloat(addedAmount) || 0
  const totalFund = beginningAmount + added

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...fund,
      name,
      baseCap: beginningAmount,
      replenished: added,
      totalFund,
    })
  }

  const formatCurrency = (val) =>
    `₱${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Revolving Fund">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* --- 1. READ-ONLY FUND NAME --- */}
        <div>
          <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
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
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none"
          />
        </div>

        {/* --- 2. INPUT GRID: READ-ONLY BEGINNING & EDITABLE ADDED --- */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              <span>Beginning Amount</span>
              <Lock className="w-2.5 h-2.5 text-slate-400" />
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={formatCurrency(beginningAmount)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Added Amount (PHP)
            </label>
            <input
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              value={addedAmount}
              onChange={(e) => setAddedAmount(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-[#E31837] shadow-2xs"
            />
          </div>
        </div>

        {/* --- 3. DYNAMIC SUMMARY CARD --- */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5" />
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
              <span className="inline-flex items-center gap-1">
                <PlusCircle className="w-3 h-3 text-emerald-600" /> Added Amount:
              </span>
              <span className="font-semibold text-emerald-600">+{formatCurrency(added)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs font-bold text-slate-900">
            <span className="inline-flex items-center gap-1 text-slate-800">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#E31837]" />
              Total Fund:
            </span>
            <span className="text-sm font-extrabold">{formatCurrency(totalFund)}</span>
          </div>
        </div>

        {/* --- 4. ACTION BUTTONS --- */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#E31837] hover:bg-[#c4122e] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}
