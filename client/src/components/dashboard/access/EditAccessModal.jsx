import { useState, useEffect } from 'react'
import { Shield, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function EditAccessModal({ isOpen, onClose, accessData, onUpsert, isSubmitting }) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [feedback, setFeedback] = useState({ type: null, message: '' })

  useEffect(() => {
    if (accessData) {
      setName(accessData.ma_name || accessData.name || '')
      setStatus((accessData.ma_status || accessData.status || 'ACTIVE').toUpperCase())
    } else {
      setName('')
      setStatus('ACTIVE')
    }
    setFeedback({ type: null, message: '' })
  }, [accessData, isOpen])

  if (!isOpen) return null

  const isEdit = Boolean(accessData)
  const roleId = accessData?.ma_id || accessData?.id

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setFeedback({ type: 'error', message: 'Role name is required.' })
      return
    }

    setFeedback({ type: null, message: '' })

    const payload = {
      ...(isEdit && { id: roleId }),
      name: name.trim(),
      status,
    }

    const result = await onUpsert(payload)

    if (result?.success) {
      setFeedback({
        type: 'success',
        message: isEdit ? 'Access role updated successfully.' : 'Access role created successfully.',
      })
      setTimeout(() => {
        onClose()
      }, 1000)
    } else {
      setFeedback({
        type: 'error',
        message: result?.message || 'Failed to save access role.',
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E31837]/10 border border-[#E31837]/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-[#E31837]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {isEdit ? 'Edit Access Role' : 'Create Access Role'}
              </h2>
              {isEdit && <p className="text-[11px] text-slate-500 font-mono">ID: #{roleId}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Feedback */}
          {feedback.message && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Role Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Role Name <span className="text-[#E31837]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Finance Approver"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
            />
          </div>

          {/* Status Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4132e] text-white font-semibold text-xs rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
