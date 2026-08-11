import React, { useState, useMemo, useEffect } from 'react'
import { Modal } from '../../ui/Modal'
import { Send, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react'

const getLocalTodayDate = () => {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const localDate = new Date(d.getTime() - offset * 60 * 1000)
  return localDate.toISOString().split('T')[0]
}

export default function SubmitRevolvingFundModal({
  fund,
  isOpen,
  onClose,
  onSubmitReport,
  getFundLabel,
}) {
  const [reportedDate, setReportedDate] = useState(getLocalTodayDate)
  const [actualCountInput, setActualCountInput] = useState('')
  const [remarks, setRemarks] = useState('')

  // Reset state when modal opens or fund changes
  useEffect(() => {
    if (isOpen) {
      setReportedDate(getLocalTodayDate())
      setActualCountInput('')
      setRemarks('')
    }
  }, [isOpen, fund])

  const fundId = fund?.id || fund?.revolving_fund_id || fund?.fund_id || 'N/A'

  // Resolve display name the same way the table/View/Edit modals do —
  // fund rows carry no name of their own, so getFundLabel derives it
  // from the linked budget (department + fund type). Fall back only if
  // the caller didn't wire the labeler through.
  const fundName = useMemo(() => {
    if (!fund) return 'Unnamed Fund'
    if (getFundLabel) return getFundLabel(fund)
    return fund.name || fund.fund_name || `Fund #${fundId}`
  }, [fund, getFundLabel, fundId])

  // 1. Calculate Fund Financial Breakdown
  const beginningAmount = parseFloat(fund?.beginning ?? fund?.baseCap ?? fund?.base_cap ?? 0)
  const addedAmount = parseFloat(fund?.replenished ?? fund?.added ?? 0)
  const returnedAmount = parseFloat(
    fund?.returned ?? fund?.cashReturned ?? fund?.cash_returned ?? 0,
  )
  const expendedAmount = parseFloat(fund?.expended ?? fund?.liquidated ?? fund?.issued ?? 0)

  // Ending Amount = Beginning + Added + Returned - Expended (or fallback to balance)
  const expectedEndingBalance = useMemo(() => {
    if (!fund) return 0
    const rawBalance = fund.balance ?? fund.endingBalance ?? fund.ending_balance
    return rawBalance !== undefined && rawBalance !== null
      ? parseFloat(rawBalance)
      : beginningAmount + addedAmount + returnedAmount - expendedAmount
  }, [fund, beginningAmount, addedAmount, returnedAmount, expendedAmount])

  // 2. Reconciliation & Variance Calculations
  const actualCount = parseFloat(actualCountInput) || 0
  const variance = actualCount - expectedEndingBalance

  const varianceStatus = useMemo(() => {
    if (actualCountInput === '' || isNaN(parseFloat(actualCountInput))) return 'PENDING'
    if (Math.abs(variance) < 0.01) return 'BALANCED'
    return variance < 0 ? 'SHORT' : 'OVER'
  }, [actualCountInput, variance])

  if (!fund) return null

  const fundTypeStr = String(fund.type || fund.fund_type || '').toLowerCase()
  const isGcashFund = fundTypeStr.includes('gcash')
  const cashInputLabel = isGcashFund
    ? 'Actual GCash / Digital Wallet Count'
    : 'Actual Physical Cash Count'

  const handleConfirmSubmit = () => {
    const closurePayload = {
      cashonhand: isGcashFund ? 0 : actualCount,
      gcash: isGcashFund ? actualCount : 0,
      expectedEndingBalance,
      actualCount,
      variance,
      varianceStatus,
      reportedDate,
      end_date: reportedDate,
      remarks,
    }

    if (typeof onSubmitReport === 'function') {
      onSubmitReport(closurePayload, fundId)
    }

    onClose()
  }

  const formatCurrency = (val) =>
    `₱${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const isSubmitDisabled =
    actualCountInput === '' ||
    isNaN(parseFloat(actualCountInput)) ||
    parseFloat(actualCountInput) < 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit & Finalize Fund Cycle">
      <div className="space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Reconcile and finalize the report for{' '}
          <strong className="text-slate-900">{fundName}</strong> (ID: {fundId}).
        </p>

        {/* --- 1. FINANCIAL SUMMARY GRID --- */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Fund Summary Breakdown
          </h4>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-1">
            <div className="flex justify-between items-center text-slate-600">
              <span>Beginning Amount:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(beginningAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Added / Replenished:</span>
              <span className="font-semibold text-emerald-600">+{formatCurrency(addedAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Returned Amount:</span>
              <span className="font-semibold text-blue-600">+{formatCurrency(returnedAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Total Expended:</span>
              <span className="font-semibold text-red-600">-{formatCurrency(expendedAmount)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center font-bold text-xs text-slate-900">
            <span>Calculated Ending Balance:</span>
            <span className="text-sm text-slate-900 font-extrabold">
              {formatCurrency(expectedEndingBalance)}
            </span>
          </div>
        </div>

        {/* --- 2. CASH REPORT / RECONCILIATION INPUT --- */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {cashInputLabel}
            </label>
            {varianceStatus === 'BALANCED' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Balanced
              </span>
            )}
            {varianceStatus === 'SHORT' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                <TrendingDown className="w-3 h-3" /> Short ({formatCurrency(Math.abs(variance))})
              </span>
            )}
            {varianceStatus === 'OVER' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <TrendingUp className="w-3 h-3" /> Over (+{formatCurrency(variance)})
              </span>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
              ₱
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={actualCountInput}
              onChange={(e) => setActualCountInput(e.target.value)}
              className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          {/* Variance Warning Notice */}
          {varianceStatus === 'SHORT' && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>
                Actual count is <strong>{formatCurrency(Math.abs(variance))}</strong> less than
                expected. Please verify unrecorded expenses or log a shortage note.
              </span>
            </div>
          )}

          {varianceStatus === 'OVER' && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Actual count is <strong>{formatCurrency(variance)}</strong> over the expected
                balance. Please verify missing change or overage logs.
              </span>
            </div>
          )}
        </div>

        {/* --- 3. REPORT DATE SELECTION & REMARKS --- */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Official Report Date (Closure Date)
            </label>
            <input
              type="date"
              required
              value={reportedDate}
              onChange={(e) => setReportedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Closure Remarks (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add any closure or reconciliation notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={isSubmitDisabled}
            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Final Report
          </button>
        </div>
      </div>
    </Modal>
  )
}
