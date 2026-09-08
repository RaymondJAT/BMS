import { useState, useEffect } from 'react'
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Access Role' : 'Create Access Role'}
      subtitle={isEdit ? `ID: #${roleId}` : 'Define a new system access level'}
      icon={Shield}
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-access-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-semibold text-xs rounded-lg transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </div>
      }
    >
      <form id="edit-access-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Feedback Alert */}
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
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
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
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </form>
    </Modal>
  )
}
