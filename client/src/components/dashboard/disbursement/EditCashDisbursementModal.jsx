import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

const MOCK_REVOLVING_FUNDS = [
  'Petty Cash - Main Operations',
  'Field Operations Travel Fund',
  'Emergency Contingency Fund',
]

const MOCK_PAYEES = ['Jane Doe', 'Mark Smith', 'Alex Johnson', 'Sarah Williams']

export default function EditCashDisbursementModal({ isOpen, onClose, disbursement, onSave }) {
  if (!disbursement) return null

  const [formData, setFormData] = useState({
    fundName: disbursement.fundName || MOCK_REVOLVING_FUNDS[0],
    receivedBy: disbursement.receivedBy || MOCK_PAYEES[0],
    voucherNo: disbursement.voucherNo || '',
    department: disbursement.department || '',
    particulars: disbursement.particulars || '',
    amountIssued: disbursement.amountIssued || 0,
    amountReturned: disbursement.amountReturned || 0,
    amountExpended: disbursement.amountExpended || 0,
  })

  useEffect(() => {
    if (disbursement) {
      setFormData({
        fundName: disbursement.fundName || MOCK_REVOLVING_FUNDS[0],
        receivedBy: disbursement.receivedBy || MOCK_PAYEES[0],
        voucherNo: disbursement.voucherNo || '',
        department: disbursement.department || '',
        particulars: disbursement.particulars || '',
        amountIssued: disbursement.amountIssued || 0,
        amountReturned: disbursement.amountReturned || 0,
        amountExpended: disbursement.amountExpended || 0,
      })
    }
  }, [disbursement])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const issued = parseFloat(formData.amountIssued) || 0
    const expended = parseFloat(formData.amountExpended) || 0
    const returned = parseFloat(formData.amountReturned) || 0
    const remaining = issued - (expended + returned)

    onSave({
      ...disbursement,
      ...formData,
      amountIssued: issued,
      amountExpended: expended,
      amountReturned: returned,
      outstandingAmount: remaining < 0 ? 0 : remaining,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Cash Disbursement"
      subtitle="Update disbursement details and adjustment amounts."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Revolving Fund & Received By */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Revolving Fund</label>
            <select
              name="fundName"
              value={formData.fundName}
              onChange={handleChange}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            >
              {MOCK_REVOLVING_FUNDS.map((fund) => (
                <option key={fund} value={fund}>
                  {fund}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Received By</label>
            <select
              name="receivedBy"
              value={formData.receivedBy}
              onChange={handleChange}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            >
              {MOCK_PAYEES.map((payee) => (
                <option key={payee} value={payee}>
                  {payee}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cash Voucher & Department */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cash Voucher</label>
            <input
              type="text"
              name="voucherNo"
              required
              value={formData.voucherNo}
              onChange={handleChange}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              required
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Purpose / Particulars */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Purpose</label>
          <textarea
            name="particulars"
            rows={2}
            required
            value={formData.particulars}
            onChange={handleChange}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Amounts Row */}
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount Issued</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                name="amountIssued"
                required
                value={formData.amountIssued}
                onChange={handleChange}
                className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount Return</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                name="amountReturned"
                value={formData.amountReturned}
                onChange={handleChange}
                className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Amount Expended
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                name="amountExpended"
                value={formData.amountExpended}
                onChange={handleChange}
                className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
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
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}
