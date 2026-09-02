import { useState, useCallback, useEffect } from 'react'
import { masterDistrictApi } from '../api/masterDistrictApi'

export function useDistricts() {
  const [districts, setDistricts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const fetchDistricts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await masterDistrictApi.getAll()
      setDistricts(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error loading districts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDistricts()
  }, [fetchDistricts])

  const updateStatus = useCallback(
    async ({ id, status }) => {
      setIsSubmitting(true)
      try {
        const data = await masterDistrictApi.upsert({ id, status })
        await fetchDistricts()
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
    [fetchDistricts],
  )

  const importDistricts = useCallback(
    async (items) => {
      setIsSubmitting(true)
      try {
        const data = await masterDistrictApi.importCSV(items)
        await fetchDistricts()
        return { success: true, count: data?.count || items.length }
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'Network error during import'
        return {
          success: false,
          message,
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [fetchDistricts],
  )

  return {
    districts,
    isLoading,
    isSubmitting,
    error,
    refetch: fetchDistricts,
    updateStatus,
    importDistricts,
  }
}
