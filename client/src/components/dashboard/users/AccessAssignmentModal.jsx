import React, { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { Modal } from '../../ui/Modal'

/**
 * accessRoles: raw role rows from useUserManagementLookups, shape
 * { id/ma_id, name/ma_name, status/ma_status }.
 */
export default function AccessAssignmentModal({ isOpen, user, accessRoles = [], onClose, onSave }) {
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (user) {
      setSelectedRoleId(user.access_id != null ? String(user.access_id) : '')
      setErrorMessage('')
    }
  }, [user, isOpen])

  if (!user) return null

  const activeRoles = accessRoles.filter(
    (r) => String(r.status || r.ma_status || 'ACTIVE').toUpperCase() === 'ACTIVE',
  )

  const handleSave = async (e) => {
    e.preventDefault()
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
    <Modal isOpen={isOpen} onClose={onClose} title="Set Access Role" maxWidth="max-w-sm">
      <form onSubmit={handleSave} className="space-y-3.5 sm:space-y-4">
        {/* USER CONTEXT SUBTITLE */}
        <p className="text-xs text-slate-500 font-medium">
          <span className="font-semibold text-slate-800">{user.fullname || user.username}</span> —
          choose the role this user should have.
        </p>

        {/* ERROR ALERT */}
        {errorMessage && (
          <div className="p-3 rounded-xl border flex items-center gap-2.5 bg-rose-50 border-rose-200 text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ROLE SELECT */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold text-slate-700 mb-1 truncate">
            System Access Role <span className="text-[#E31837]">*</span>
          </label>
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            disabled={isSaving}
            className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#E31837] focus:outline-none cursor-pointer transition-all disabled:opacity-50"
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
        </div>

        {/* ACTION CONTROLS */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Role
          </button>
        </div>
      </form>
    </Modal>
  )
}
