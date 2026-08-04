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
} from 'lucide-react'
import { createRevolvingColumns } from '../../../config/tables/revolvingColumns'
import CreateRevolvingFundModal from '../../../components/dashboard/revolving/CreateRevolvingFundModal'
import ViewRevolvingFundModal from '../../../components/dashboard/revolving/ViewRevolvingFundModal'
import EditRevolvingFundModal from '../../../components/dashboard/revolving/EditRevolvingFundModal'
import SubmitRevolvingFundModal from '../../../components/dashboard/revolving/SubmitRevolvingFundModal'

export const Route = createFileRoute('/_authenticated/funds/revolving')({
  component: RevolvingFundPage,
})

// Mock Initial Data Structure
const INITIAL_FUNDS = [
  {
    id: 'RF-2026-001',
    name: 'Petty Cash - Main Operations',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    baseCap: 100000.0,
    replenished: 25000.0,
    totalAvailable: 125000.0,
    issued: 60000.0,
    expended: 42500.0,
    returned: 5000.0,
    liquidated: 37500.0,
    unliquidated: 5000.0,
    balance: 65000.0,
    status: 'Active',
  },
  {
    id: 'RF-2026-002',
    name: 'Field Operations Travel Fund',
    startDate: '2026-03-01',
    endDate: '2026-06-30',
    baseCap: 50000.0,
    replenished: 0.0,
    totalAvailable: 50000.0,
    issued: 45000.0,
    expended: 40000.0,
    returned: 2000.0,
    liquidated: 30000.0,
    unliquidated: 10000.0,
    balance: 5000.0,
    status: 'Low Balance',
  },
]

// Helper for Currency Formatting
const formatCurrency = (val) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0)

function RevolvingFundPage() {
  const [funds, setFunds] = useState(INITIAL_FUNDS)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modal State Controls
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedFund, setSelectedFund] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // 'view' | 'edit' | 'submit' | null

  // Action Handlers aligned with table columns
  const handleView = useCallback((row) => {
    setSelectedFund(row)
    setActiveModal('view')
  }, [])

  const handleEdit = useCallback((row) => {
    setSelectedFund(row)
    setActiveModal('edit')
  }, [])

  const handleSubmit = useCallback((row) => {
    setSelectedFund(row)
    setActiveModal('submit')
  }, [])

  const handleCloseModal = useCallback(() => {
    setActiveModal(null)
    setSelectedFund(null)
  }, [])

  // CRUD Operations
  const handleCreateFund = (newFund) => {
    setFunds((prev) => [newFund, ...prev])
    setIsCreateOpen(false)
  }

  const handleSaveEdit = (updatedFund) => {
    setFunds((prev) => prev.map((item) => (item.id === updatedFund.id ? updatedFund : item)))
    handleCloseModal()
  }

  const handleConfirmSubmit = (fundId, reportedDate) => {
    setFunds((prev) =>
      prev.map((item) =>
        item.id === fundId ? { ...item, status: 'Closed', endDate: reportedDate } : item,
      ),
    )
    handleCloseModal()
  }

  // Compute Metrics dynamically based on funds array
  const metrics = useMemo(() => {
    return funds.reduce(
      (acc, fund) => {
        const totalCap = (fund.baseCap || 0) + (fund.replenished || 0)
        acc.totalCapacity += totalCap
        acc.totalIssued += fund.issued || 0
        acc.totalUnliquidated += fund.unliquidated || 0
        acc.totalBalance += fund.balance || 0
        return acc
      },
      { totalCapacity: 0, totalIssued: 0, totalUnliquidated: 0, totalBalance: 0 },
    )
  }, [funds])

  // Filter Logic
  const filteredFunds = useMemo(() => {
    return funds.filter((fund) => {
      const matchesSearch =
        fund.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fund.id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'ALL' || fund.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [funds, searchTerm, statusFilter])

  // Map exact callback properties requested by createRevolvingColumns
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
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Fund
          </button>
        </div>
      </div>

      {/* Dynamic Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <StatCard
          title="Total Fund Capacity"
          value={formatCurrency(metrics.totalCapacity)}
          icon={Vault}
          subtitle="All active funds"
          variant="blue"
        />

        <StatCard
          title="Total Outstanding"
          value={formatCurrency(metrics.totalIssued)}
          icon={HandCoins}
          subtitle="Issued advances"
          variant="amber"
        />

        <StatCard
          title="Unliquidated Advances"
          value={formatCurrency(metrics.totalUnliquidated)}
          icon={AlertCircle}
          trend="Pending OR"
          trendDirection="down"
          subtitle="Action required"
          variant="red"
        />

        <StatCard
          title="Available Balance"
          value={formatCurrency(metrics.totalBalance)}
          icon={Coins}
          subtitle="Unassigned pool"
          variant="emerald"
        />
      </div>

      {/* Table Toolbar & Search Filters */}
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

      {/* Responsive DataTable Container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredFunds}
          keyExtractor={(row) => row.id}
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
      </div>

      {/* Modals */}
      <CreateRevolvingFundModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateFund}
      />

      <ViewRevolvingFundModal
        isOpen={activeModal === 'view'}
        onClose={handleCloseModal}
        fund={selectedFund}
      />

      <EditRevolvingFundModal
        isOpen={activeModal === 'edit'}
        onClose={handleCloseModal}
        fund={selectedFund}
        onSave={handleSaveEdit}
      />

      <SubmitRevolvingFundModal
        isOpen={activeModal === 'submit'}
        onClose={handleCloseModal}
        fund={selectedFund}
        onSubmitReport={handleConfirmSubmit}
      />
    </div>
  )
}
