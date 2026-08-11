import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import budgetApi from '../api/budgetApi'
import departmentApi from '../api/departmentApi'
import revolvingFundApi from '../api/revolvingFundApi'

function useBudgets() {
  const queryClient = useQueryClient()

  const {
    data: rawBudgets = [],
    isLoading,
    error,
    refetch: fetchBudgets,
  } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetApi.getAll,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentApi.getAll,
  })

  // Revolving Funds are the live link between a budget and how much of it
  // is currently deployed. A fund's outstanding amount is kept in sync by
  // every issue/return/reimburse action on Cash Disbursement, so summing
  // outstanding per budget_id gives an always-current "expended" figure —
  // there's no separate column on Budget itself for this.
  const { data: rawRevolvingFunds = [] } = useQuery({
    queryKey: ['revolvingFunds'],
    queryFn: () => revolvingFundApi.getAll(),
  })

  const deployedByBudget = useMemo(() => {
    const totals = {}
    if (!Array.isArray(rawRevolvingFunds)) return totals
    rawRevolvingFunds.forEach((fund) => {
      const budgetId = fund.budget_id
      const outstanding = Number(fund.outstanding ?? 0)
      totals[budgetId] = (totals[budgetId] || 0) + outstanding
    })
    return totals
  }, [rawRevolvingFunds])

  const getDepartmentName = useCallback(
    (row) => {
      if (row?.department?.name) return row.department.name
      if (row?.department_name) return row.department_name
      const matched = departments.find((d) => String(d.id) === String(row?.department_id))
      return matched?.name || `Department #${row?.department_id ?? 'N/A'}`
    },
    [departments],
  )

  // Normalize raw b_-prefixed columns into plain fields the UI expects
  const budgets = useMemo(() => {
    if (!Array.isArray(rawBudgets)) return []
    return rawBudgets.map((item) => {
      const id = item.id ?? item.b_id
      const department_id = item.department_id ?? item.b_department_id
      const type = item.type ?? item.b_type
      const amount = Number(item.amount ?? item.b_amount ?? 0) // live available balance
      const status = item.status ?? item.b_status ?? 'ACTIVE'
      const departmentName = getDepartmentName({ ...item, department_id })

      // "amount" is the live balance already net of anything issued to a
      // Revolving Fund, so it represents what's AVAILABLE right now, not
      // the total pool size. Reconstruct the total pool at this moment as
      // available + currently deployed, so Allocated/Expended/Remaining
      // and the Utilization bar are all internally consistent.
      const expended = deployedByBudget[id] || 0
      const allocated = amount + expended

      return {
        ...item,
        id,
        department_id,
        type,
        amount,
        balance: amount, // alias so the modal's fallback chain also works
        expended,
        allocated,
        status,
        name: `${departmentName} — ${type}`,
      }
    })
  }, [rawBudgets, getDepartmentName, deployedByBudget])

  const deleteMutation = useMutation({
    mutationFn: (id) => budgetApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete budget record.')
    },
  })

  const handleDelete = (row, e) => {
    e?.stopPropagation?.()
    const deptName = getDepartmentName(row)
    if (window.confirm(`Are you sure you want to delete budget allocation for ${deptName}?`)) {
      deleteMutation.mutate(row.id)
    }
  }

  return {
    budgets,
    departments,
    isLoading,
    error: error ? error.response?.data?.message || 'Failed to load budget records.' : null,
    fetchBudgets,
    getDepartmentName,
    handleDelete,
    isDeleting: deleteMutation.isPending,
  }
}

export default useBudgets
