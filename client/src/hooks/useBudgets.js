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

  // Revolving Funds are the "wallet" boundary for a budget: creating or
  // topping up a fund DEBITS budget.amount and locks that money into the
  // fund's own total_fund/balance (see revolvingFundController.js's
  // upsertRevolvingFund). Once inside a fund, issuing/returning/
  // reimbursing cash to employees (cashDisbursementController.js) is
  // fund-internal and never touches the budget again. So "how much of
  // this budget is currently deployed into Revolving Funds" is the SUM of
  // each fund's total_fund — NOT `outstanding`. `outstanding` only
  // reflects cash currently out with an employee, and using it here made
  // this figure (and Allocated Amount below) climb every time cash was
  // issued, even though no money actually left the budget at that moment.
  const { data: rawRevolvingFunds = [] } = useQuery({
    queryKey: ['revolvingFunds'],
    queryFn: () => revolvingFundApi.getAll(),
  })

  const deployedByBudget = useMemo(() => {
    const totals = {}
    if (!Array.isArray(rawRevolvingFunds)) return totals
    rawRevolvingFunds.forEach((fund) => {
      const budgetId = fund.budget_id
      const deployed = Number(fund.total_fund ?? 0)
      totals[budgetId] = (totals[budgetId] || 0) + deployed
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
      const amount = Number(item.amount ?? item.b_amount ?? 0) // live available balance — the "wallet"
      const status = item.status ?? item.b_status ?? 'ACTIVE'
      const departmentName = getDepartmentName({ ...item, department_id })

      // deployedToFunds = money currently locked inside this budget's
      // Revolving Funds (idle fund balance + whatever's out with
      // employees). It only changes when a fund is created/topped up —
      // never when cash moves fund→employee or back.
      // allocated = amount + deployedToFunds reconstructs the total pool
      // ever allocated to this budget; it stays flat across issue/return/
      // reimburse activity and only moves at fund funding/top-up time or
      // a fresh budget top-up.
      const deployedToFunds = deployedByBudget[id] || 0
      const allocated = amount + deployedToFunds

      return {
        ...item,
        id,
        department_id,
        type,
        amount,
        balance: amount, // alias so the modal's fallback chain also works
        deployedToFunds,
        expended: deployedToFunds, // kept as an alias in case anything else still reads `expended`
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
