import { useState, useEffect, useCallback } from 'react'
import { masterEmployeeApi } from '../api/masterEmployeeApi'

/**
 * Employees page's lookup hook. The page only reads `employees` from the
 * old shared hook — department_name/position_name already come
 * pre-joined onto each employee row by getMasterEmployee server-side
 * (see master-employee.controller.js), so no separate departments/
 * positions fetch is needed here.
 */
export function useEmployeeLookups() {
  const [employees, setEmployees] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await masterEmployeeApi.getAll()
      const val = Array.isArray(res) ? res : res?.data || res?.result || []
      setEmployees(val)
    } catch (err) {
      console.error('Failed to fetch employee lookups:', err)
      setError('Failed to load reference data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    employees,
    isLoading,
    error,
    refetch: fetchAll,
  }
}

export default useEmployeeLookups
