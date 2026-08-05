import { useState, useMemo, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

const MOCK_REVOLVING_FUNDS = [
  { id: 'RF-101', name: 'Petty Cash - Main Operations' },
  { id: 'RF-102', name: 'Field Operations Travel Fund' },
  { id: 'RF-103', name: 'Emergency Contingency Fund' },
]

export default function SubmitCashDisbursementModal({ isOpen, onClose, disbursement, onSubmit }) {
  if (!disbursement) return null

  const [selectedFundId, setSelectedFundId] = useState(disbursement.fundId || 'RF-101')
  const [amountExpended, setAmountExpended] = useState(disbursement.amountExpended || '')
  const [amountReturned, setAmountReturned] = useState(disbursement.amountReturned || '')

  useEffect(() => {
    if (disbursement) {
      setAmountExpended(disbursement.amountExpended || '')
      setAmountReturned(disbursement.amountReturned || '')
    }
  }, [disbursement])

  const amountIssued = disbursement.amountIssued || 0

  const dynamicRemainingOutstanding = useMemo(() => {
    const expended = parseFloat(amountExpended) || 0
    const returned = parseFloat(amountReturned) || 0
    const remaining = amountIssued - (expended + returned)
    return remaining < 0 ? 0 : remaining
  }, [amountIssued, amountExpended, amountReturned])

  const selectedFund = useMemo(() => {
    return (
      MOCK_REVOLVING_FUNDS.find((f) => f.id === selectedFundId) || {
        id: 'RF-101',
        name: disbursement.fundName || 'Petty Cash - Main Operations',
      }
    )
  }, [selectedFundId, disbursement])

  const handleSubmit = (e) => {
    e.preventDefault()
    const exp = parseFloat(amountExpended) || 0
    const ret = parseFloat(amountReturned) || 0

    onSubmit({
      ...disbursement,
      fundId: selectedFund.id,
      fundName: selectedFund.name,
      amountExpended: exp,
      amountReturned: ret,
      outstandingAmount: dynamicRemainingOutstanding,
      dateLiquidated: new Date().toISOString().split('T')[0],
      status: 'Liquidated',
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Liquidation Voucher"
      subtitle="Settle expenses and cash returns for disbursement voucher."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-Only Metadata Card */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Cash Voucher
            </span>
            <span className="font-bold text-slate-800">{disbursement.voucherNo || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Disbursement ID
            </span>
            <span className="font-bold text-slate-800">{disbursement.id || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Revolving Fund ID
            </span>
            <span className="font-bold text-slate-700">{selectedFund.id}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Revolving Fund Label
            </span>
            <span className="font-semibold text-slate-700 truncate block">{selectedFund.name}</span>
          </div>
        </div>

        {/* Amount Calculations Summary */}
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
              Outstanding Balance
            </span>
            <span className="text-sm font-extrabold text-red-900">
              ₱{dynamicRemainingOutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Revolving Fund Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Select Revolving Fund <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedFundId}
            onChange={(e) => setSelectedFundId(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
          >
            {MOCK_REVOLVING_FUNDS.map((fund) => (
              <option key={fund.id} value={fund.id}>
                [{fund.id}] {fund.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Expended & Returned */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount Return <span className="text-red-500">*</span>
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
                value={amountReturned}
                onChange={(e) => setAmountReturned(e.target.value)}
                className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
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
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Submit Liquidation
          </button>
        </div>
      </form>
    </Modal>
  )
}
