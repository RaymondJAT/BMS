import { useState, useCallback, useEffect } from 'react'
import { masterParticularsApi } from '../api/masterParticularsApi'

export function useParticulars() {
  const [particulars, setParticulars] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const fetchParticulars = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await masterParticularsApi.getAll()
      setParticulars(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error loading particulars')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchParticulars()
  }, [fetchParticulars])

  const updateStatus = useCallback(
    async ({ id, status }) => {
      setIsSubmitting(true)
      try {
        const data = await masterParticularsApi.upsert({ id, status })
        await fetchParticulars()
        return { success: true, message: data?.message || 'Updated successfully' }
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Failed to update status',
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [fetchParticulars],
  )

  const importParticulars = useCallback(
    async (items) => {
      setIsSubmitting(true)
      try {
        const data = await masterParticularsApi.importCSV(items)
        await fetchParticulars()
        return { success: true, count: data?.count || items.length }
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || err.message || 'Network error during import',
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [fetchParticulars],
  )

  return {
    particulars,
    isLoading,
    isSubmitting,
    error,
    refetch: fetchParticulars,
    updateStatus,
    importParticulars,
  }
}
