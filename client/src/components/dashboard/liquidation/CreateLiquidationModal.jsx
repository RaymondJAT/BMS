import { useState, useEffect, useMemo } from 'react'
import { Modal } from '../../ui/Modal'
import { Plus, Trash2 } from 'lucide-react'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const emptyItem = () => ({
  date: new Date().toISOString().slice(0, 10),
  rt: '',
  store_name: '',
  particulars: '',
  from: '',
  to: '',
  mode_of_transportation_id: '',
  amount: '',
})

/**
 * Requester submits a Liquidation for a COMPLETED Cash Request, or
 * edits/resubmits one returned as REJECTED/INCOMPLETE (backend resets to
 * PENDING — see updateLiquidation). Every liquidation_item field is
 * required per the schema (li_rt, li_store_name, li_from, li_to,
 * li_mode_of_transportation_id, li_particulars, li_amount are all
 * NOT NULL) — no optional line fields exist in this schema.
 *
 * Receipt is ONE image per submission, attached to the activity log
 * entry (la_receipt) — liquidation_item has no receipt column at all, so
 * there is no per-line upload.
 */
export default function CreateLiquidationModal({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  isSubmitting,
  cashRequest, // { id, reference_id } — required for create mode
  cashReceived, // disbursement_amount snapshot for create mode
  editingLiquidation = null, // full liquidation + items, for edit mode
  districts = [],
  particulars = [],
  modes = [],
}) {
  const isEditMode = Boolean(editingLiquidation)

  const [description, setDescription] = useState('')
  const [receipt, setReceipt] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setDescription('')
      setReceipt('')
      setItems([emptyItem()])
      setFormError(null)
      return
    }
    if (editingLiquidation) {
      setDescription(editingLiquidation.description || '')
      setReceipt('')
      setItems(
        (editingLiquidation.items || []).map((it) => ({
          date: it.date?.slice(0, 10) || '',
          rt: it.rt || '',
          store_name: it.store_name || '',
          particulars: it.particulars || '',
          from: it.from || '',
          to: it.to || '',
          mode_of_transportation_id: it.mode_of_transportation_id || '',
          amount: it.amount ?? '',
        })) || [emptyItem()],
      )
    }
  }, [isOpen, editingLiquidation])

  const cashReceivedAmount =
    parseFloat(isEditMode ? editingLiquidation?.amount_obtained : cashReceived) || 0

  const totalExpended = useMemo(
    () => items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0),
    [items],
  )
  const difference = Math.round((cashReceivedAmount - totalExpended) * 100) / 100
  const summaryLabel =
    difference > 0 ? 'Cash to Return' : difference < 0 ? 'Reimbursement' : 'Fully Liquidated'

  const updateItem = (index, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (index) => {
    if (items.length <= 1) return
    if (!window.confirm('Remove this liquidation line?')) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReceiptChange = (file) => {
    setFormError(null)
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFormError('Receipt must be a JPEG, PNG, or WEBP image.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setFormError('Receipt image must be under 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setReceipt(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!description.trim()) {
      setFormError('Please provide a Purpose/Description.')
      return
    }
    if (!isEditMode && !receipt) {
      setFormError('A receipt image is required to submit a liquidation.')
      return
    }
    for (const it of items) {
      if (
        !it.date ||
        !it.rt ||
        !it.store_name ||
        !it.particulars ||
        !it.from ||
        !it.to ||
        !it.mode_of_transportation_id
      ) {
        setFormError(
          'Every line requires date, RT#, store, particulars, from, to, and mode of transportation.',
        )
        return
      }
      if (!parseFloat(it.amount) || parseFloat(it.amount) <= 0) {
        setFormError('Every line needs an amount greater than zero.')
        return
      }
    }

    const payload = { description, items, ...(receipt ? { receipt } : {}) }
    const result = isEditMode
      ? await onUpdate({ id: editingLiquidation.id, ...payload })
      : await onCreate({ cash_request_id: cashRequest.id, ...payload })

    if (result?.success) onClose()
    else
      setFormError(result?.message || `Failed to ${isEditMode ? 'update' : 'submit'} liquidation.`)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Liquidation' : 'New Liquidation'}
      subtitle={
        isEditMode
          ? `${editingLiquidation?.reference_id} — correct and resubmit`
          : `Against Cash Request ${cashRequest?.reference_id || `#${cashRequest?.id}`}`
      }
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}
        {isEditMode && ['REJECTED', 'INCOMPLETE'].includes(editingLiquidation?.status) && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg font-medium">
            This liquidation was returned as {editingLiquidation.status}. Correct the details and
            resubmit.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Purpose / Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Receipt {isEditMode ? '(replace, optional)' : <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleReceiptChange(e.target.files?.[0])}
                className="text-[11px] flex-1"
              />
              {receipt && (
                <img
                  src={receipt}
                  alt="Receipt preview"
                  className="w-9 h-9 object-cover rounded border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>

        <datalist id="store-name-options">
          {districts.map((d) => (
            <option key={d.id} value={d.store_name} />
          ))}
        </datalist>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Expense Lines
            </span>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#E31837] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>

          {items.map((it, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-slate-50/50"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="date"
                  required
                  value={it.date}
                  onChange={(e) => updateItem(index, 'date', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="RT#"
                  required
                  value={it.rt}
                  onChange={(e) => updateItem(index, 'rt', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Store name"
                  required
                  list="store-name-options"
                  value={it.store_name}
                  onChange={(e) => updateItem(index, 'store_name', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <select
                  required
                  value={it.particulars}
                  onChange={(e) => updateItem(index, 'particulars', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Particulars...</option>
                  {particulars.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="From"
                  required
                  value={it.from}
                  onChange={(e) => updateItem(index, 'from', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="To"
                  required
                  value={it.to}
                  onChange={(e) => updateItem(index, 'to', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <select
                  required
                  value={it.mode_of_transportation_id}
                  onChange={(e) => updateItem(index, 'mode_of_transportation_id', e.target.value)}
                  className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Mode of Transport...</option>
                  {modes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={it.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              {items.length > 1 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Cash Received</span>
            <span className="font-semibold">{formatCurrency(cashReceivedAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Total Liquidated</span>
            <span className="font-semibold">{formatCurrency(totalExpended)}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-200">
            <span className="font-bold text-slate-800">{summaryLabel}</span>
            <span
              className={`font-bold ${difference < 0 ? 'text-orange-600' : difference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}
            >
              {formatCurrency(Math.abs(difference))}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? isEditMode
                ? 'Resubmitting...'
                : 'Submitting...'
              : isEditMode
                ? 'Resubmit Liquidation'
                : 'Submit Liquidation'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
