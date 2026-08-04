import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import DataTable from '../../../components/ui/DataTable'
import { Plus, Search, Loader2 } from 'lucide-react'
import { apiClient } from '../../../api/axios'

import { createBudgetColumns } from '../../../config/tables/budgetColumns'
import BudgetFormModal from '../../../components/dashboard/budget/BudgetFormModal'
import BudgetHistoryModal from '../../../components/dashboard/budget/BudgetHistoryModal'

export const Route = createFileRoute('/_authenticated/funds/budget')({
  component: RouteComponent,
})

function RouteComponent() {
  const [budgets, setBudgets] = useState([])
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Upsert Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    department_id: '',
    type: 'CASH',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
  })

  // History Modal State
  const [historyModalBudget, setHistoryModalBudget] = useState(null)
  const [historyLogs, setHistoryLogs] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  // Resolve department name for a budget row
  const getDepartmentName = useCallback(
    (row) => {
      if (row?.department?.name) return row.department.name
      if (row?.department_name) return row.department_name

      const matched = departments.find((d) => String(d.id) === String(row?.department_id))
      return matched?.name || `Department #${row?.department_id ?? 'N/A'}`
    },
    [departments],
  )

  // Fetch Active Budgets & Departments
  const fetchBudgets = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [budgetRes, deptRes] = await Promise.allSettled([
        apiClient.get('/budget-budget'),
        apiClient.get('/master-department'),
      ])

      if (budgetRes.status === 'fulfilled') {
        setBudgets(budgetRes.value.data || [])
      } else {
        throw budgetRes.reason
      }

      if (deptRes.status === 'fulfilled') {
        setDepartments(deptRes.value.data || [])
      } else {
        console.error('Failed to fetch departments:', deptRes.reason)
      }
    } catch (err) {
      console.error('Failed to fetch budgets:', err)
      setError(err.response?.data?.message || 'Failed to load budget records.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  // Open Upsert Modal
  const handleOpenModal = (budget = null) => {
    if (budget) {
      setSelectedBudget(budget)
      setFormData({
        department_id: budget.department_id || '',
        type: budget.type || 'CASH',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: '',
      })
    } else {
      setSelectedBudget(null)
      setFormData({
        department_id: '',
        type: 'CASH',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        remarks: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBudget(null)
  }

  // Fetch and Open History Modal
  const handleOpenHistoryModal = async (row, e) => {
    e?.stopPropagation?.()
    setHistoryModalBudget(row)
    setIsHistoryLoading(true)
    setHistoryError(null)
    setHistoryLogs([])

    try {
      const response = await apiClient.get('/budget-budget/history', {
        params: { budget_id: row.id },
      })
      setHistoryLogs(response.data || [])
    } catch (err) {
      console.error('Failed to fetch history:', err)
      setHistoryError(err.response?.data?.message || 'Failed to load audit history logs.')
    } finally {
      setIsHistoryLoading(false)
    }
  }

  const handleCloseHistoryModal = () => {
    setHistoryModalBudget(null)
    setHistoryLogs([])
  }

  // Upsert Submit
  const handleSubmit = async (e) => {
    e.preventDefault()

    const parsedAmount = parseFloat(formData.amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than zero.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        amount: parsedAmount,
        ...(selectedBudget ? { id: selectedBudget.id } : {}),
      }

      await apiClient.post('/budget-budget', payload)
      await fetchBudgets()
      handleCloseModal()
    } catch (err) {
      console.error('Error saving budget:', err)
      alert(err.response?.data?.message || 'Error processing budget request')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Soft Delete Handler
  const handleDelete = async (row, e) => {
    e?.stopPropagation?.()
    const deptName = getDepartmentName(row)
    if (!window.confirm(`Are you sure you want to delete budget allocation for ${deptName}?`)) {
      return
    }

    try {
      await apiClient.delete(`/budget-budget/${row.id}`)
      setBudgets((prev) => prev.filter((item) => item.id !== row.id))
    } catch (err) {
      console.error('Failed to delete budget:', err)
      alert(err.response?.data?.message || 'Failed to delete budget record.')
    }
  }

  const filteredBudgets = budgets.filter((item) => {
    const term = searchTerm.toLowerCase()
    const deptName = getDepartmentName(item).toLowerCase()
    const deptId = (item.department_id ?? '').toString().toLowerCase()
    const code = (item.id ?? '').toString().toLowerCase()
    const type = (item.type ?? '').toString().toLowerCase()

    return (
      deptName.includes(term) || deptId.includes(term) || code.includes(term) || type.includes(term)
    )
  })

  const columns = createBudgetColumns({
    getDepartmentName,
    onViewHistory: handleOpenHistoryModal,
    onEdit: (row) => handleOpenModal(row),
    onDelete: handleDelete,
  })

  return (
    <div className="w-full h-full flex-1 flex flex-col min-h-0 space-y-3 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Budget Management
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Overview of department allocations, expenses, and transaction logs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E31837] hover:bg-[#c4122e] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Allocation
          </button>
        </div>
      </div>

      {/* Table Toolbar & Search Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white py-2 px-3 rounded-xl border border-slate-200/80 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search department, ID, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl shrink-0">
          {error}
        </div>
      )}

      {/* Live Data Table Container */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-5 h-5 animate-spin text-[#E31837]" />
            <span className="ml-2 text-xs font-semibold text-slate-600">
              Loading budget records...
            </span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredBudgets}
            keyExtractor={(row) => row.id}
            maxHeight="h-full"
            containerClassName="h-full flex flex-col min-h-0"
            emptyMessage={
              searchTerm
                ? 'No budget records match your search query.'
                : 'No active budget allocations found.'
            }
            footer={
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Showing {filteredBudgets.length} entries</span>
                <span>Fiscal Year 2026</span>
              </div>
            }
          />
        )}
      </div>

      {/* Modal Components */}
      <BudgetFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        departments={departments}
        selectedBudget={selectedBudget}
      />

      <BudgetHistoryModal
        budget={historyModalBudget}
        logs={historyLogs}
        isLoading={isHistoryLoading}
        error={historyError}
        onClose={handleCloseHistoryModal}
        getDepartmentName={getDepartmentName}
      />
    </div>
  )
}
