import { useState, useEffect, useCallback } from 'react'
import { masterAccessApi } from '../api/masterAccessApi'

/**
 * Access page's lookup hook. The page only ever reads `accessRoles` (+
 * `refetch`, to reload after a role upsert or a route-permission edit)
 * from the old shared hook — the upsert itself goes straight through
 * masterAccessApi, not through this hook. So this fetches exactly one
 * thing: the Access Role list from getMasterAccess.
 */
export function useAccessLookups() {
  const [accessRoles, setAccessRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = masterAccessApi?.getAll ? await masterAccessApi.getAll() : []
      const accessVal = Array.isArray(res) ? res : res?.data || res?.result || []
      setAccessRoles(accessVal)
    } catch (err) {
      console.error('Failed to fetch access lookups:', err)
      setError('Failed to load reference data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    accessRoles,
    isLoading,
    error,
    refetch: fetchAll,
  }
}

export default useAccessLookups
