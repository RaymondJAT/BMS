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
  Receipt,
  Loader2,
  FileText,
} from 'lucide-react'

import { createRequestColumns } from '../../../config/tables/requestColumns'

// Modal Component Imports (Commented out for frontend-only state)
// import CreateCashRequestModal from '../../../components/dashboard/request/CreateCashRequestModal'
// import ViewCashRequestModal from '../../../components/dashboard/request/ViewCashRequestModal'
// import ApproveCashRequestModal from '../../../components/dashboard/request/ApproveCashRequestModal'
// import DisburseCashRequestModal from '../../../components/dashboard/request/DisburseCashRequestModal'

// Custom Hooks
import useCashRequests from '../../../hooks/useCashRequests'
import useCashRequestForm from '../../../hooks/useCashRequestForm'
import useBudgets from '../../../hooks/useBudgets'

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
  const userRole = 'ADMINISTRATOR'

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Fetch Budget context for resolving department / fund labels
  const { budgets = [], getDepartmentName, isLoading: isBudgetsLoading } = useBudgets()

  // Primary Data Hook
  const {
    requests = [],
    metrics = {},
    isLoading,
    error,
    fetchCashRequests,
    approveRequest,
    disburseRequest,
  } = useCashRequests({ role: userRole })

  // Creation Modal Hook
  const {
    isModalOpen: isCreateOpen,
    formData,
    setFormData,
    handleOpenModal: handleOpenCreateModal,
    handleCloseModal: handleCloseCreateModal,
    handleSubmit: handleCreateSubmit,
    isSubmitting: isCreating,
  } = useCashRequestForm()

  // Modal State Control
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isDisburseOpen, setIsDisburseOpen] = useState(false)

  // Resolve Department or Fund origin label for request rows
  const getRequestBudgetLabel = useCallback(
    (row) => {
      const budgetId = row?.budget_id
      const budget = budgets.find((b) => String(b.id) === String(budgetId))
      if (!budget) return `Budget #${budgetId ?? 'N/A'}`

      const deptName = getDepartmentName
        ? getDepartmentName(budget)
        : `Dept #${budget.department_id}`
      return budget.type ? `${deptName} — ${budget.type}` : deptName
    },
    [budgets, getDepartmentName],
  )

  // Action Handlers
  const handleView = useCallback((row) => {
    setSelectedRequest(row)
    setIsViewOpen(true)
  }, [])

  const handleCloseView = useCallback(() => {
    setIsViewOpen(false)
    setSelectedRequest(null)
  }, [])

  const handleApproveAction = useCallback((row) => {
    setSelectedRequest(row)
    setIsApproveOpen(true)
  }, [])

  const handleCloseApprove = useCallback(() => {
    setIsApproveOpen(false)
    setSelectedRequest(null)
  }, [])

  const handleConfirmApprove = useCallback(
    async (payload) => {
      if (approveRequest) {
        await approveRequest(selectedRequest?.id, payload)
      }
      handleCloseApprove()
    },
    [approveRequest, selectedRequest, handleCloseApprove],
  )

  const handleDisburseAction = useCallback((row) => {
    setSelectedRequest(row)
    setIsDisburseOpen(true)
  }, [])

  const handleCloseDisburse = useCallback(() => {
    setIsDisburseOpen(false)
    setSelectedRequest(null)
  }, [])

  const handleConfirmDisburse = useCallback(
    async (payload) => {
      if (disburseRequest) {
        await disburseRequest(selectedRequest?.id, payload)
      }
      handleCloseDisburse()
    },
    [disburseRequest, selectedRequest, handleCloseDisburse],
  )

  // Filtering Logic
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const voucherNo = String(req.cash_voucher || req.id || '')
      const requesterName = String(req.requester_name || '')
      const purpose = String(req.purpose || '')

      const matchesSearch =
        voucherNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purpose.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'ALL' ||
        String(req.status || '').toUpperCase() === statusFilter.toUpperCase()

      return matchesSearch && matchesStatus
    })
  }, [requests, searchTerm, statusFilter])

  // Table Columns
  const columns = useMemo(
    () =>
      createRequestColumns({
        userRole,
        onView: handleView,
        onApprove: handleApproveAction,
        onDisburse: handleDisburseAction,
        getBudgetLabel: getRequestBudgetLabel,
      }),
    [userRole, handleView, handleApproveAction, handleDisburseAction, getRequestBudgetLabel],
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
            Process petty cash requisitions, approval pipelines, fund disbursements, and receipt
            liquidations.
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
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Cash Request
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        <StatCard
          title="Total Requested"
          value={formatCurrency(metrics?.totalRequested)}
          icon={FileText}
          subtitle="All active requests"
          variant="blue"
        />

        <StatCard
          title="Pending Approval"
          value={metrics?.pendingCount || 0}
          icon={Clock}
          subtitle="Awaiting L1/L2 Action"
          variant="amber"
        />

        <StatCard
          title="Ready for Cash"
          value={formatCurrency(metrics?.approvedAmount)}
          icon={CheckCircle2}
          subtitle="Approved; queue disburse"
          variant="emerald"
        />

        <StatCard
          title="Disbursed"
          value={formatCurrency(metrics?.disbursedAmount)}
          icon={Banknote}
          subtitle="Issued advances"
          variant="blue"
        />

        <StatCard
          title="Unliquidated"
          value={formatCurrency(metrics?.unliquidatedAmount)}
          icon={Receipt}
          subtitle="Pending receipts"
          variant="red"
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-xl border border-slate-200/80 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Voucher, Requester, Purpose..."
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
              <option value="PENDING_TL">Pending Team Leader</option>
              <option value="PENDING_CUSTODIAN">Pending Custodian</option>
              <option value="APPROVED">Approved</option>
              <option value="DISBURSED">Disbursed</option>
              <option value="PENDING_LIQUIDATION">Pending Liquidation</option>
              <option value="LIQUIDATED">Liquidated</option>
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
            keyExtractor={(row) => row.id || row.cash_voucher}
            maxHeight="h-full"
            containerClassName="h-full flex flex-col min-h-0"
            emptyMessage={
              searchTerm || statusFilter !== 'ALL'
                ? 'No cash requests match your filter criteria.'
                : 'No cash requests found.'
            }
            footer={
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Showing {filteredRequests.length} entries</span>
                <span>Fiscal Year 2026</span>
              </div>
            }
          />
        )}
      </div>

      {/* Modals (Commented out for frontend-only state) */}
      {/* 
      <CreateCashRequestModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreateModal}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateSubmit}
        isSubmitting={isCreating}
        budgets={budgets}
        isBudgetsLoading={isBudgetsLoading}
      />

      <ViewCashRequestModal
        isOpen={isViewOpen}
        onClose={handleCloseView}
        request={selectedRequest}
        getBudgetLabel={getRequestBudgetLabel}
      />

      <ApproveCashRequestModal
        isOpen={isApproveOpen}
        onClose={handleCloseApprove}
        request={selectedRequest}
        onConfirm={handleConfirmApprove}
        getBudgetLabel={getRequestBudgetLabel}
      />

      <DisburseCashRequestModal
        isOpen={isDisburseOpen}
        onClose={handleCloseDisburse}
        request={selectedRequest}
        onConfirm={handleConfirmDisburse}
        getBudgetLabel={getRequestBudgetLabel}
      /> 
      */}
    </div>
  )
}
