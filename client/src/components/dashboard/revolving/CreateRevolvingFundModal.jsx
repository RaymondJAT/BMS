import React from 'react'
import { Modal } from '../../ui/Modal'

export default function CreateRevolvingFundModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  budgets = [],
  isBudgetsLoading = false,
}) {
  // Helper to extract a clean positive float from input
  const extractNumericValue = (val) => {
    if (val === null || val === undefined) return ''
    const cleaned = String(val).replace(/[^0-9.]/g, '')
    const num = parseFloat(cleaned)
    return !isNaN(num) && num > 0 ? num : ''
  }

  const handleBudgetChange = (e) => {
    const selectedId = e.target.value
    const selectedBudget = budgets.find((b) => String(b.id) === String(selectedId))

    if (selectedBudget) {
      const rawAmount =
        selectedBudget.remaining_balance ??
        selectedBudget.balance ??
        selectedBudget.allocated_amount ??
        selectedBudget.amount ??
        selectedBudget.total_amount ??
        selectedBudget.budget_amount ??
        ''

      const cleanCap = extractNumericValue(rawAmount)

      setFormData((prev) => ({
        ...prev,
        budgetId: selectedId,
        budget_id: selectedId,
        name:
          selectedBudget.title ||
          selectedBudget.name ||
          selectedBudget.budget_name ||
          selectedBudget.fund_name ||
          '',
        baseCap: cleanCap !== '' ? String(cleanCap) : prev.baseCap || '',
        base_cap: cleanCap !== '' ? String(cleanCap) : prev.base_cap || '',
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        budgetId: '',
        budget_id: '',
        name: '',
        baseCap: '',
        base_cap: '',
      }))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Sync camelCase and snake_case properties
      ...(name === 'baseCap' ? { base_cap: value } : {}),
      ...(name === 'budgetId' ? { budget_id: value } : {}),
    }))
  }

  // Validation Flags
  const currentBudgetId = formData.budgetId || formData.budget_id || ''
  const currentBaseCap = formData.baseCap || formData.base_cap || ''
  const isBaseCapInvalid =
    currentBaseCap !== undefined &&
    currentBaseCap !== '' &&
    (isNaN(Number(currentBaseCap)) || Number(currentBaseCap) <= 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Revolving Fund">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Source Budget Allocation Select */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Source Budget Allocation <span className="text-red-500">*</span>
          </label>
          <select
            name="budgetId"
            value={currentBudgetId}
            onChange={handleBudgetChange}
            required
            disabled={isBudgetsLoading}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] disabled:opacity-60 cursor-pointer"
          >
            <option value="">
              {isBudgetsLoading ? 'Loading budget allocations...' : '-- Select Source Budget --'}
            </option>
            {budgets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title || b.name || b.budget_name || `Budget #${b.id}`}
              </option>
            ))}
          </select>
        </div>

        {/* Total Beginning Fund Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Total Beginning Fund (PHP) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="baseCap"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={currentBaseCap}
            onChange={handleChange}
            className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] ${
              isBaseCapInvalid ? 'border-red-500 bg-red-50' : 'border-slate-200'
            }`}
          />
          {isBaseCapInvalid && (
            <p className="text-[11px] text-red-600 mt-1 font-medium">
              Beginning fund amount must be greater than zero.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting || !currentBaseCap || Number(currentBaseCap) <= 0 || !currentBudgetId
            }
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#E31837] hover:bg-[#c4122e] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Revolving Fund'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
