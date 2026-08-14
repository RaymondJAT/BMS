import React from 'react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0)

export default function ViewRevolvingFundModal({ fund, isOpen, onClose, getFundLabel }) {
  if (!fund) return null

  const fundName = getFundLabel
    ? getFundLabel(fund)
    : fund.name || fund.fund_name || `Fund #${fund.id ?? fund.revolving_fund_id ?? 'N/A'}`
  const fundId = fund.id || fund.revolving_fund_id || fund.fund_id || 'N/A'
  const totalCap = (fund.baseCap || 0) + (fund.replenished || 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revolving Fund Details" maxWidth="max-w-md">
      <div className="space-y-3.5 sm:space-y-4">
        {/* FUND HEADER INFO */}
        <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{fundName}</h3>
            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 block">
              ID: {fundId}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            {fund.status || 'ACTIVE'}
          </span>
        </div>

        {/* METRIC CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
              Total Capacity
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalCap)}
            </p>
          </div>
          <div className="bg-amber-50/50 p-2.5 sm:p-3 rounded-xl border border-amber-200/60">
            <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium block">
              Unliquidated
            </span>
            <p className="text-xs sm:text-sm font-bold text-amber-900 mt-0.5">
              {formatCurrency(fund.unliquidated)}
            </p>
          </div>
          <div className="bg-emerald-50/50 p-2.5 sm:p-3 rounded-xl border border-emerald-200/60">
            <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium block">
              Available Cash
            </span>
            <p className="text-xs sm:text-sm font-bold text-emerald-900 mt-0.5">
              {formatCurrency(fund.balance)}
            </p>
          </div>
        </div>

        {/* LEDGER SUMMARY DETAILS */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3 sm:px-3.5 py-2 border-b border-slate-200/80 text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
            Ledger Summary
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between items-center px-3 sm:px-3.5 py-2 text-slate-700">
              <span>Beginning Base Cap</span>
              <span className="font-semibold text-slate-900">{formatCurrency(fund.baseCap)}</span>
            </div>
            <div className="flex justify-between items-center px-3 sm:px-3.5 py-2 text-slate-700">
              <span>Replenishments</span>
              <span className="font-semibold text-emerald-600">
                +{formatCurrency(fund.replenished)}
              </span>
            </div>
            <div className="flex justify-between items-center px-3 sm:px-3.5 py-2 text-slate-700">
              <span>Total Disbursements</span>
              <span className="font-semibold text-slate-900">{formatCurrency(fund.issued)}</span>
            </div>
            <div className="flex justify-between items-center px-3 sm:px-3.5 py-2 text-slate-700">
              <span>Liquidated Expenses</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(fund.liquidated)}
              </span>
            </div>
            <div className="flex justify-between items-center px-3 sm:px-3.5 py-2 text-slate-700">
              <span>Returned Cash</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(fund.returned)}
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER ACTION */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
