import React, { useState, useEffect } from 'react'
import { Shield, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Modal } from '../../ui/Modal'

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

  const isEdit = Boolean(accessData)
  const roleId = accessData?.ma_id || accessData?.id
  const modalTitle = isEdit ? 'Edit Access Role' : 'Create Access Role'

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
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* FEEDBACK ALERT */}
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

        <div className="space-y-3 sm:space-y-3.5">
          {/* ROLE NAME */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
              Role Name <span className="text-[#E31837]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Finance Approver"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none transition-all"
            />
          </div>

          {/* STATUS SELECT */}
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none cursor-pointer transition-all"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        {/* ACTION CONTROLS */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
