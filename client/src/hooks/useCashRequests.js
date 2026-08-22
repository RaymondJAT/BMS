import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import departmentApi from '../api/departmentApi'

// Mock Data Source (aligned strictly with the 4 core status types)
const MOCK_CASH_REQUESTS = [
  {
    id: 'CR-1001',
    cash_voucher: 'CV-2026-001',
    requester_name: 'John Doe',
    department_id: 1,
    department_name: 'Engineering',
    purpose: 'Site visit transportation and meals',
    amount_requested: 3500.0,
    status: 'PENDING',
    created_at: '2026-08-20',
  },
  {
    id: 'CR-1002',
    cash_voucher: 'CV-2026-002',
    requester_name: 'Jane Smith',
    department_id: 2,
    department_name: 'Marketing',
    purpose: 'Print advertising flyers (Urgent)',
    amount_requested: 7200.0,
    status: 'PENDING',
    created_at: '2026-08-21',
  },
  {
    id: 'CR-1003',
    cash_voucher: 'CV-2026-003',
    requester_name: 'Mark Reyes',
    department_id: 3,
    department_name: 'Operations',
    purpose: 'Emergency office hardware maintenance',
    amount_requested: 5000.0,
    status: 'APPROVED',
    created_at: '2026-08-19',
  },
  {
    id: 'CR-1004',
    cash_voucher: 'CV-2026-004',
    requester_name: 'Sarah Connor',
    department_id: 4,
    department_name: 'Human Resources',
    purpose: 'Team building refreshment items',
    amount_requested: 12500.0,
    status: 'COMPLETED',
    created_at: '2026-08-18',
  },
  {
    id: 'CR-1005',
    cash_voucher: 'CV-2026-005',
    requester_name: 'Alex Mercer',
    department_id: 5,
    department_name: 'Logistics',
    purpose: 'Fuel allowance for emergency delivery vehicle',
    amount_requested: 2400.0,
    status: 'REJECTED',
    created_at: '2026-08-15',
  },
  {
    id: 'CR-1006',
    cash_voucher: 'CV-2026-006',
    requester_name: 'Maria Clara',
    department_id: 6,
    department_name: 'Finance',
    purpose: 'Notary fees for legal compliance docs',
    amount_requested: 1500.0,
    status: 'COMPLETED',
    created_at: '2026-08-10',
  },
]

function useCashRequests(filters = {}) {
  const queryClient = useQueryClient()

  // React Query Fetch
  const {
    data: rawRequests = [],
    isLoading,
    error,
    refetch: fetchCashRequests,
  } = useQuery({
    queryKey: ['cashRequests', filters],
    queryFn: async () => {
      return MOCK_CASH_REQUESTS
    },
  })

  // Optional department fetch to enrich display names
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      try {
        return await departmentApi.getAll()
      } catch {
        return []
      }
    },
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

  // Map and normalize statuses to guarantee strict alignment with standard categories
  const requests = useMemo(() => {
    if (!Array.isArray(rawRequests)) return []
    return rawRequests.map((item) => {
      const rawStatus = String(item.status || 'PENDING').toUpperCase()
      let normalizedStatus = rawStatus

      if (rawStatus.includes('PENDING')) normalizedStatus = 'PENDING'
      else if (rawStatus.includes('REJECT')) normalizedStatus = 'REJECTED'
      else if (['DISBURSED', 'LIQUIDATED', 'COMPLETED'].includes(rawStatus))
        normalizedStatus = 'COMPLETED'
      else if (rawStatus === 'APPROVED') normalizedStatus = 'APPROVED'

      return {
        ...item,
        status: normalizedStatus,
        department_name: getDepartmentName(item),
      }
    })
  }, [rawRequests, getDepartmentName])

  // Summary Metrics Aggregation based on updated statuses
  const metrics = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        const amt = parseFloat(item.amount_requested || 0)
        const status = item.status

        acc.totalRequested += amt

        if (status === 'PENDING') {
          acc.pendingCount += 1
          acc.pendingAmount += amt
        } else if (status === 'APPROVED') {
          acc.approvedAmount += amt
          acc.approvedCount += 1
        } else if (status === 'COMPLETED') {
          acc.completedAmount += amt
          acc.completedCount += 1
        } else if (status === 'REJECTED') {
          acc.rejectedAmount += amt
          acc.rejectedCount += 1
        }

        return acc
      },
      {
        totalRequested: 0,
        pendingCount: 0,
        pendingAmount: 0,
        approvedAmount: 0,
        approvedCount: 0,
        completedAmount: 0,
        completedCount: 0,
        rejectedAmount: 0,
        rejectedCount: 0,
      },
    )
  }, [requests])

  // Placeholder mutation hook for future delete/cancel functionality
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRequests'] })
    },
    onError: (err) => {
      alert(err?.response?.data?.message || 'Failed to delete request record.')
    },
  })

  const handleDelete = (row, e) => {
    e?.stopPropagation?.()
    if (window.confirm(`Are you sure you want to delete request ${row.cash_voucher || row.id}?`)) {
      deleteMutation.mutate(row.id)
    }
  }

  return {
    requests,
    metrics,
    departments,
    isLoading,
    error: error ? error.response?.data?.message || 'Failed to load cash requests.' : null,
    fetchCashRequests,
    getDepartmentName,
    handleDelete,
    isDeleting: deleteMutation.isPending,
  }
}

export default useCashRequests
