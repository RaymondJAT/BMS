import React from 'react'
import { Loader2, ArrowUpRight, Lock, PlusCircle, Wallet } from 'lucide-react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  `₱${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

  const handleAmountKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-3.5 sm:space-y-4">
        <div className="space-y-3 sm:space-y-3.5">
          {/* DEPARTMENT & FUND TYPE GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
            {/* Department */}
            <div className="sm:col-span-2">
              <label className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
                <span>Department</span>
                {isTopUp && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-normal shrink-0">
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
                  className="w-full px-2.5 sm:px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-500 cursor-not-allowed select-none truncate"
                />
              ) : departments.length > 0 ? (
                <select
                  required
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none cursor-pointer"
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
                  className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
                />
              )}
            </div>

            {/* Fund Type */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
                Fund Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none cursor-pointer"
              >
                <option value="CASH">CASH</option>
                <option value="GCASH">GCASH</option>
              </select>
            </div>
          </div>

          {/* FINANCIAL DETAILS & DATE GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {isTopUp ? (
              <>
                {/* Current Balance */}
                <div>
                  <label className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
                    <span>Current Balance</span>
                    <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={formatCurrency(currentBalance)}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-500 cursor-not-allowed select-none truncate"
                  />
                </div>

                {/* Add Amount */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
                    Add Amount (PHP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onKeyDown={handleAmountKeyDown}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Effective Date */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Allocation Amount */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
                    Allocation Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={formData.amount}
                    onKeyDown={handleAmountKeyDown}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* Effective Date */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* TOP-UP SUMMARY CARD */}
        {isTopUp && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
              <span className="text-xs sm:text-sm font-extrabold">
                {formatCurrency(previewNewBalance)}
              </span>
            </div>
          </div>
        )}

        {/* ACTION CONTROLS */}
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
            disabled={isSubmitting || (isTopUp && addDelta <= 0)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isTopUp ? 'Save Top-Up' : 'Create Allocation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
