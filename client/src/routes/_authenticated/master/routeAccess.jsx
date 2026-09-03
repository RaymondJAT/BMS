import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import DataTable from '../../../components/ui/DataTable'
import StatCard from '../../../components/ui/StatCard'
import {
  Search,
  Filter,
  FileSpreadsheet,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { createRouteColumns } from '../../../config/tables/routeColumns'
import EditRouteAccessModal from '../../../components/dashboard/route-access/EditRouteAccessModal'
import { useCashDisbursementLookups } from '../../../hooks/useCashDisbursementLookups'
import { routeAccessApi } from '../../../api/routeAccessApi'

export const Route = createFileRoute('/_authenticated/master/routeAccess')({
  component: RouteAccessPage,
})

function RouteAccessPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedIds, setSelectedIds] = useState([])

  const [selectedRoute, setSelectedRoute] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load route access list from central lookup hook
  const { routeAccess = [], isLoading, error, refetch } = useCashDisbursementLookups()

  const handleEdit = useCallback((row) => {
    setSelectedRoute(row)
    setIsEditOpen(true)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setIsEditOpen(false)
    setSelectedRoute(null)
  }, [])

  const handleUpdateStatus = useCallback(
    async ({ id, status }) => {
      setIsSubmitting(true)
      try {
        await routeAccessApi.upsert({ id, status })
        if (refetch) await refetch()
        return { success: true }
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || 'Failed to update route access status.',
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [refetch],
  )

  const handleSelectionChange = useCallback((keys) => {
    setSelectedIds(keys)
  }, [])

  // Metrics counters for StatCards
  const metrics = useMemo(() => {
    const total = routeAccess.length
    const fullAccess = routeAccess.filter((r) => {
      const status = r.mra_status || r.status || 'NO-ACCESS'
      return String(status).toUpperCase() === 'FULL-ACCESS'
    }).length
    const noAccess = total - fullAccess
    return { total, fullAccess, noAccess }
  }, [routeAccess])

  // Search & Filter execution
  const filteredRouteAccess = useMemo(() => {
    return routeAccess.filter((item) => {
      const q = searchTerm.toLowerCase()
      const name = (item.mra_name || item.name || '').toLowerCase()

      const matchesSearch = name.includes(q)
      const currentStatus = (item.mra_status || item.status || 'NO-ACCESS').toUpperCase()
      const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [routeAccess, searchTerm, statusFilter])

  const columns = useMemo(() => createRouteColumns({ onEdit: handleEdit }), [handleEdit])

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Route Access
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage system route accessibility and module permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <StatCard
          title="Total Routes"
          value={metrics.total}
          icon={Shield}
          subtitle="Configured routes"
          variant="blue"
        />
        <StatCard
          title="Full Access Routes"
          value={metrics.fullAccess}
          icon={ShieldCheck}
          subtitle="Accessible routes"
          variant="emerald"
        />
        <StatCard
          title="No Access Routes"
          value={metrics.noAccess}
          icon={ShieldAlert}
          subtitle="Restricted routes"
          variant="amber"
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-xl border border-slate-200/80 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Route Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="FULL-ACCESS">FULL-ACCESS</option>
              <option value="NO-ACCESS">NO-ACCESS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200/80 p-6">
            <Loader2 className="w-6 h-6 text-[#E31837] animate-spin mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading route access list...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-rose-200 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">Error Loading Data</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {typeof error === 'string'
                ? error
                : error?.message || 'Failed to fetch route access records.'}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredRouteAccess}
            keyExtractor={(row) => row.mra_id || row.id}
            selectable={false}
            selectedRows={selectedIds}
            onSelectionChange={handleSelectionChange}
            maxHeight="h-full"
            containerClassName="h-full flex flex-col min-h-0"
            emptyMessage={
              searchTerm || statusFilter !== 'ALL'
                ? 'No routes match your search parameters.'
                : 'No route access entries found.'
            }
            footer={
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>
                  Showing {filteredRouteAccess.length} entries
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </span>
                <span>Fiscal Year 2026</span>
              </div>
            }
          />
        )}
      </div>

      {/* Edit Modal */}
      {isEditOpen && selectedRoute && (
        <EditRouteAccessModal
          isOpen={isEditOpen}
          onClose={handleCloseEdit}
          routeAccess={selectedRoute}
          onUpdateStatus={handleUpdateStatus}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
