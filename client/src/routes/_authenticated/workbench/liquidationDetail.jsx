import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { Image } from 'antd'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { liquidationApi } from '../../../api/liquidationApi'
import { useLiquidationMasterData } from '../../../hooks/useLiquidationMasterData'
import { useCashDisbursementLookups } from '../../../hooks/useCashDisbursementLookups'

export const Route = createFileRoute('/_authenticated/workbench/liquidationDetail')({
  // Plain (non-dynamic) route — the liquidation id travels as a search
  // param (?id=123) instead of a $id path segment. validateSearch keeps
  // it typed and gives a clear error if the id is missing/malformed
  // rather than silently rendering with undefined.
  validateSearch: (search) => {
    const id = search.id
    if (id === undefined || id === null || id === '') {
      throw new Error('LiquidationDetailPage requires a ?id= search param')
    }
    return { id: String(id) }
  },
  component: LiquidationDetailPage,
})

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatDate = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  VERIFIED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INCOMPLETE: 'bg-orange-50 text-orange-700 border-orange-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

function LiquidationDetailPage() {
  const { id } = Route.useSearch()
  const navigate = useNavigate()

  const [liquidation, setLiquidation] = useState(null)
  const [activity, setActivity] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const { getModeName } = useLiquidationMasterData()
  const { getEmployeeName, getParticularsName } = useCashDisbursementLookups()

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    Promise.all([liquidationApi.getById(id), liquidationApi.getActivity({ liquidation_id: id })])
      .then(([detail, acts]) => {
        if (cancelled) return
        setLiquidation(detail)
        setActivity(acts || [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Failed to load liquidation.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const rejectionNotes = useMemo(() => activity.filter((a) => a.action === 'REJECTED'), [activity])

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
      </div>
    )
  }

  if (error || !liquidation) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-rose-600 font-medium">{error || 'Liquidation not found.'}</p>
        <button
          type="button"
          onClick={() => navigate({ to: '/workbench/liquidation' })}
          className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg"
        >
          Back to Liquidations
        </button>
      </div>
    )
  }

  const status = String(liquidation.status || '').toUpperCase()
  const items = liquidation.items || []
  const difference = parseFloat(liquidation.reimburse_return || 0)
  const summaryLabel =
    difference > 0 ? 'Cash to Return' : difference < 0 ? 'Reimbursement' : 'Fully Liquidated'

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100 py-8 print:bg-white print:py-0">
      {/* Toolbar — hidden when printing */}
      <div className="max-w-212.5 mx-auto mb-4 flex items-center justify-between px-2 print:hidden">
        <button
          type="button"
          onClick={() => navigate({ to: '/workbench/liquidation' })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>

      {/* "Paper" */}
      <div className="max-w-212.5 mx-auto bg-white shadow-lg border border-slate-200 rounded-sm p-10 print:shadow-none print:border-none">
        <div className="flex items-start justify-between border-b border-slate-300 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Liquidation Report
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{liquidation.reference_id}</p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
              STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            {status}
          </span>
        </div>

        {rejectionNotes.length > 0 && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
            <div className="font-bold mb-1">Latest Remarks</div>
            {rejectionNotes[rejectionNotes.length - 1].remarks}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-6">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Requester
            </div>
            <div className="font-semibold text-slate-800">
              {getEmployeeName
                ? getEmployeeName(liquidation.employee_id)
                : `#${liquidation.employee_id}`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cash Request
            </div>
            <div className="font-semibold text-slate-800">
              {liquidation.cash_request_reference_id} — {liquidation.project}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Purpose
            </div>
            <div className="font-semibold text-slate-800">{liquidation.description}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Date Filed
            </div>
            <div className="font-semibold text-slate-800">{formatDate(liquidation.createdAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cash Received
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(liquidation.amount_obtained)}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Liquidated
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(liquidation.amount_expended)}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {summaryLabel}
            </div>
            <div
              className={`text-lg font-bold mt-0.5 ${
                difference < 0
                  ? 'text-orange-600'
                  : difference > 0
                    ? 'text-blue-600'
                    : 'text-emerald-600'
              }`}
            >
              {formatCurrency(Math.abs(difference))}
            </div>
          </div>
        </div>

        {/* Expense lines */}
        <div className="mb-6">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Expense Lines
          </div>
          <Image.PreviewGroup>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left p-2 font-bold uppercase text-[10px]">Date</th>
                    <th className="text-left p-2 font-bold uppercase text-[10px]">Type</th>
                    <th className="text-left p-2 font-bold uppercase text-[10px]">Particulars</th>
                    <th className="text-left p-2 font-bold uppercase text-[10px]">Purpose</th>
                    <th className="text-left p-2 font-bold uppercase text-[10px]">Details</th>
                    <th className="text-right p-2 font-bold uppercase text-[10px]">Amount</th>
                    <th className="text-left p-2 font-bold uppercase text-[10px]">Receipts</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const isTravel = it.type !== 'MISCELLANEOUS'
                    return (
                      <tr key={it.id} className="border-t border-slate-100 align-top">
                        <td className="p-2 whitespace-nowrap">{it.date?.slice(0, 10)}</td>
                        <td className="p-2">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isTravel ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isTravel ? 'Travel' : 'Misc'}
                          </span>
                        </td>
                        <td className="p-2">
                          {getParticularsName ? getParticularsName(it.particulars) : it.particulars}
                        </td>
                        <td className="p-2">{it.purpose}</td>
                        <td className="p-2 text-slate-600">
                          {isTravel ? (
                            <>
                              RT# {it.rt} · {it.store_name} · {it.from} → {it.to} ·{' '}
                              {getModeName ? getModeName(it.mode_of_transportation_id) : '—'}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2 text-right font-semibold whitespace-nowrap">
                          {formatCurrency(it.amount)}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(it.receipts || []).map((src, ri) => (
                              <Image
                                key={ri}
                                src={src}
                                width={40}
                                height={40}
                                style={{ objectFit: 'cover', borderRadius: 4 }}
                              />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Image.PreviewGroup>
        </div>

        {/* Activity log */}
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Activity Log
          </div>
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-700">{a.action}</span>
                  <span className="text-slate-400"> · {formatDate(a.createdAt)}</span>
                  <p className="text-slate-600 mt-0.5">{a.remarks}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
