import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import budgetApi from '../api/budgetApi'
import departmentApi from '../api/departmentApi'

function useBudgets() {
  const queryClient = useQueryClient()

  const {
    data: budgets = [],
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
