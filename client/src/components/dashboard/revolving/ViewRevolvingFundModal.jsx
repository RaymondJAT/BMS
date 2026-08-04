import React from 'react'
import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0)

export default function ViewRevolvingFundModal({ fund, isOpen, onClose }) {
  if (!fund) return null

  const totalCap = (fund.baseCap || 0) + (fund.replenished || 0)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Revolving Fund Details">
      <div className="space-y-5">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{fund.name}</h3>
            <span className="text-[11px] font-mono text-slate-500">{fund.id}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {fund.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">Total Capacity</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(totalCap)}</p>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
            <span className="text-[11px] text-amber-700 font-medium">Unliquidated</span>
            <p className="text-sm font-bold text-amber-900 mt-0.5">
              {formatCurrency(fund.unliquidated)}
            </p>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
            <span className="text-[11px] text-emerald-700 font-medium">Available Cash</span>
            <p className="text-sm font-bold text-emerald-900 mt-0.5">
              {formatCurrency(fund.balance)}
            </p>
          </div>
        </div>

        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">
            Ledger Summary
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="flex justify-between px-3.5 py-2 text-slate-700">
              <span>Beginning Base Cap</span>
              <span className="font-semibold">{formatCurrency(fund.baseCap)}</span>
            </div>
            <div className="flex justify-between px-3.5 py-2 text-slate-700">
              <span>Replenishments</span>
              <span className="font-semibold text-emerald-600">
                +{formatCurrency(fund.replenished)}
              </span>
            </div>
            <div className="flex justify-between px-3.5 py-2 text-slate-700">
              <span>Total Disbursements</span>
              <span className="font-semibold">{formatCurrency(fund.issued)}</span>
            </div>
            <div className="flex justify-between px-3.5 py-2 text-slate-700">
              <span>Liquidated Expenses</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(fund.liquidated)}
              </span>
            </div>
            <div className="flex justify-between px-3.5 py-2 text-slate-700">
              <span>Returned Cash</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(fund.returned)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
