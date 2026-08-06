import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import DataTable from '../../../components/ui/DataTable'
import StatCard from '../../../components/ui/StatCard'
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Vault,
  HandCoins,
  AlertCircle,
  Coins,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { createRevolvingColumns } from '../../../config/tables/revolvingColumns'
import CreateRevolvingFundModal from '../../../components/dashboard/revolving/CreateRevolvingFundModal'
import ViewRevolvingFundModal from '../../../components/dashboard/revolving/ViewRevolvingFundModal'
import EditRevolvingFundModal from '../../../components/dashboard/revolving/EditRevolvingFundModal'
import SubmitRevolvingFundModal from '../../../components/dashboard/revolving/SubmitRevolvingFundModal'

import useRevolvingFunds from '../../../hooks/useRevolvingFunds'
import useRevolvingFundForm from '../../../hooks/useRevolvingFundForm'
import useRevolvingFundActivity from '../../../hooks/useRevolvingFundActivity'
import useCloseRevolvingFund from '../../../hooks/useCloseRevolvingFund'
import useBudgets from '../../../hooks/useBudgets'

export const Route = createFileRoute('/_authenticated/funds/revolving')({
  component: RevolvingFundPage,
})

// Helper for Currency Formatting
const formatCurrency = (val) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0)

function RevolvingFundPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Fetch budget pool options for fund creation
  const { budgets = [], isLoading: isBudgetsLoading } = useBudgets()

  // React Query / Custom Hooks
  const { funds = [], metrics = {}, isLoading, error, fetchRevolvingFunds } = useRevolvingFunds()
  const {
    isModalOpen: isCreateOpen,
    formData,
    setFormData,
    handleOpenModal: handleOpenCreateModal,
    handleCloseModal: handleCloseCreateModal,
    handleSubmit: handleCreateSubmit,
    isSubmitting: isCreating,
  } = useRevolvingFundForm()

  const {
    activityModalFund,
    activityLogs,
    isActivityLoading,
    handleOpenActivityModal,
    handleCloseActivityModal,
  } = useRevolvingFundActivity()

  const {
    closeModalFund,
    isClosing,
    handleOpenCloseModal,
    handleCloseModal: handleCloseSubmitModal,
    handleConfirmClose,
  } = useCloseRevolvingFund()

  // Additional Modal States
  const [selectedEditFund, setSelectedEditFund] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Action Handlers bound to table action buttons
  const handleView = useCallback(
    (row, e) => {
      handleOpenActivityModal(row, e)
    },
    [handleOpenActivityModal],
  )

  const handleEdit = useCallback((row) => {
    setSelectedEditFund(row)
    setIsEditOpen(true)
  }, [])

  const handleSubmit = useCallback(
    (row, e) => {
      handleOpenCloseModal(row, e)
    },
    [handleOpenCloseModal],
  )

  const handleCloseEditModal = useCallback(() => {
    setIsEditOpen(false)
    setSelectedEditFund(null)
  }, [])

  // Dynamic Search & Status Filtering
  const filteredFunds = useMemo(() => {
    return funds.filter((fund) => {
      const fundName = String(fund.name || fund.fund_name || '')
      const fundId = String(fund.id || fund.revolving_fund_id || '')

      const matchesSearch =
        fundName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fundId.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'ALL' ||
        String(fund.status || '').toUpperCase() === statusFilter.toUpperCase()

      return matchesSearch && matchesStatus
    })
  }, [funds, searchTerm, statusFilter])

  // Table Columns Definition
  const columns = useMemo(
    () =>
      createRevolvingColumns({
        onView: handleView,
        onEdit: handleEdit,
        onSubmit: handleSubmit,
      }),
    [handleView, handleEdit, handleSubmit],
  )

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Revolving Funds
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage custodial petty cash, advance disbursements, liquidations, and replenishment
            cycles.
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
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Fund
          </button>
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        <StatCard
          title="Total Capacity"
          value={formatCurrency(metrics?.totalCapacity)}
          icon={Vault}
          subtitle="All active funds"
          variant="blue"
        />

        <StatCard
          title="Disbursed"
          value={formatCurrency(metrics?.totalIssued)}
          icon={HandCoins}
          subtitle="Issued advances"
          variant="amber"
        />

        <StatCard
          title="Liquidated"
          value={formatCurrency(metrics?.totalLiquidated)}
          icon={CheckCircle2}
          subtitle="Verified with receipts"
          variant="emerald"
        />

        <StatCard
          title="Unliquidated"
          value={formatCurrency(metrics?.totalUnliquidated)}
          icon={AlertCircle}
          subtitle="Pending receipts"
          variant="red"
        />

        <StatCard
          title="Available Balance"
          value={formatCurrency(metrics?.totalBalance)}
          icon={Coins}
          subtitle="Unassigned pool"
          variant="emerald"
        />
      </div>

      {/* Table Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-xl border border-slate-200/80 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Fund ID or Name..."
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
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Low Balance">Low Balance</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main DataTable / Loading / Error Container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200/80 p-6">
            <Loader2 className="w-6 h-6 text-[#E31837] animate-spin mb-2" />
            <p className="text-xs font-medium text-slate-500">Loading revolving funds...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-rose-200 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-sm font-bold text-slate-800">Error Loading Data</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {typeof error === 'string'
                ? error
                : error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => fetchRevolvingFunds?.()}
              className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredFunds}
            keyExtractor={(row) => row.id || row.revolving_fund_id}
            maxHeight="h-full"
            containerClassName="h-full flex flex-col min-h-0"
            emptyMessage={
              searchTerm || statusFilter !== 'ALL'
                ? 'No revolving funds match your search filter.'
                : 'No revolving funds found.'
            }
            footer={
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Showing {filteredFunds.length} entries</span>
                <span>Fiscal Year 2026</span>
              </div>
            }
          />
        )}
      </div>

      {/* Modals Wired to Custom Hooks */}
      <CreateRevolvingFundModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreateModal}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateSubmit}
        isSubmitting={isCreating}
        budgets={budgets}
        isBudgetsLoading={isBudgetsLoading}
      />

      <ViewRevolvingFundModal
        isOpen={Boolean(activityModalFund)}
        onClose={handleCloseActivityModal}
        fund={activityModalFund}
        logs={activityLogs}
        isLoading={isActivityLoading}
      />

      <EditRevolvingFundModal
        isOpen={isEditOpen}
        onClose={handleCloseEditModal}
        fund={selectedEditFund}
      />

      <SubmitRevolvingFundModal
        isOpen={Boolean(closeModalFund)}
        onClose={handleCloseSubmitModal}
        fund={closeModalFund}
        onSubmitReport={handleConfirmClose}
        isSubmitting={isClosing}
      />
    </div>
  )
}
