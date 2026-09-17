import { useState, useEffect, useMemo } from 'react'
import { Image } from 'antd'
import { Modal } from '../../components/ui/Modal'
import { Plus, Trash2, Upload, X } from 'lucide-react'
import RemoteSearchSelect from '../../components/ui/RemoteSearchSelect'

const formatCurrency = (val) =>
  `₱${parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const emptyItem = () => ({
  date: new Date().toISOString().slice(0, 10),
  rt: '',
  store_name: '',
  particulars: '',
  purpose: '',
  from: '',
  to: '',
  mode_of_transportation_id: '',
  amount: '',
  receipts: [],
})

// 11 tracks — one per header cell (Date, RT#, Store, Particulars, Purpose,
// From, To, Transport, Amount, Receipts, Action). No cell may span more
// than one track here, or the row runs out of tracks and CSS grid wraps
// the overflow (Action) onto an implicit second row.
const TRAVEL_GRID_COLS = 'grid-cols-[110px_65px_1.8fr_1.6fr_1.6fr_1.3fr_1.3fr_150px_90px_2fr_45px]'
const MISC_GRID_COLS = 'grid-cols-[110px_2.5fr_2fr_90px_2fr_45px]'

export default function CreateLiquidationModal({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  isSubmitting,
  cashRequest,
  cashReceived,
  editingLiquidation = null,
  districts = [],
  particulars = [],
  modes = [],
  searchStores,
  searchParticulars,
  searchModes,
}) {
  const isEditMode = Boolean(editingLiquidation)

  const [liquidationType, setLiquidationType] = useState('TRAVEL')
  const [items, setItems] = useState([emptyItem()])
  const [formError, setFormError] = useState(null)

  // Store Name options (value/label = store_name only, matches prior behavior)
  const initialStoreOptions = useMemo(
    () =>
      districts.map((d) => ({
        value: d.store_name,
        label: d.store_number ? `${d.store_number} ${d.store_name}` : d.store_name,
      })),
    [districts],
  )

  // From / To options — includes store number when available
  const initialLocationOptions = useMemo(
    () =>
      districts.map((d) => ({
        value: d.store_name,
        label: d.store_number ? `${d.store_number} ${d.store_name}` : d.store_name,
      })),
    [districts],
  )

  const particularOptions = useMemo(
    () =>
      particulars.map((p) => ({
        value: p.id,
        label: `${p.code ? p.code + ' ' : ''}${p.name || p.description}`,
      })),
    [particulars],
  )

  const modeOptions = useMemo(() => modes.map((m) => ({ value: m.id, label: m.name })), [modes])

  // Fallback local filters — used only if the parent hasn't wired up the
  // real searchParticulars/searchModes endpoints yet, so the field still
  // works during rollout instead of throwing.
  const searchParticularsLocal = async (term) => {
    const lower = term.toLowerCase()
    return particularOptions.filter((o) => o.label.toLowerCase().includes(lower))
  }
  const searchModesLocal = async (term) => {
    const lower = term.toLowerCase()
    return modeOptions.filter((o) => o.label.toLowerCase().includes(lower))
  }

  const resolvedSearchParticulars = searchParticulars || searchParticularsLocal
  const resolvedSearchModes = searchModes || searchModesLocal

  useEffect(() => {
    if (!isOpen) {
      setLiquidationType('TRAVEL')
      setItems([emptyItem()])
      setFormError(null)
      return
    }
    if (editingLiquidation) {
      const editItems = editingLiquidation.items || []
      setLiquidationType(editItems[0]?.type === 'MISCELLANEOUS' ? 'MISCELLANEOUS' : 'TRAVEL')
      setItems(
        editItems.length
          ? editItems.map((it) => ({
              date: it.date?.slice(0, 10) || '',
              rt: it.rt || '',
              store_name: it.store_name || '',
              particulars: it.particulars || '',
              purpose: it.purpose || '',
              from: it.from || '',
              to: it.to || '',
              mode_of_transportation_id: it.mode_of_transportation_id || '',
              amount: it.amount ?? '',
              receipts: Array.isArray(it.receipts) ? it.receipts : [],
            }))
          : [emptyItem()],
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

  const handleTypeChange = (newType) => {
    setLiquidationType(newType)
    if (newType === 'MISCELLANEOUS') {
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          rt: '',
          store_name: '',
          from: '',
          to: '',
          mode_of_transportation_id: '',
        })),
      )
    }
  }

  const updateItem = (index, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))

  const addItem = () => setItems((prev) => [...prev, emptyItem()])

  const removeItem = (index) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemReceiptsChange = (index, files) => {
    setFormError(null)
    if (!files || files.length === 0) return

    const fileList = Array.from(files)
    for (const file of fileList) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setFormError(`File "${file.name}" must be a JPEG, PNG, or WEBP image.`)
        return
      }
      if (file.size > MAX_FILE_BYTES) {
        setFormError(`File "${file.name}" exceeds the 5MB limit.`)
        return
      }
    }

    const readPromises = fileList.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(file)
        }),
    )

    Promise.all(readPromises).then((newImages) => {
      setItems((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, receipts: [...(it.receipts || []), ...newImages] } : it,
        ),
      )
    })
  }

  const removeItemReceipt = (index, receiptIndex) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, receipts: it.receipts.filter((_, ri) => ri !== receiptIndex) } : it,
      ),
    )
  }

  const isTravel = liquidationType === 'TRAVEL'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    for (const it of items) {
      if (!it.date || !it.particulars || !it.purpose?.trim()) {
        setFormError('Every line requires a date, particulars, and purpose.')
        return
      }
      if (
        isTravel &&
        (!it.rt || !it.store_name || !it.from || !it.to || !it.mode_of_transportation_id)
      ) {
        setFormError('Every line requires RT#, store, from, to, and mode of transportation.')
        return
      }
      if (!parseFloat(it.amount) || parseFloat(it.amount) <= 0) {
        setFormError('Every line needs an amount greater than zero.')
        return
      }
      if (!isEditMode && (!it.receipts || it.receipts.length === 0)) {
        setFormError('Every line needs at least one receipt image.')
        return
      }
    }

    const derivedDescription = isEditMode
      ? editingLiquidation.description
      : cashRequest?.purpose ||
        cashRequest?.project ||
        `Liquidation for ${cashRequest?.reference_id || cashRequest?.id}`

    const itemsWithType = items.map((it) => ({ ...it, type: liquidationType }))
    const allReceipts = itemsWithType.flatMap((it) => it.receipts || [])
    const payload = {
      items: itemsWithType,
      receipts: allReceipts,
      receipt: allReceipts[0] || '',
      ...(isEditMode ? {} : { description: derivedDescription }),
    }

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
      fullScreen
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        {/* TOP HEADER SECTION WITH TYPE SELECTION */}
        <div className="shrink-0 space-y-3 px-4 pt-4 border-b border-slate-200 pb-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Liquidation Type
              </label>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleTypeChange('TRAVEL')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    isTravel
                      ? 'bg-[#E31837] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Travel
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('MISCELLANEOUS')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    !isTravel
                      ? 'bg-[#E31837] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Miscellaneous
                </button>
              </div>
            </div>
          </div>

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
        </div>

        {/* SCROLLABLE TABLE BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Expense Lines ({items.length})
            </span>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#E31837] bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Line
            </button>
          </div>

          <Image.PreviewGroup>
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <div className={isTravel ? 'min-w-350 p-2 space-y-2' : 'min-w-225 p-2 space-y-2'}>
                {/* TABLE HEADER */}
                <div
                  className={`sticky top-0 z-10 bg-white grid gap-2 px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 ${
                    isTravel ? TRAVEL_GRID_COLS : MISC_GRID_COLS
                  }`}
                >
                  {isTravel ? (
                    <>
                      <div>Date</div>
                      <div>RT #</div>
                      <div>Store Name</div>
                      <div>Particulars</div>
                      <div>Purpose</div>
                      <div>From</div>
                      <div>To</div>
                      <div>Transport</div>
                      <div>Amount</div>
                      <div>Receipts</div>
                      <div className="text-center">Action</div>
                    </>
                  ) : (
                    <>
                      <div>Date</div>
                      <div>Particulars</div>
                      <div>Purpose</div>
                      <div>Amount</div>
                      <div>Receipts</div>
                      <div className="text-center">Action</div>
                    </>
                  )}
                </div>

                {/* TABLE ROWS */}
                {items.map((it, index) => (
                  <div
                    key={index}
                    className={`grid gap-2 items-start p-1.5 bg-slate-50/70 hover:bg-slate-100/60 rounded-lg border border-slate-200/60 transition-colors ${
                      isTravel ? TRAVEL_GRID_COLS : MISC_GRID_COLS
                    }`}
                  >
                    {/* Date Input */}
                    <div>
                      <input
                        type="date"
                        required
                        value={it.date}
                        onChange={(e) => updateItem(index, 'date', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-[#E31837]"
                      />
                    </div>

                    {/* Travel Fields */}
                    {isTravel && (
                      <>
                        <div>
                          <input
                            type="text"
                            placeholder="RT#"
                            required
                            value={it.rt}
                            onChange={(e) => updateItem(index, 'rt', e.target.value)}
                            className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-[#E31837]"
                          />
                        </div>
                        {/* No col-span here — Store Name owns its own track
                            (widened via 1.8fr above) instead of eating a
                            second track, which is what pushed Action onto
                            a second row. */}
                        <div>
                          <RemoteSearchSelect
                            value={it.store_name}
                            onChange={(val) => updateItem(index, 'store_name', val)}
                            fetchOptions={searchStores}
                            initialOptions={initialStoreOptions}
                            placeholder="Store..."
                          />
                        </div>
                      </>
                    )}

                    {/* Particulars */}
                    <div>
                      <RemoteSearchSelect
                        value={it.particulars}
                        onChange={(val) => updateItem(index, 'particulars', val)}
                        fetchOptions={resolvedSearchParticulars}
                        initialOptions={particularOptions}
                        placeholder="Select Particular..."
                      />
                    </div>

                    {/* Purpose */}
                    <div>
                      <input
                        type="text"
                        placeholder="What was this for?"
                        required
                        value={it.purpose}
                        onChange={(e) => updateItem(index, 'purpose', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-[#E31837]"
                      />
                    </div>

                    {/* Travel-only Location and Transport Inputs */}
                    {isTravel && (
                      <>
                        <div>
                          <RemoteSearchSelect
                            value={it.from}
                            onChange={(val) => updateItem(index, 'from', val)}
                            fetchOptions={searchStores}
                            initialOptions={initialLocationOptions}
                            placeholder="From..."
                          />
                        </div>
                        <div>
                          <RemoteSearchSelect
                            value={it.to}
                            onChange={(val) => updateItem(index, 'to', val)}
                            fetchOptions={searchStores}
                            initialOptions={initialLocationOptions}
                            placeholder="To..."
                          />
                        </div>
                        <div>
                          <RemoteSearchSelect
                            value={it.mode_of_transportation_id}
                            onChange={(val) => updateItem(index, 'mode_of_transportation_id', val)}
                            fetchOptions={resolvedSearchModes}
                            initialOptions={modeOptions}
                            placeholder="Mode..."
                          />
                        </div>
                      </>
                    )}

                    {/* Amount Field */}
                    <div>
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
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
                          className="w-full pl-4 pr-1.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium focus:ring-1 focus:ring-[#E31837]"
                        />
                      </div>
                    </div>

                    {/* Receipt Upload & Previews */}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap py-0.5 max-w-full">
                        <label
                          className="inline-flex items-center justify-center h-7 px-2 gap-1 bg-white border border-slate-300 hover:border-slate-400 rounded-md cursor-pointer shrink-0 text-[11px] text-slate-600 font-medium"
                          title="Upload receipt(s) for this line"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => handleItemReceiptsChange(index, e.target.files)}
                            className="hidden"
                          />
                        </label>

                        {(it.receipts || []).map((src, ri) => (
                          <div
                            key={ri}
                            className="relative group w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0"
                          >
                            <Image
                              src={src}
                              width={32}
                              height={32}
                              style={{ objectFit: 'cover' }}
                              preview={{
                                mask: null,
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeItemReceipt(index, ri)
                              }}
                              className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                              title="Remove"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex justify-center items-center h-full">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                          title="Remove line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Image.PreviewGroup>
        </div>

        {/* BOTTOM FIXED FOOTER */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-medium">Cash Received:</span>
              <span className="font-bold text-slate-800">{formatCurrency(cashReceivedAmount)}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-medium">Total Liquidated:</span>
              <span className="font-bold text-slate-800">{formatCurrency(totalExpended)}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="font-bold text-slate-700">{summaryLabel}:</span>
              <span
                className={`font-extrabold ${difference < 0 ? 'text-orange-600' : difference > 0 ? 'text-blue-600' : 'text-emerald-600'}`}
              >
                {formatCurrency(Math.abs(difference))}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
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
        </div>
      </form>
    </Modal>
  )
}
