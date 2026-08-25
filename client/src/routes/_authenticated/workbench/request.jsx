import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import DataTable from '../../../components/ui/DataTable'
import StatCard from '../../../components/ui/StatCard'
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Loader2,
  FileText,
} from 'lucide-react'

import { createRequestColumns } from '../../../config/tables/requestColumns'

import CreateCashRequestModal from '../../../components/dashboard/request/CreateCashRequestModal'
import ViewCashRequestModal from '../../../components/dashboard/request/ViewCashRequestModal'
import ApproveCashRequestModal from '../../../components/dashboard/request/ApproveCashRequestModal'
import DisburseCashRequestModal from '../../../components/dashboard/request/DisburseCashRequestModal'

import useCashRequests from '../../../hooks/useCashRequests'
import { useCashDisbursementLookups } from '../../../hooks/useCashDisbursementLookups'

export const Route = createFileRoute('/_authenticated/workbench/request')({
  component: CashRequestPage,
})

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0)

function CashRequestPage() {
  // TODO: replace with the real authenticated user's role + employee id
  // once auth is wired up. 'ADMINISTRATOR' satisfies the Requester,
  // Approve, and Complete gates in requestColumns.js so every stage of
  // the workflow is visible/testable before RBAC lands. currentEmployeeId
  // is what requestColumns.js uses to decide row ownership for Edit —
  // wire it to the real logged-in employee id once available.
  const userRole = 'ADMINISTRATOR'
  const currentEmployeeId = null

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedIds, setSelectedIds] = useState([])

  const {
    revolvingFunds,
    departments,
    employees,
    particulars,
    getDepartmentName,
    getEmployeeName,
    getFundLabel,
  } = useCashDisbursementLookups()

  const {
    requests = [],
    metrics = {},
    isLoading,
    isMutating,
    error,
    fetchCashRequests,
    createRequest,
    editRequest,
    approveRequest,
    rejectRequest,
    disburseRequest,
  } = useCashRequests({ role: userRole })

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // 'view' | 'approve' | 'disburse'

  const handleView = useCallback((row) => {
    setSelectedRequest(row)
    setActiveModal('view')
  }, [])

  const handleEdit = useCallback((row) => {
    setEditingRequest(row)
    setIsCreateOpen(true)
  }, [])

  const handleApproveAction = useCallback((row) => {
    setSelectedRequest(row)
    setActiveModal('approve')
  }, [])

  const handleDisburseAction = useCallback((row) => {
    setSelectedRequest(row)
    setActiveModal('disburse')
  }, [])

  const handleCloseModal = useCallback(() => {
    setActiveModal(null)
    setSelectedRequest(null)
  }, [])

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateOpen(false)
    setEditingRequest(null)
  }, [])

  const handleSelectionChange = useCallback((keys) => {
    setSelectedIds(keys)
  }, [])

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchTerm.toLowerCase()
      const requesterName = getEmployeeName(req.employee_id).toLowerCase()

      const matchesSearch =
        (req.reference_id || '').toLowerCase().includes(q) ||
        (req.project || '').toLowerCase().includes(q) ||
        (req.purpose || '').toLowerCase().includes(q) ||
        requesterName.includes(q)

      const matchesStatus =
        statusFilter === 'ALL' || String(req.status || '').toUpperCase() === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [requests, searchTerm, statusFilter, getEmployeeName])

  const columns = useMemo(
    () =>
      createRequestColumns({
        userRole,
        currentEmployeeId,
        onView: handleView,
        onEdit: handleEdit,
        onApprove: handleApproveAction,
        onComplete: handleDisburseAction,
        getEmployeeName,
        getDepartmentName,
        getFundLabel,
      }),
    [
      userRole,
      currentEmployeeId,
      handleView,
      handleEdit,
      handleApproveAction,
      handleDisburseAction,
      getEmployeeName,
      getDepartmentName,
      getFundLabel,
    ],
  )

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Cash Requests & Advances
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Submit cash requisitions and process the Team Leader approval and Fund Custodian
            disbursement pipeline.
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

          <button
            type="button"
            onClick={() => {
              setEditingRequest(null)
              setIsCreateOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Cash Request
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <StatCard
          title="Total Requested"
          value={formatCurrency(metrics?.totalRequested)}
          icon={FileText}
          subtitle="Excludes rejected"
          variant="blue"
        />
        <StatCard
          title="Pending Team Leader"
          value={metrics?.pendingCount || 0}
          icon={Clock}
          subtitle="Awaiting first approval"
          variant="amber"
        />
        <StatCard
          title="Pending Fund Custodian"
          value={formatCurrency(metrics?.approvedAmount)}
          icon={CheckCircle2}
          subtitle="Team Leader approved"
          variant="emerald"
        />
        <StatCard
          title="Completed"
          value={formatCurrency(metrics?.completedAmount)}
          icon={Banknote}
          subtitle="Disbursed to date"
          variant="blue"
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-xl border border-slate-200/80 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Reference, Project, Purpose, Requester..."
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
              <option value="PENDING">Pending Team Leader</option>
              <option value="APPROVED">Pending Fund Custodian</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200/80 p-6">
            <Loader2 className="w-6 h-6 text-[#E31837] animate-spin mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading cash requests...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-rose-200 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">Error Loading Data</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {typeof error === 'string'
                ? error
                : error?.message || 'Failed to fetch cash requests.'}
            </p>
            <button
              type="button"
              onClick={() => fetchCashRequests?.()}
              className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredRequests}
            keyExtractor={(row) => row.id}
            selectable={true}
            selectedRows={selectedIds}
            onSelectionChange={handleSelectionChange}
            maxHeight="h-full"
            containerClassName="h-full flex flex-col min-h-0"
            emptyMessage={
              searchTerm || statusFilter !== 'ALL'
                ? 'No cash requests match your filter criteria.'
                : 'No cash requests found.'
            }
            footer={
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>
                  Showing {filteredRequests.length} entries
                  {selectedIds.length > 0 && ` (${selectedIds.length} selected)`}
                </span>
                <span>Fiscal Year 2026</span>
              </div>
            }
          />
        )}
      </div>

      {/* Modals */}
      {isCreateOpen && (
        <CreateCashRequestModal
          isOpen={isCreateOpen}
          onClose={handleCloseCreateModal}
          onCreate={createRequest}
          onUpdate={(payload) => editRequest(payload.id, payload)}
          isSubmitting={isMutating}
          employees={employees}
          departments={departments}
          editingRequest={editingRequest}
        />
      )}

      {activeModal === 'view' && selectedRequest && (
        <ViewCashRequestModal
          isOpen
          onClose={handleCloseModal}
          request={selectedRequest}
          getEmployeeName={getEmployeeName}
          getDepartmentName={getDepartmentName}
          getFundLabel={getFundLabel}
        />
      )}

      {activeModal === 'approve' && selectedRequest && (
        <ApproveCashRequestModal
          isOpen
          onClose={handleCloseModal}
          request={selectedRequest}
          onApprove={(payload) => approveRequest(selectedRequest.id, payload)}
          onReject={(payload) => rejectRequest(selectedRequest.id, payload)}
          isSubmitting={isMutating}
          getDepartmentName={getDepartmentName}
          getEmployeeName={getEmployeeName}
        />
      )}

      {activeModal === 'disburse' && selectedRequest && (
        <DisburseCashRequestModal
          isOpen
          onClose={handleCloseModal}
          request={selectedRequest}
          particulars={particulars}
          revolvingFunds={revolvingFunds}
          onDisburse={(payload) => disburseRequest(selectedRequest.id, payload)}
          onReject={(payload) => rejectRequest(selectedRequest.id, payload)}
          isSubmitting={isMutating}
          getFundLabel={getFundLabel}
          getDepartmentName={getDepartmentName}
          getEmployeeName={getEmployeeName}
        />
      )}
    </div>
  )
}
