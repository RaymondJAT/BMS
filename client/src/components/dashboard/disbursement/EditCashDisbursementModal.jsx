import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'

export default function EditCashDisbursementModal({
  isOpen,
  onClose,
  disbursement,
  onSave,
  isSubmitting,
  employees = [],
  departments = [],
  particulars = [],
}) {
  const [formData, setFormData] = useState({
    received_by: '',
    department_id: '',
    particulars: '',
    cash_voucher: '',
    amount_issued: '',
  })
  const [formError, setFormError] = useState(null)

  const originalAmount = disbursement
    ? parseFloat(disbursement.amount_issued ?? disbursement.amount ?? 0)
    : 0

  // Matches the backend's own lifecycle rule (editCashDisbursementAmount
  // rejects any edit once status === 'LIQUIDATED') and the table's
  // existing disabled-Edit-button rule in disbursementColumns.jsx — kept
  // here too as a second line of defense and so the amount field itself
  // can show *why* it's locked, in case this modal is ever reachable some
  // other way.
  const isAmountLocked = disbursement?.status === 'LIQUIDATED'

  useEffect(() => {
    if (disbursement) {
      setFormData({
        received_by: disbursement.received_by ?? '',
        department_id: disbursement.department_id ?? '',
        particulars: disbursement.particulars ?? '',
        cash_voucher: disbursement.cash_voucher || '',
        amount_issued: disbursement.amount_issued ?? disbursement.amount ?? '',
      })
      setFormError(null)
    }
  }, [disbursement])

  const { difference, hasChange } = useMemo(() => {
    const parsed = parseFloat(formData.amount_issued)
    if (isNaN(parsed)) return { difference: 0, hasChange: false }
    const diff = Math.round((parsed - originalAmount) * 100) / 100
    return { difference: diff, hasChange: diff !== 0 }
  }, [formData.amount_issued, originalAmount])

  if (!disbursement) return null

  const handleAmountKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
    }
  }

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

    if (isAmountLocked && hasChange) {
      setFormError('This disbursement is already liquidated — the amount can no longer be changed.')
      return
    }

    if (
      !formData.received_by ||
      !formData.department_id ||
      !formData.particulars ||
      !formData.cash_voucher
    ) {
      setFormError('Please fill out all required fields.')
      return
    }

    const result = await onSave({
      id: disbursement.id,
      received_by: formData.received_by,
      department_id: formData.department_id,
      particulars: formData.particulars,
      cash_voucher: formData.cash_voucher,
      amount_issued: amount,
      originalAmount,
    })

    if (result?.success) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to update disbursement.')
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Cash Disbursement"
      subtitle="Update payee, department, particulars, voucher number, or amount issued."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}

        {/* VOUCHER NO., RECEIVED BY & DEPARTMENT */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="sm:w-[22%] shrink-0">
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

          <div className="flex-1">
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

          <div className="flex-1">
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

        {/* PARTICULARS & AMOUNT ISSUED */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3">
          <div className="sm:col-span-8">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Particulars <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.particulars}
              onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Select Particulars...</option>
              {particulars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.description || `Particulars #${p.id}`}
                </option>
              ))}
            </select>
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
                disabled={isAmountLocked}
                placeholder="0.00"
                value={formData.amount_issued}
                onKeyDown={handleAmountKeyDown}
                onChange={(e) => setFormData({ ...formData, amount_issued: e.target.value })}
                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {isAmountLocked ? (
          <p className="text-[11px] text-slate-500 -mt-1">
            This disbursement is fully liquidated, so its amount can no longer be edited.
          </p>
        ) : (
          hasChange && (
            <div
              className={`text-[11px] font-medium -mt-1 ${
                difference > 0 ? 'text-amber-700' : 'text-blue-700'
              }`}
            >
              {difference > 0
                ? `+₱${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })} will be deducted from the linked revolving fund (and its budget, if connected).`
                : `₱${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2 })} will be released back to the linked revolving fund (and its budget, if connected).`}
            </div>
          )
        )}

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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
