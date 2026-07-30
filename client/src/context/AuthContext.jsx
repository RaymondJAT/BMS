import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    name: 'Admin User',
    role: 'DEVELOPER',
  })
  const [isLoading, setIsLoading] = useState(false)

  const login = async () => {
    setUser({ name: 'Admin User', role: 'DEVELOPER' })
    return { success: true }
  }

  const logout = () => {
    setUser(null)
  }

  const hasRole = (allowedRoles = []) => {
    if (!user || !user.role) return false
    return allowedRoles.includes(user.role)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
