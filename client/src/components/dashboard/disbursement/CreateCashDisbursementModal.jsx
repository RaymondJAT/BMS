import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'

const ELIGIBLE_LIQUIDATION_STATUSES = ['OPEN', 'ON REVIEW']

export default function CreateCashDisbursementModal({
  isOpen,
  onClose,
  onIssue,
  isSubmitting,
  revolvingFunds = [],
  employees = [],
  departments = [],
  getFundLabel,
}) {
  const [formData, setFormData] = useState({
    revolving_fund_id: '',
    received_by: '',
    department_id: '',
    purpose: '',
    cash_voucher: '',
    amount_issued: '',
  })
  const [formError, setFormError] = useState(null)

  // Filter funds to only include active/eligible statuses
  const eligibleFunds = useMemo(
    () =>
      revolvingFunds.filter((fund) =>
        ELIGIBLE_LIQUIDATION_STATUSES.includes(String(fund.status || '').toUpperCase()),
      ),
    [revolvingFunds],
  )

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        revolving_fund_id: '',
        received_by: '',
        department_id: '',
        purpose: '',
        cash_voucher: '',
        amount_issued: '',
      })
      setFormError(null)
    }
  }, [isOpen])

  const handleAmountKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
    }
  }

  // Derive active selected fund object and format its balance
  const selectedFund = revolvingFunds.find(
    (fund) => String(fund.id) === String(formData.revolving_fund_id),
  )

  const selectedFundBalance = selectedFund
    ? `₱ ${parseFloat(selectedFund.balance || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : ''

  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value
    const employee = employees.find((emp) => String(emp.id) === String(employeeId))
    setFormData((prev) => ({
      ...prev,
      received_by: employeeId,
      department_id: employee?.department_id ?? prev.department_id,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    const amount = parseFloat(formData.amount_issued)
    if (isNaN(amount) || amount <= 0) {
      setFormError('Amount issued must be greater than zero.')
      return
    }
    if (
      !formData.revolving_fund_id ||
      !formData.received_by ||
      !formData.department_id ||
      !formData.purpose ||
      !formData.cash_voucher
    ) {
      setFormError('Please fill out all required fields.')
      return
    }

    const result = await onIssue({
      revolving_fund_id: formData.revolving_fund_id,
      received_by: formData.received_by,
      department_id: formData.department_id,
      purpose: formData.purpose,
      cash_voucher: formData.cash_voucher,
      amount_issued: amount,
    })

    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to issue cash disbursement.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue Cash Disbursement"
      subtitle="Issue a new cash disbursement voucher to an authorized payee."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}

        {/* REVOLVING FUND, BALANCE, & VOUCHER NO. */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
          <div className="sm:col-span-6">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Revolving Fund <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.revolving_fund_id}
              onChange={(e) => setFormData({ ...formData, revolving_fund_id: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Revolving Fund...</option>
              {eligibleFunds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {getFundLabel ? getFundLabel(fund.id) : fund.name || `Fund #${fund.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Balance
            </label>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              placeholder="₱ 0.00"
              value={selectedFundBalance}
              className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-not-allowed select-none focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Voucher No. <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="CV-10025"
              value={formData.cash_voucher}
              onChange={(e) => setFormData({ ...formData, cash_voucher: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* RECEIVED BY & DEPARTMENT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Received By <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.received_by}
              onChange={handleEmployeeChange}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullname || emp.name || emp.full_name || `Employee #${emp.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Department...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PURPOSE & AMOUNT ISSUED */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
          <div className="sm:col-span-8">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Purpose <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Office Supplies"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="sm:col-span-4">
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
                value={formData.amount_issued}
                onKeyDown={handleAmountKeyDown}
                onChange={(e) => setFormData({ ...formData, amount_issued: e.target.value })}
                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
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
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Issuing...' : 'Issue Disbursement'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
