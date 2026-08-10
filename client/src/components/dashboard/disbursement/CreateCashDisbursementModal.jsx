import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

/**
 * Creates a disbursement via the real issueCashDisbursement action.
 * Differences from the old mock version:
 * - "Amount Returned" removed — issueCashDisbursement has no such field;
 *   a fresh issue is never pre-returned.
 * - Revolving Fund / Employee / Department / Particulars are now real
 *   selects sourced from the lookups hook, not mock arrays.
 * - Department is derived from the selected employee when the employee
 *   record includes a department_id, but stays independently selectable
 *   in case that's not the case (see the ASSUMPTION note in
 *   masterEmployeeApi.js — confirm the actual field name once known).
 */
export default function CreateCashDisbursementModal({
  isOpen,
  onClose,
  onIssue,
  isSubmitting,
  revolvingFunds,
  employees,
  departments,
  particulars,
  getFundLabel,
}) {
  const [formData, setFormData] = useState({
    revolving_fund_id: '',
    received_by: '',
    department_id: '',
    particulars: '',
    cash_voucher: '',
    amount_issued: '',
  })
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        revolving_fund_id: '',
        received_by: '',
        department_id: '',
        particulars: '',
        cash_voucher: '',
        amount_issued: '',
      })
      setFormError(null)
    }
  }, [isOpen])

  // Derive the active selected fund object and format its balance
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
      // Auto-fill department if the employee record carries one; otherwise
      // leave whatever the person already picked.
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
      !formData.particulars ||
      !formData.cash_voucher
    ) {
      setFormError('Please fill out all required fields.')
      return
    }

    const result = await onIssue({
      revolving_fund_id: formData.revolving_fund_id,
      received_by: formData.received_by,
      department_id: formData.department_id,
      particulars: formData.particulars,
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
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Revolving Fund <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.revolving_fund_id}
              onChange={(e) => setFormData({ ...formData, revolving_fund_id: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            >
              <option value="">Select Revolving Fund...</option>
              {revolvingFunds.map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {getFundLabel(fund.id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fund Balance
            </label>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              placeholder="₱ 0.00"
              value={selectedFundBalance}
              className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-not-allowed select-none focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Received By <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.received_by}
              onChange={handleEmployeeChange}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
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

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Particulars <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.particulars}
            onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
          >
            <option value="">Select Particulars...</option>
            {particulars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.description || `Particulars #${p.id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Voucher No. <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CV-10025"
              value={formData.cash_voucher}
              onChange={(e) => setFormData({ ...formData, cash_voucher: e.target.value })}
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
                value={formData.amount_issued}
                onChange={(e) => setFormData({ ...formData, amount_issued: e.target.value })}
                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

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
