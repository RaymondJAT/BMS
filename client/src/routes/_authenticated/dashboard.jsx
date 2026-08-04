import { createFileRoute } from '@tanstack/react-router'
import { Wallet, FileText, Clock, Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/ui/StatCard'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="w-full space-y-5">
      {/* Dashboard Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          BMS Dashboard
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Welcome back, <span className="font-semibold text-slate-800">{user?.name || 'User'}</span>
          ! Role: <span className="font-semibold text-slate-800">{user?.role || 'DEVELOPER'}</span>
        </p>
      </div>

      {/* Top Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Allocated Budget"
          value="₱2,500,000"
          icon={Wallet}
          trend="+12.4%"
          trendDirection="up"
          subtitle="vs. FY25 Q2"
          variant="red"
        />

        <StatCard
          title="Total Requests"
          value="48"
          icon={FileText}
          trend="+6 new"
          trendDirection="up"
          subtitle="this week"
          variant="blue"
        />

        <StatCard
          title="Pending Approvals"
          value="5 Requests"
          icon={Clock}
          trend="Action Required"
          trendDirection="down"
          subtitle="Requires action"
          variant="amber"
        />

        <StatCard
          title="Active Departments"
          value="12"
          icon={Building2}
          subtitle="Fully onboarded"
          variant="emerald"
        />
      </div>

      {/* Additional Sections / Data Tables Can Go Below */}
    </div>
  )
}
