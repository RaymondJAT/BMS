import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import DataTable from '../../../components/ui/DataTable'
import StatCard from '../../../components/ui/StatCard'
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  HandCoins,
  AlertCircle,
  Receipt,
  RotateCcw,
} from 'lucide-react'
import { createDisbursementColumns } from '../../../config/tables/disbursementColumns'
import CreateCashDisbursementModal from '../../../components/dashboard/disbursement/CreateCashDisbursementModal'
// import ViewCashDisbursementModal from '../../../components/dashboard/disbursements/ViewCashDisbursementModal'
import EditCashDisbursementModal from '../../../components/dashboard/disbursement/EditCashDisbursementModal'
import SubmitCashDisbursementModal from '../../../components/dashboard/disbursement/SubmitCashDisbursementModal'

export const Route = createFileRoute('/_authenticated/funds/disbursements')({
  component: DisbursementsPage,
})

// Mock Initial Data Structure
const INITIAL_DISBURSEMENTS = [
  {
    id: 'CD-2026-001',
    voucherNo: 'CV-10023',
    fundName: 'Petty Cash - Main Operations',
    dateIssued: '2026-08-01',
    dateLiquidated: '2026-08-04',
    receivedBy: 'Jane Doe',
    department: 'Human Resources',
    particulars: 'Office Supplies and Emergency Courier',
    amountIssued: 15000.0,
    amountExpended: 12500.0,
    amountReturned: 2500.0,
    outstandingAmount: 0.0,
    status: 'Liquidated',
  },
  {
    id: 'CD-2026-002',
    voucherNo: 'CV-10024',
    fundName: 'Field Operations Travel Fund',
    dateIssued: '2026-08-03',
    dateLiquidated: null,
    receivedBy: 'Mark Smith',
    department: 'Logistics',
    particulars: 'Fuel and Vehicle Maintenance',
    amountIssued: 25000.0,
    amountExpended: 0.0,
    amountReturned: 0.0,
    outstandingAmount: 25000.0,
    status: 'Issued',
  },
]

// Helper for Currency Formatting
const formatCurrency = (val) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0)

function DisbursementsPage() {
  const [disbursements, setDisbursements] = useState(INITIAL_DISBURSEMENTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modal State Controls
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedDisbursement, setSelectedDisbursement] = useState(null)
  const [activeModal, setActiveModal] = useState(null)

  // Action Handlers for Table Operations
  const handleView = useCallback((row) => {
    setSelectedDisbursement(row)
    setActiveModal('view')
  }, [])

  const handleEdit = useCallback((row) => {
    setSelectedDisbursement(row)
    setActiveModal('edit')
  }, [])

  const handleSubmit = useCallback((row) => {
    setSelectedDisbursement(row)
    setActiveModal('submit')
  }, [])

  const handleCloseModal = useCallback(() => {
    setActiveModal(null)
    setSelectedDisbursement(null)
  }, [])

  // CRUD Mutations
  const handleCreateDisbursement = useCallback((newRecord) => {
    setDisbursements((prev) => [newRecord, ...prev])
    setIsCreateOpen(false)
  }, [])

  const handleSaveEdit = useCallback(
    (updatedRecord) => {
      setDisbursements((prev) =>
        prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item)),
      )
      handleCloseModal()
    },
    [handleCloseModal],
  )

  const handleSubmitLiquidation = useCallback(
    (liquidatedRecord) => {
      setDisbursements((prev) =>
        prev.map((item) => (item.id === liquidatedRecord.id ? liquidatedRecord : item)),
      )
      handleCloseModal()
    },
    [handleCloseModal],
  )

  // Metrics calculation matching header density
  const metrics = useMemo(() => {
    return disbursements.reduce(
      (acc, item) => {
        acc.totalIssued += item.amountIssued || 0
        acc.totalExpended += item.amountExpended || 0
        acc.totalReturned += item.amountReturned || 0
        acc.totalOutstanding += item.outstandingAmount || 0
        return acc
      },
      {
        totalIssued: 0,
        totalExpended: 0,
        totalReturned: 0,
        totalOutstanding: 0,
      },
    )
  }, [disbursements])

  // Filter Logic
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter((item) => {
      const q = searchTerm.toLowerCase()
      const matchesSearch =
        item.voucherNo?.toLowerCase().includes(q) ||
        item.fundName?.toLowerCase().includes(q) ||
        item.receivedBy?.toLowerCase().includes(q) ||
        item.department?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [disbursements, searchTerm, statusFilter])

  const columns = useMemo(
    () =>
      createDisbursementColumns({
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
            Cash Disbursements
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Track vouchers, payee liquidations, cash returns, and unliquidated advances.
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
            New Disbursement
          </button>
        </div>
      </div>

      {/* Dynamic Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        <StatCard
          title="Total Issued"
          value={formatCurrency(metrics.totalIssued)}
          icon={HandCoins}
          subtitle="All cash vouchers"
          variant="amber"
        />

        <StatCard
          title="Total Expended"
          value={formatCurrency(metrics.totalExpended)}
          icon={Receipt}
          subtitle="Liquidated expenses"
          variant="emerald"
        />

        <StatCard
          title="Cash Returned"
          value={formatCurrency(metrics.totalReturned)}
          icon={RotateCcw}
          subtitle="Unused fund returns"
          variant="blue"
        />

        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(metrics.totalOutstanding)}
          icon={AlertCircle}
          subtitle="Pending settlement"
          variant="red"
        />
      </div>

      {/* Table Toolbar & Search Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-xl border border-slate-200/80 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Voucher, Payee, or Department..."
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
              <option value="Issued">Issued</option>
              <option value="Liquidated">Liquidated</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive DataTable Container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredDisbursements}
          keyExtractor={(row) => row.id}
          maxHeight="h-full"
          containerClassName="h-full flex flex-col min-h-0"
          emptyMessage={
            searchTerm || statusFilter !== 'ALL'
              ? 'No cash disbursements match your search filter.'
              : 'No cash disbursements found.'
          }
          footer={
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Showing {filteredDisbursements.length} entries</span>
              <span>Fiscal Year 2026</span>
            </div>
          }
        />
      </div>

      {/* Modals Integration */}
      {isCreateOpen && (
        <CreateCashDisbursementModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateDisbursement}
        />
      )}

      {/* {activeModal === 'view' && selectedDisbursement && (
        <ViewCashDisbursementModal
          isOpen={activeModal === 'view'}
          onClose={handleCloseModal}
          disbursement={selectedDisbursement}
        />
      )} */}

      {activeModal === 'edit' && selectedDisbursement && (
        <EditCashDisbursementModal
          isOpen={activeModal === 'edit'}
          onClose={handleCloseModal}
          disbursement={selectedDisbursement}
          onSave={handleSaveEdit}
        />
      )}

      {activeModal === 'submit' && selectedDisbursement && (
        <SubmitCashDisbursementModal
          isOpen={activeModal === 'submit'}
          onClose={handleCloseModal}
          disbursement={selectedDisbursement}
          onSubmit={handleSubmitLiquidation}
        />
      )}
    </div>
  )
}
