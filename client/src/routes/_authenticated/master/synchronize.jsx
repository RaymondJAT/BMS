import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building,
  Briefcase,
  KeyRound,
} from 'lucide-react'
import StatCard from '../../../components/ui/StatCard'
import useSynchronize from '../../../hooks/useSynchronize'

export const Route = createFileRoute('/_authenticated/master/synchronize')({
  component: SynchronizePage,
})

function SynchronizePage() {
  const [token, setToken] = useState('')
  const { runSync, isSyncing, lastResult, error } = useSynchronize()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!token.trim()) return
    runSync(token.trim())
  }

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      <div>
        <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
          HRMIS Synchronization
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Pull departments, positions, employees, and user accounts from HRMIS into this system.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 shrink-0"
      >
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            HRMIS Bearer Token <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            required
            placeholder="Paste HRMIS API token..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isSyncing || !token.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isSyncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {isSyncing ? 'Synchronizing...' : 'Run Synchronization'}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl shrink-0">
          {error}
        </div>
      )}

      {lastResult && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Departments Added"
              value={lastResult.departments_added ?? 0}
              icon={Building}
              subtitle="New this sync"
              variant="blue"
            />
            <StatCard
              title="Positions Added"
              value={lastResult.positions_added ?? 0}
              icon={Briefcase}
              subtitle="New this sync"
              variant="amber"
            />
            <StatCard
              title="Employees Added"
              value={lastResult.employees_added ?? 0}
              icon={Users}
              subtitle={`${lastResult.employees_skipped?.length || 0} skipped`}
              variant="emerald"
            />
            <StatCard
              title="Accounts Added"
              value={lastResult.users_added ?? 0}
              icon={KeyRound}
              subtitle={`${lastResult.users_skipped?.length || 0} skipped`}
              variant="blue"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Last synced{' '}
            {lastResult.synced_at
              ? new Date(lastResult.synced_at).toLocaleString('en-PH')
              : 'just now'}
          </div>

          {(lastResult.employees_skipped?.length > 0 || lastResult.users_skipped?.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5" />
                Skipped Records — Needs Attention
              </div>
              <div className="text-[11px] text-amber-800 space-y-1">
                {lastResult.employees_skipped?.map((s, i) => (
                  <div key={`emp-${i}`}>
                    Employee <strong>{s.name || s.id}</strong>: {s.reason}
                  </div>
                ))}
                {lastResult.users_skipped?.map((s, i) => (
                  <div key={`user-${i}`}>
                    User <strong>{s.username || s.employee_id}</strong>: {s.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
