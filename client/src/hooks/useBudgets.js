import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import budgetApi from '../api/budgetApi'
import departmentApi from '../api/departmentApi'

/**
 * The backend (budgetController.js's getBudgetBudget) now returns every
 * derived financial figure already computed server-side and LIVE — from
 * the actual revolving_fund / cash_disbursement rows, never from a
 * manually incremented counter:
 *   beginning_amount, additional_allocation, total_budget,
 *   deployed_to_revolving_funds, remaining_budget, utilization_percent,
 *   cash_disbursement_utilized, cash_disbursement_utilization_percent
 *
 * This hook no longer needs its own separate Revolving Fund fetch or
 * client-side aggregation for those figures — it just attaches the
 * department display name and a couple of back-compat aliases for any
 * older consumer still reading `allocated` / `deployedToFunds`.
 */
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

  const getDepartmentName = useCallback(
    (row) => {
      if (row?.department?.name) return row.department.name
      if (row?.department_name) return row.department_name
      const matched = departments.find((d) => String(d.id) === String(row?.department_id))
      return matched?.name || `Department #${row?.department_id ?? 'N/A'}`
    },
    [departments],
  )

  const budgets = useMemo(() => {
    if (!Array.isArray(rawBudgets)) return []
    return rawBudgets.map((item) => {
      const departmentName = getDepartmentName(item)
      return {
        ...item,
        name: `${departmentName} — ${item.type}`,
        // Back-compat aliases — prefer the explicit field names above
        // (total_budget / deployed_to_revolving_funds) in new code.
        allocated: item.total_budget,
        deployedToFunds: item.deployed_to_revolving_funds,
      }
    })
  }, [rawBudgets, getDepartmentName])

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
