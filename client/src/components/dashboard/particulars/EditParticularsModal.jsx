import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, AlertCircle, Save } from 'lucide-react'

export default function EditParticularsModal({
  isOpen,
  onClose,
  particular,
  onUpdateStatus,
  isSubmitting,
}) {
  const [status, setStatus] = useState('ACTIVE')
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (particular) {
      setStatus((particular.status || 'ACTIVE').toUpperCase())
      setErrorMessage(null)
    }
  }, [particular])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setErrorMessage(null)

      const result = await onUpdateStatus?.({
        id: particular?.id,
        status,
      })

      if (result?.success) {
        onClose()
      } else {
        setErrorMessage(result?.message || 'Failed to update status.')
      }
    },
    [particular, status, onUpdateStatus, onClose],
  )

  if (!isOpen || !particular) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Edit Particular Status
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {particular.code || `P-${particular.id}`} — {particular.name || 'Unnamed'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
      </div>
    </div>
  )
}
