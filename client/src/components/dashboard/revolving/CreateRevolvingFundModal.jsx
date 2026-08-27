import React, { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'

export default function CreateRevolvingFundModal({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  budgets = [],
  revolvingFunds = [],
  isBudgetsLoading = false,
  getDepartmentName,
}) {
  const extractNumericValue = (val) => {
    if (val === null || val === undefined) return ''
    const cleaned = String(val).replace(/[^0-9.]/g, '')
    const num = parseFloat(cleaned)
    return !isNaN(num) && num > 0 ? num : ''
  }

  // Only exclude a budget when it has a fund that's still ACTIVE (not
  // CLOSED/CLEARED) — a budget whose only fund has been closed/cleared is
  // eligible for a fresh fund (the backend's own day-cycle rules in
  // upsertRevolvingFund enforce the finer-grained "not yet closed from
  // yesterday" / "same type already exists today" checks server-side).
  const availableBudgets = useMemo(() => {
    const blockedBudgetIds = new Set(
      revolvingFunds
        .filter((fund) => !['CLOSED', 'CLEARED'].includes(String(fund.status || '').toUpperCase()))
        .map((fund) => fund.budget_id || fund.budgetId || fund.source_budget_id)
        .filter(Boolean)
        .map(String),
    )

    return budgets.filter((b) => !blockedBudgetIds.has(String(b.id)))
  }, [budgets, revolvingFunds])

  const getBudgetLabel = (b) => {
    const dept = getDepartmentName ? getDepartmentName(b) : `Department #${b.department_id}`
    return b.type ? `${dept} — ${b.type}` : dept
  }

  const handleAmountKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
    }
  }

  const handleBudgetChange = (e) => {
    const selectedId = e.target.value
    const selectedBudget = availableBudgets.find((b) => String(b.id) === String(selectedId))

    if (selectedBudget) {
      // remaining_budget is the live "Total Budget minus everything
      // currently deployed" figure computed by getBudgetBudget — the
      // correct default cap for a new fund. The other keys are kept as a
      // defensive fallback only.
      const rawAmount =
        selectedBudget.remaining_budget ??
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
        name: getBudgetLabel(selectedBudget),
        baseCap: cleanCap !== '' ? String(cleanCap) : prev.baseCap || prev.base_cap || '',
        base_cap: cleanCap !== '' ? String(cleanCap) : prev.base_cap || prev.baseCap || '',
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
      ...(name === 'baseCap' || name === 'base_cap' ? { baseCap: value, base_cap: value } : {}),
      ...(name === 'budgetId' || name === 'budget_id' ? { budgetId: value, budget_id: value } : {}),
    }))
  }

  const currentBudgetId = formData.budgetId || formData.budget_id || ''
  const currentBaseCap = formData.baseCap || formData.base_cap || ''

  const numericBaseCap = Number(currentBaseCap)
  const isBaseCapInvalid =
    currentBaseCap !== '' &&
    currentBaseCap !== undefined &&
    (isNaN(numericBaseCap) || numericBaseCap <= 0)

  const isFormInvalid =
    isSubmitting ||
    !currentBudgetId ||
    !currentBaseCap ||
    isNaN(numericBaseCap) ||
    numericBaseCap <= 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Revolving Fund" maxWidth="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-3.5 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
              Source Budget Allocation <span className="text-red-500">*</span>
            </label>
            <select
              name="budgetId"
              value={currentBudgetId}
              onChange={handleBudgetChange}
              required
              disabled={isBudgetsLoading}
              className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none disabled:opacity-60 cursor-pointer"
            >
              <option value="">
                {isBudgetsLoading ? 'Loading budget allocations...' : '-- Select Source Budget --'}
              </option>
              {availableBudgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {getBudgetLabel(b)}
                </option>
              ))}
            </select>
            {!isBudgetsLoading && availableBudgets.length === 0 && (
              <p className="text-[11px] text-slate-400 mt-1">
                No budgets are currently eligible for a new fund.
              </p>
            )}
          </div>

          <div className="sm:col-span-1">
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
              Beginning Fund (PHP) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="baseCap"
              required
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={currentBaseCap}
              onKeyDown={handleAmountKeyDown}
              onChange={handleChange}
              className={`w-full px-2.5 sm:px-3 py-2 bg-slate-50 border rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                isBaseCapInvalid ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200'
              }`}
            />
            {isBaseCapInvalid && (
              <p className="text-[10px] sm:text-[11px] text-red-600 mt-1 font-medium">
                Must be greater than 0.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isFormInvalid}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create Revolving Fund'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
