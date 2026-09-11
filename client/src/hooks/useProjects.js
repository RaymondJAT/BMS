import { useState, useCallback, useEffect } from 'react'
import { masterProjectApi } from '../api/masterProjectApi'

export function useProjects() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await masterProjectApi.getAll()
      setProjects(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error loading projects')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Handles both create (no id) and edit (with id) — the backend
  // upsertMasterProject controller branches on presence of `id`.
  const saveProject = useCallback(
    async ({ id, name, status }) => {
      setIsSubmitting(true)
      try {
        const payload = id ? { id, name, status } : { name, status }
        const data = await masterProjectApi.upsert(payload)
        await fetchProjects()
        return {
          success: true,
          message: data?.message || (id ? 'Updated successfully' : 'Created successfully'),
        }
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Failed to save project',
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [fetchProjects],
  )

  return {
    projects,
    isLoading,
    isSubmitting,
    error,
    refetch: fetchProjects,
    saveProject,
  }
}

export default useProjects
