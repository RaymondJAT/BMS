import React from 'react'
import { Loader2, ArrowUpRight } from 'lucide-react'
import { Modal } from '../../ui/Modal'

/**
 * Modal showing the budget history ledger for a single budget allocation.
 */
export default function BudgetHistoryModal({
  budget,
  logs = [],
  isLoading,
  error,
  onClose,
  getDepartmentName,
}) {
  if (!budget) return null

  const departmentName = getDepartmentName ? getDepartmentName(budget) : ''
  const budgetId = budget.id?.toString().slice(0, 8)
  const modalTitle = `Budget Allocation Ledger (${departmentName} • ID: ${budgetId})`

  return (
    <Modal isOpen={!!budget} onClose={onClose} title={modalTitle} maxWidth="max-w-lg">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#E31837]" />
            <span className="text-xs font-semibold">Loading audit logs...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8 font-medium">
            No history records found for this allocation.
          </p>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
            {logs.map((log) => {
              const logDate = log.date || log.createdAt
              const formattedDate =
                logDate && !isNaN(new Date(logDate).getTime())
                  ? new Date(logDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'N/A'

              const amount = parseFloat(log.amount || 0)

              return (
                <div key={log.id} className="relative pl-6 group">
                  {/* Timeline Bullet */}
                  <div className="absolute -left-2.25 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-[#E31837] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E31837]" />
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {log.type || 'CASH'}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {log.remarks && (
                      <p className="text-xs text-slate-600 italic font-normal">"{log.remarks}"</p>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>Transaction Date</span>
                      <span className="font-semibold text-slate-600">{formattedDate}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </Modal>
  )
}
