import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, Save } from 'lucide-react'
import { Modal } from '../../ui/Modal'

const EMPTY_FORM = { name: '', status: 'ACTIVE' }

export default function ProjectModal({ isOpen, onClose, project, onSave, isSubmitting }) {
  const isEditMode = Boolean(project)

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setFormData(EMPTY_FORM)
      setErrorMessage(null)
      return
    }

    if (project) {
      setFormData({
        name: project.name || '',
        status: (project.status || 'ACTIVE').toUpperCase(),
      })
    } else {
      setFormData(EMPTY_FORM)
    }
    setErrorMessage(null)
  }, [isOpen, project])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setErrorMessage(null)

      if (!formData.name.trim()) {
        setErrorMessage('Project name is required.')
        return
      }

      const result = await onSave?.({
        id: project?.id,
        name: formData.name.trim(),
        status: formData.status,
      })

      if (result?.success) {
        onClose()
      } else {
        setErrorMessage(result?.message || `Failed to ${isEditMode ? 'update' : 'create'} project.`)
      }
    },
    [formData, project, onSave, onClose, isEditMode],
  )

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Project' : 'New Project'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Project Alpha"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Status — only meaningful once the project exists; still shown
            on create so an admin can add a project as INACTIVE upfront
            (e.g. staged ahead of a future rollout) without a second edit. */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            disabled={isSubmitting}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all cursor-pointer"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <p className="text-[11px] text-slate-500">
            Only Active projects appear in the Cash Request "Project" dropdown.
          </p>
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
            {isEditMode ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
