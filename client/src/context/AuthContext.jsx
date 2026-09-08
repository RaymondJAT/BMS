import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { authApi } from '../api/authApi'
import { routeAccessApi } from '../api/routeAccessApi'

const AuthContext = createContext(null)
const TOKEN_KEY = 'bms_token'

const PROTECTED_ACCESS_NAMES = ['ADMINISTRATOR']
const isProtectedAccessName = (name) => PROTECTED_ACCESS_NAMES.includes((name || '').toUpperCase())

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [permissionsLoaded, setPermissionsLoaded] = useState(false)

  const loadPermissions = useCallback(async (accessId, accessName) => {
    if (!accessId) {
      setPermissions(new Map())
      setPermissionsLoaded(true)
      return
    }
    try {
      const rows = await routeAccessApi.getPermissionsForAccess(accessId)
      const protectedRole = isProtectedAccessName(accessName)
      setPermissions(
        new Map(rows.map((row) => [row.name, protectedRole ? 'FULL-ACCESS' : row.permission])),
      )
    } catch (err) {
      console.error('Failed to load route permissions:', err)
      setPermissions(new Map())
    } finally {
      setPermissionsLoaded(true)
    }
  }, [])

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setPermissions(new Map())
    setPermissionsLoaded(true)
  }, [])

  useEffect(() => {
    const hydrate = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        setIsLoading(false)
        setPermissionsLoaded(true)
        return
      }
      try {
        const profile = await authApi.checkSession()
        setUser(profile)
        await loadPermissions(profile.access_id, profile.access_name)
      } catch (err) {
        clearSession()
      } finally {
        setIsLoading(false)
      }
    }
    hydrate()
  }, [loadPermissions, clearSession])

  useEffect(() => {
    window.addEventListener('auth:unauthorized', clearSession)
    return () => window.removeEventListener('auth:unauthorized', clearSession)
  }, [clearSession])

  const login = useCallback(
    async ({ username, password }) => {
      try {
        const data = await authApi.login(username, password)
        if (!data?.success) {
          return { success: false, message: data?.message || 'Login failed.' }
        }
        localStorage.setItem(TOKEN_KEY, data.token)
        setUser(data.data)
        await loadPermissions(data.data.access_id, data.data.access_name)
        return { success: true }
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || 'Login failed. Please try again.',
        }
      }
    },
    [loadPermissions],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (err) {
      console.error('Logout request failed (clearing local session anyway):', err)
    } finally {
      clearSession()
    }
  }, [clearSession])

  const refreshPermissions = useCallback(() => {
    if (!user) return Promise.resolve()
    return loadPermissions(user.access_id, user.access_name)
  }, [user, loadPermissions])

  const hasRole = useCallback(
    (allowedRoles = []) => {
      if (!user || !user.access_name) return false
      return allowedRoles.includes(user.access_name)
    },
    [user],
  )

  const canAccessRoute = useCallback(
    (routeName) => {
      if (!user) return false
      if (isProtectedAccessName(user.access_name)) return true
      return permissions.get(routeName) === 'FULL-ACCESS'
    },
    [user, permissions],
  )

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthenticated: Boolean(user),
      isLoading,
      permissionsLoaded,
      permissions,
      hasRole,
      canAccessRoute,
      login,
      logout,
      refreshPermissions,
    }),
    [
      user,
      isLoading,
      permissionsLoaded,
      permissions,
      hasRole,
      canAccessRoute,
      login,
      logout,
      refreshPermissions,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// import { createContext, useContext, useState } from 'react'

// const AuthContext = createContext(null)

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState({
//     name: 'Admin User',
//     role: 'DEVELOPER',
//   })
//   const [isLoading, setIsLoading] = useState(false)

//   const login = async () => {
//     setUser({ name: 'Admin User', role: 'DEVELOPER' })
//     return { success: true }
//   }

//   const logout = () => {
//     setUser(null)
//   }

//   const hasRole = (allowedRoles = []) => {
//     if (!user || !user.role) return false
//     return allowedRoles.includes(user.role)
//   }

//   return (
//     <AuthContext.Provider
//       value={{
//         user,
//         setUser,
//         isAuthenticated: !!user,
//         isLoading,
//         login,
//         logout,
//         hasRole,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   )
// }

// export function useAuth() {
//   const context = useContext(AuthContext)
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider')
//   }
//   return context
// }
