import React from 'react'
import { Loader2, ArrowUpRight, Lock, PlusCircle, Wallet } from 'lucide-react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  `₱${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Modal for creating a new budget allocation or topping up an existing one.
 *
 * Top-up mode mirrors EditRevolvingFundModal: department/type are locked
 * (they're identity, not editable on a top-up), the entered amount is a
 * DELTA added on top of the current live balance — never a replacement
 * value — and a preview card shows the resulting balance before submit.
 * This matches the backend (upsertBudgetBudget): when `id` is present,
 * `amount` is treated as addedAmount and summed onto the existing row.
 */
export default function BudgetFormModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isSubmitting,
  departments = [],
  selectedBudget,
  getDepartmentName,
}) {
  const isTopUp = Boolean(selectedBudget)
  const modalTitle = isTopUp ? 'Top-Up Budget' : 'New Budget Allocation'

  const currentBalance = parseFloat(selectedBudget?.amount || 0)
  const addDelta = parseFloat(formData.amount) || 0
  const previewNewBalance = currentBalance + addDelta

  const departmentLabel = isTopUp
    ? getDepartmentName
      ? getDepartmentName(selectedBudget)
      : `Department #${selectedBudget?.department_id ?? 'N/A'}`
    : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
            <span>Department</span>
            {isTopUp && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-normal">
                <Lock className="w-2.5 h-2.5" /> Read-only
              </span>
            )}
          </label>
          {isTopUp ? (
            <input
              type="text"
              readOnly
              disabled
              value={departmentLabel}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed select-none"
            />
          ) : departments.length > 0 ? (
            <select
              required
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
            >
              <option value="">Select Department...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              required
              placeholder="e.g., 1"
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
            />
          )}
          {!isTopUp && (
            <p className="text-[11px] text-slate-400 mt-1">
              Select the department for this budget allocation.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Fund Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
          >
            <option value="CASH">CASH</option>
            <option value="GCASH">GCASH</option>
            <option value="ETC">ETC</option>
          </select>
        </div>

        {isTopUp && (
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Current Balance</span>
              <Lock className="w-2.5 h-2.5 text-slate-400" />
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={formatCurrency(currentBalance)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed select-none"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {isTopUp ? 'Add to Budget Now (PHP)' : 'Allocation Amount'}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
          />
          {isTopUp && (
            <p className="text-[11px] text-slate-400 mt-1">
              This amount is added on top of the current balance — you don't need to re-enter the
              total.
            </p>
          )}
        </div>

        {isTopUp && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <h4 className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              Top-Up Preview
            </h4>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span>Current Balance:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(currentBalance)}
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
                New Balance:
              </span>
              <span className="text-sm font-extrabold">{formatCurrency(previewNewBalance)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Remarks / Justification
          </label>
          <textarea
            rows={2}
            placeholder="Optional remarks..."
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (isTopUp && addDelta <= 0)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isTopUp ? 'Save Top-Up' : 'Create Allocation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
