import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

/**
 * accessRoles: raw role rows from useUserManagementLookups, shape
 * { id/ma_id, name/ma_name, status/ma_status }.
 */
export default function AccessAssignmentModal({ user, accessRoles = [], onClose, onSave }) {
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (user) {
      setSelectedRoleId(user.access_id != null ? String(user.access_id) : '')
      setErrorMessage('')
    }
  }, [user])

  if (!user) return null

  const activeRoles = accessRoles.filter(
    (r) => String(r.status || r.ma_status || 'ACTIVE').toUpperCase() === 'ACTIVE',
  )

  const handleSave = async () => {
    if (!selectedRoleId) {
      setErrorMessage('Please select a role.')
      return
    }
    setIsSaving(true)
    setErrorMessage('')
    try {
      await onSave(user.id, selectedRoleId)
      onClose()
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to update access role.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Set Access Role</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          {user.fullname || user.username} — choose the role this user should have.
        </p>

        {errorMessage && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {errorMessage}
          </div>
        )}

        <select
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          disabled={isSaving}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent mb-4"
        >
          <option value="">Select a role...</option>
          {activeRoles.map((role) => {
            const id = role.id ?? role.ma_id
            const name = role.name ?? role.ma_name
            return (
              <option key={id} value={id}>
                {name}
              </option>
            )
          })}
        </select>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E31837] hover:bg-[#c4122e] disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
