import { useState, useMemo, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

const MOCK_REVOLVING_FUNDS = [
  { id: 'RF-101', name: 'Petty Cash - Main Operations', remainingBalance: 25000.0 },
  { id: 'RF-102', name: 'Field Operations Travel Fund', remainingBalance: 12500.5 },
  { id: 'RF-103', name: 'Emergency Contingency Fund', remainingBalance: 50000.0 },
]

const MOCK_PAYEES = [
  { id: 'P-01', name: 'Jane Doe', department: 'Logistics' },
  { id: 'P-02', name: 'Mark Smith', department: 'Human Resources' },
  { id: 'P-03', name: 'Alex Johnson', department: 'Information Technology' },
  { id: 'P-04', name: 'Sarah Williams', department: 'Finance & Accounting' },
]

export default function CreateCashDisbursementModal({ isOpen, onClose, onCreate }) {
  const [selectedFundId, setSelectedFundId] = useState(MOCK_REVOLVING_FUNDS[0].id)
  const [selectedPayeeName, setSelectedPayeeName] = useState(MOCK_PAYEES[0].name)
  const [department, setDepartment] = useState(MOCK_PAYEES[0].department)
  const [voucherNo, setVoucherNo] = useState('')
  const [particulars, setParticulars] = useState('')
  const [amountIssued, setAmountIssued] = useState('')
  const [amountReturned, setAmountReturned] = useState('0.00')

  // Resolve fund details based on current selected ID
  const selectedFund = useMemo(() => {
    return MOCK_REVOLVING_FUNDS.find((f) => f.id === selectedFundId) || MOCK_REVOLVING_FUNDS[0]
  }, [selectedFundId])

  // Sync department automatically when Received By changes
  const handlePayeeChange = (e) => {
    const newPayee = e.target.value
    setSelectedPayeeName(newPayee)
    const payeeObj = MOCK_PAYEES.find((p) => p.name === newPayee)
    if (payeeObj) {
      setDepartment(payeeObj.department)
    }
  }

  // Calculate live dynamic outstanding balance
  const dynamicOutstanding = useMemo(() => {
    const issued = parseFloat(amountIssued) || 0
    const returned = parseFloat(amountReturned) || 0
    const remaining = issued - returned
    return remaining < 0 ? 0 : remaining
  }, [amountIssued, amountReturned])

  // Reset internal state whenever modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFundId(MOCK_REVOLVING_FUNDS[0].id)
      setSelectedPayeeName(MOCK_PAYEES[0].name)
      setDepartment(MOCK_PAYEES[0].department)
      setVoucherNo('')
      setParticulars('')
      setAmountIssued('')
      setAmountReturned('0.00')
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    const issued = parseFloat(amountIssued) || 0
    const returned = parseFloat(amountReturned) || 0

    const newDisbursement = {
      id: `CD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      voucherNo,
      fundId: selectedFund.id,
      fundName: selectedFund.name,
      dateIssued: new Date().toISOString().split('T')[0],
      dateLiquidated: null,
      receivedBy: selectedPayeeName,
      department,
      particulars,
      amountIssued: issued,
      amountExpended: 0.0,
      amountReturned: returned,
      outstandingAmount: dynamicOutstanding,
      status: 'Issued',
    }

    onCreate(newDisbursement)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Cash Disbursement"
      subtitle="Issue a new cash disbursement voucher to an authorized payee."
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Row 1: Fund & Available Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Revolving Fund <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedFundId}
              onChange={(e) => setSelectedFundId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            >
              {MOCK_REVOLVING_FUNDS.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  [{fund.id}] {fund.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fund Balance
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="text"
                readOnly
                disabled
                value={selectedFund.remainingBalance.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Received By & Department */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Received By <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPayeeName}
              onChange={handlePayeeChange}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            >
              {MOCK_PAYEES.map((payee) => (
                <option key={payee.id} value={payee.name}>
                  {payee.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Logistics"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Row 3: Voucher No & Amount Issued side-by-side to save vertical height */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Voucher No. <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CV-10025"
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Amount Issued <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountIssued}
                onChange={(e) => setAmountIssued(e.target.value)}
                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Amount Returned
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.00"
                placeholder="0.00"
                value={amountReturned}
                onChange={(e) => setAmountReturned(e.target.value)}
                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        {/* Row 4: Purpose / Particulars */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Purpose / Particulars <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            required
            placeholder="Describe the reason for this cash disbursement..."
            value={particulars}
            onChange={(e) => setParticulars(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all resize-none placeholder:text-slate-400"
          />
        </div>

        {/* Dynamic Outstanding Summary Bar */}
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Initial Outstanding Balance:
          </span>
          <span className="text-xs font-extrabold text-[#E31837]">
            ₱
            {dynamicOutstanding.toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
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
            Create Disbursement
          </button>
        </div>
      </form>
    </Modal>
  )
}
