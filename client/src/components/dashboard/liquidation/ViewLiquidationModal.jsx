import { Modal } from '../../ui/Modal'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  VERIFIED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INCOMPLETE: 'bg-orange-50 text-orange-700 border-orange-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function ViewLiquidationModal({
  isOpen,
  onClose,
  liquidation,
  activity = [],
  getEmployeeName,
  getModeName,
}) {
  if (!liquidation) return null
  const status = String(liquidation.status || '').toUpperCase()
  const latestNote = [...activity].reverse().find((a) => a.action === 'REJECTED')
  const latestReceipt = [...activity].reverse().find((a) => a.receipt)?.receipt

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Liquidation Details"
      subtitle={liquidation.reference_id}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
        >
          {status}
        </span>

        {latestNote && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
            <div className="font-bold mb-0.5">Remarks</div>
            {latestNote.remarks}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Requester</div>
            <div className="font-semibold">
              {getEmployeeName
                ? getEmployeeName(liquidation.employee_id)
                : `#${liquidation.employee_id}`}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">Purpose</div>
            <div className="font-semibold">{liquidation.description}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">
              Cash Received
            </div>
            <div className="font-semibold">{formatCurrency(liquidation.amount_obtained)}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-0.5">
              Total Liquidated
            </div>
            <div className="font-bold">{formatCurrency(liquidation.amount_expended)}</div>
          </div>
        </div>

        {latestReceipt && (
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Receipt</div>
            <img
              src={latestReceipt}
              alt="Receipt"
              className="max-h-56 rounded-lg border border-slate-200"
            />
          </div>
        )}

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-1.5">Date</th>
                <th className="text-left p-1.5">Store</th>
                <th className="text-left p-1.5">Mode</th>
                <th className="text-right p-1.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(liquidation.items || []).map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="p-1.5">{it.date?.slice(0, 10)}</td>
                  <td className="p-1.5">{it.store_name}</td>
                  <td className="p-1.5">
                    {getModeName ? getModeName(it.mode_of_transportation_id) : '—'}
                  </td>
                  <td className="p-1.5 text-right font-semibold">{formatCurrency(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
