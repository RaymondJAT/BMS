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

  useEffect(() => {
    if (isOpen) {
      setReportedDate(getLocalTodayDate())
      setActualCountInput('')
    }
  }, [isOpen, fund])

  const handleAmountKeyDown = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault()
    }
  }

  const fundId = fund?.id || fund?.revolving_fund_id || fund?.fund_id || 'N/A'

  const fundName = useMemo(() => {
    if (!fund) return 'Unnamed Fund'
    if (getFundLabel) return getFundLabel(fund)
    return fund.name || fund.fund_name || `Fund #${fundId}`
  }, [fund, getFundLabel, fundId])

  const beginningAmount = parseFloat(fund?.beginning ?? fund?.baseCap ?? fund?.base_cap ?? 0)
  const addedAmount = parseFloat(fund?.replenished ?? fund?.added ?? 0)
  const returnedAmount = parseFloat(
    fund?.returned ?? fund?.cashReturned ?? fund?.cash_returned ?? 0,
  )
  const expendedAmount = parseFloat(fund?.expended ?? fund?.liquidated ?? fund?.issued ?? 0)

  const expectedEndingBalance = useMemo(() => {
    if (!fund) return 0
    const rawBalance = fund.balance ?? fund.endingBalance ?? fund.ending_balance
    return rawBalance !== undefined && rawBalance !== null
      ? parseFloat(rawBalance)
      : beginningAmount + addedAmount + returnedAmount - expendedAmount
  }, [fund, beginningAmount, addedAmount, returnedAmount, expendedAmount])

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
  const cashInputLabel = isGcashFund ? 'Actual GCash Count' : 'Actual Cash Count'

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Submit & Finalize Fund Cycle"
      maxWidth="max-w-md"
    >
      <div className="space-y-3.5">
        <p className="text-xs text-slate-600 leading-relaxed">
          Reconcile and finalize report for <strong className="text-slate-900">{fundName}</strong>{' '}
          (ID: {fundId}).
        </p>

        {/* FINANCIAL BREAKDOWN GRID */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <h4 className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Fund Summary Breakdown
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs pt-0.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>Beginning:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(beginningAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Added:</span>
              <span className="font-semibold text-emerald-600">+{formatCurrency(addedAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Returned:</span>
              <span className="font-semibold text-blue-600">+{formatCurrency(returnedAmount)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600">
              <span>Expended:</span>
              <span className="font-semibold text-red-600">-{formatCurrency(expendedAmount)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center font-bold text-xs text-slate-900">
            <span>Calculated Ending Balance:</span>
            <span className="text-xs sm:text-sm text-slate-900 font-extrabold">
              {formatCurrency(expectedEndingBalance)}
            </span>
          </div>
        </div>

        {/* INPUTS */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Actual Count Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700 truncate">
                  {cashInputLabel} <span className="text-red-500">*</span>
                </label>
                {varianceStatus === 'BALANCED' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Balanced
                  </span>
                )}
                {varianceStatus === 'SHORT' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700">
                    <TrendingDown className="w-3 h-3" /> Short
                  </span>
                )}
                {varianceStatus === 'OVER' && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                    <TrendingUp className="w-3 h-3" /> Over
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={actualCountInput}
                  onKeyDown={handleAmountKeyDown}
                  onChange={(e) => setActualCountInput(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Official Closure Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 truncate">
                Closure Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={reportedDate}
                onChange={(e) => setReportedDate(e.target.value)}
                className="w-full px-2.5 sm:px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              />
            </div>
          </div>

          {/* Variance Warning Notice */}
          {varianceStatus === 'SHORT' && (
            <div className="flex items-start gap-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600 mt-0.5" />
              <span>
                Count is <strong>{formatCurrency(Math.abs(variance))}</strong> short. Verify
                unrecorded expenses or log a shortage note.
              </span>
            </div>
          )}

          {varianceStatus === 'OVER' && (
            <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Count is <strong>{formatCurrency(variance)}</strong> over expected balance. Verify
                missing logs.
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={isSubmitDisabled}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Final Report
          </button>
        </div>
      </div>
    </Modal>
  )
}
