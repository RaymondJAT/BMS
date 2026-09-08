import { useState, useEffect, useCallback, useMemo } from 'react'
import { masterUserApi } from '../api/masterUserApi'
import { masterAccessApi } from '../api/masterAccessApi'
import { routeAccessApi } from '../api/routeAccessApi'

export function useUserManagementLookups() {
  const [users, setUsers] = useState([])
  const [accessRoles, setAccessRoles] = useState([])
  const [routeAccess, setRouteAccess] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [userRes, accessRes, routeAccessRes] = await Promise.allSettled([
        masterUserApi.getAll(),
        masterAccessApi.getAll(),
        routeAccessApi.getAll(),
      ])

      const unwrap = (res) => {
        if (res.status !== 'fulfilled') return []
        const val = res.value
        return Array.isArray(val) ? val : val?.data || val?.result || []
      }

      setUsers(unwrap(userRes))
      setAccessRoles(unwrap(accessRes))
      setRouteAccess(unwrap(routeAccessRes))
    } catch (err) {
      console.error('Failed to fetch user management lookups:', err)
      setError('Failed to load reference data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const rolesMap = useMemo(() => {
    return accessRoles.reduce((acc, role) => {
      const id = role.ma_id ?? role.id ?? role.access_id
      const name = role.ma_name || role.name || role.access_name
      if (id != null && name) {
        acc[id] = name
        acc[String(id)] = name
      }
      return acc
    }, {})
  }, [accessRoles])

  return { users, accessRoles, routeAccess, rolesMap, isLoading, error, refetch: fetchAll }
}

export default useUserManagementLookups
