import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal'

export default function EditRouteAccessModal({
  isOpen,
  onClose,
  routeAccess,
  onUpdateStatus,
  isSubmitting,
}) {
  const [status, setStatus] = useState('NO-ACCESS')
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    if (routeAccess) {
      setStatus(routeAccess.mra_status || routeAccess.status || 'NO-ACCESS')
    }
    setFormError(null)
  }, [routeAccess, isOpen])

  if (!routeAccess) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)

    const result = await onUpdateStatus({
      id: routeAccess.mra_id || routeAccess.id,
      status,
    })

    if (result?.success || result?.status === 200) {
      onClose()
    } else {
      setFormError(result?.message || 'Failed to update route access status.')
    }
  }

  const routeName = routeAccess.mra_name || routeAccess.name || ''
  const routeId = routeAccess.mra_id || routeAccess.id || 'N/A'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Route Access Status"
      subtitle={`ID: #${routeId}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {formError}
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Route Name
          </label>
          <input
            type="text"
            readOnly
            value={routeName}
            className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-600 focus:outline-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
            Access Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
          >
            <option value="FULL-ACCESS">FULL-ACCESS</option>
            <option value="NO-ACCESS">NO-ACCESS</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
