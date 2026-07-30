import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import UnifiedLayout from '../components/layout/UnifiedLayout' 

export const Route = createFileRoute('/_authenticated')({
  validateSearch: (search) => ({
    selectPortal: search.selectPortal === true || undefined,
    redirect: search.redirect,
  }),
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#E31837] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace search={{ redirect: window.location.pathname }} />
  }

  return (
    <UnifiedLayout>
      <Outlet />
    </UnifiedLayout>
  )
}
