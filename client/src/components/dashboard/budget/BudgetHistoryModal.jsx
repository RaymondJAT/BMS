import React from 'react'
import { Loader2, ArrowUpRight, History, Calendar, Tag } from 'lucide-react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  `₱${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
  const modalTitle = `Budget Ledger (${departmentName || 'Dept'} • ID: ${budgetId})`

  return (
    <Modal isOpen={!!budget} onClose={onClose} title={modalTitle} maxWidth="max-w-lg">
      <div className="flex flex-col space-y-3.5 sm:space-y-4 overflow-hidden">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs shrink-0">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Allocation
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-800">
              {formatCurrency(budget.amount)}
            </span>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Entries
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-700">
              {logs.length} {logs.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        {/* MAIN LEDGER CONTENT */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 sm:py-12 text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-[#E31837]" />
            <span className="text-xs font-semibold">Loading audit logs...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-medium">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 sm:py-10 space-y-1">
            <History className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
            <p className="text-xs text-slate-400 font-medium">
              No history records found for this allocation.
            </p>
          </div>
        ) : (
          /* Scrolling is locked strictly to this div */
          <div className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="relative border-l-2 border-slate-200/80 ml-2.5 sm:ml-3 my-1 space-y-4 sm:space-y-5">
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
                  <div key={log.id} className="relative pl-4 sm:pl-6 group">
                    {/* Timeline Bullet */}
                    <div className="absolute -left-1.75 sm:-left-2.25 top-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white border-2 border-[#E31837] flex items-center justify-center z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E31837]" />
                    </div>

                    <div className="bg-slate-50 hover:bg-slate-100/60 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl space-y-2 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shadow-2xs">
                          <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400" />
                          {log.type || 'CASH'}
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-600 inline-flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />+
                          {formatCurrency(amount)}
                        </span>
                      </div>

                      {log.remarks && (
                        <p className="text-xs text-slate-600 italic font-normal bg-white/50 p-2 rounded-lg border border-slate-100">
                          "{log.remarks}"
                        </p>
                      )}

                      <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> Transaction Date
                        </span>
                        <span className="font-semibold text-slate-700">{formattedDate}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FIXED MODAL FOOTER */}
        <div className="flex justify-end pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </Modal>
  )
}
