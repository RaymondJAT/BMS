import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, Save } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'

export default function EditDistrictModal({
  isOpen,
  onClose,
  district,
  onUpdateStatus,
  isSubmitting,
}) {
  const [status, setStatus] = useState('ACTIVE')
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (district) {
      const currentStatus = district.mdt_status || district.status || 'ACTIVE'
      setStatus(currentStatus.toUpperCase())
      setErrorMessage(null)
    }
  }, [district])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setErrorMessage(null)

      const id = district?.mdt_id || district?.id

      const result = await onUpdateStatus?.({
        id,
        status,
      })

      if (result?.success) {
        onClose()
      } else {
        setErrorMessage(result?.message || 'Failed to update status.')
      }
    },
    [district, status, onUpdateStatus, onClose],
  )

  if (!isOpen || !district) return null

  const storeNumber =
    district.mdt_store_number || district.code || `ST-${district.mdt_id || district.id}`
  const storeName = district.mdt_store_name || district.name || 'Unnamed Store'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit District Status" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* District Details Header Info */}
        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg">
          <p className="text-[11px] font-medium text-slate-500">Store Information</p>
          <p className="text-xs font-bold text-slate-900 mt-0.5">
            Store No: {storeNumber} — {storeName}
          </p>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E31837] hover:bg-[#c4122d] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}
