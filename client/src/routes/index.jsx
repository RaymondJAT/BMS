import { createFileRoute, redirect, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  // Automatically redirects root "/" straight to "/dashboard"
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard',
    })
  },
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full flex flex-col items-center justify-center">
        {/* Brand/App Title */}
        <h1 className="text-[2.618rem] leading-tight font-extrabold text-slate-900 mb-2 tracking-tight text-center">
          BMS Admin
        </h1>
        <p className="text-[1.2rem] text-slate-500 mb-8 text-center font-light">
          Budget Monitoring System
        </p>

        {/* Unauthorized Card */}
        <div className="bg-white p-[2.618rem] rounded-2xl shadow-lg border-t-[6px] border-t-[#E31837] w-full max-w-[38.2rem] text-center transition-all hover:shadow-xl">
          <div className="mx-auto w-16 h-16 bg-red-50 text-[#E31837] rounded-full flex items-center justify-center mb-6 font-mono text-2xl font-bold">
            403
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>

          <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
            You don't have permission to access this financial module. If you believe this is an
            error, please contact your budget administrator or sign in with an account that has
            master access privileges.
          </p>

          <div className="flex justify-center gap-4">
            <Link
              to="/dashboard"
              className="bg-[#E31837] hover:bg-[#c4122e] text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
