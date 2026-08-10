import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

/**
 * Metadata-only edit — the backend's upsertCashDisbursement explicitly
 * rejects amount/status fields (use the Return/Expend action instead, via
 * the "Record Return / Expended" button). Amount fields from the original
 * mock version are intentionally removed here, not just hidden.
 */
export default function EditCashDisbursementModal({
  isOpen,
  onClose,
  disbursement,
  onSave,
  isSubmitting,
  employees,
  departments,
  particulars,
}) {
  const [formData, setFormData] = useState({
    received_by: '',
    department_id: '',
    particulars: '',
    cash_voucher: '',
  })
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (disbursement) {
      setFormData({
        received_by: disbursement.received_by ?? '',
        department_id: disbursement.department_id ?? '',
        particulars: disbursement.particulars ?? '',
        cash_voucher: disbursement.cash_voucher || '',
      })
      setFormError(null)
    }
  }, [disbursement])

  if (!disbursement) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (
      !formData.received_by ||
      !formData.department_id ||
      !formData.particulars ||
      !formData.cash_voucher
    ) {
      setFormError('Please fill out all fields.')
      return
    }

    const result = await onSave({
      id: disbursement.id,
      received_by: formData.received_by,
      department_id: formData.department_id,
      particulars: formData.particulars,
      cash_voucher: formData.cash_voucher,
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
      subtitle="Update payee, department, particulars, or voucher number."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Received By</label>
            <select
              value={formData.received_by}
              onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
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
          <label className="block text-xs font-bold text-slate-700 mb-1">Particulars</label>
          <select
            value={formData.particulars}
            onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
          >
            <option value="">Select Particulars...</option>
            {particulars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.description || `Particulars #${p.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Cash Voucher</label>
          <input
            type="text"
            required
            value={formData.cash_voucher}
            onChange={(e) => setFormData({ ...formData, cash_voucher: e.target.value })}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
          />
        </div>

        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
          Amount fields can't be edited here — use the{' '}
          <span className="font-semibold text-slate-700">Record Return / Expended</span> action
          instead.
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
