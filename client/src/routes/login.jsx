import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ShieldCheck, CheckCircle2, FileSpreadsheet } from 'lucide-react'

export const Route = createFileRoute('/login')({
  validateSearch: (search) => ({
    redirect: search.redirect || '/dashboard',
  }),
  component: LoginPage,
})

function LoginPage() {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' })

  const [formData, setFormData] = useState({ username: '', password: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errorMessage) setErrorMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const result = await login(formData)

      if (result.success) {
        navigate({ to: search.redirect })
      } else {
        setErrorMessage(result.message || 'Invalid username or password.')
      }
    } catch (err) {
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100/80 p-4 antialiased">
      {/* Tightened Landscape Card Container */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Panel: Compact Feature Highlights */}
        <div className="relative bg-linear-to-br from-[#E31837] via-[#b8122c] to-[#7f0b1c] text-white p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
          {/* Ambient Glows */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-black/25 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-bold text-white/90 uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3 h-3 text-white" />
              Budget Management System
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">BMS</h1>
            <p className="text-xs font-medium text-red-100/80 mt-0.5">
              Streamlining Departmental & Project Expenditures
            </p>
          </div>

          {/* Common Budget Features List */}
          <div className="relative z-10 my-4 space-y-2.5">
            <div className="flex items-start gap-2.5 bg-white/10 border border-white/15 p-2.5 rounded-xl backdrop-blur-md">
              <div className="w-7 h-7 rounded-lg bg-white/15 text-white shrink-0 flex items-center justify-center font-bold text-sm leading-none">
                ₱
              </div>
              <div>
                <p className="text-xs font-bold text-white">Allocation & Fund Tracking</p>
                <p className="text-[10px] text-red-100/70 leading-tight mt-0.5">
                  Monitor real-time balance and burn rates per department.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-white/10 border border-white/15 p-2.5 rounded-xl backdrop-blur-md">
              <div className="p-1.5 rounded-lg bg-white/15 text-white shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-red-100" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Approval Workflows</p>
                <p className="text-[10px] text-red-100/70 leading-tight mt-0.5">
                  Streamlined purchase requests and manager sign-offs.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-white/10 border border-white/15 p-2.5 rounded-xl backdrop-blur-md">
              <div className="p-1.5 rounded-lg bg-white/15 text-white shrink-0 mt-0.5">
                <FileSpreadsheet className="w-4 h-4 text-red-100" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Reports & Audit Trail</p>
                <p className="text-[10px] text-red-100/70 leading-tight mt-0.5">
                  Generate summary reports and maintain compliance logs.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex items-center justify-between text-[10px] text-red-200/60 font-medium border-t border-white/10 pt-2.5">
            <span>Enterprise Finance Portal</span>
            <span>v2.0</span>
          </div>
        </div>

        {/* Right Panel: Compact Login Form */}
        <div className="p-6 sm:p-8 flex flex-col justify-center bg-white">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Sign In</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your authorized credentials to proceed
            </p>
          </div>

          {/* Error Alert Box */}
          {errorMessage && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <span className="font-bold text-xs leading-none">⚠️</span>
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all text-xs text-slate-800 placeholder:text-slate-400 font-medium"
                value={formData.username}
                onChange={handleChange}
                disabled={isSubmitting || isLoading}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all text-xs text-slate-800 placeholder:text-slate-400 font-medium"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting || isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-[#E31837] hover:bg-[#c4122e] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-bold text-xs transition-all shadow-xs hover:shadow-sm active:scale-[0.99] cursor-pointer mt-1 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
