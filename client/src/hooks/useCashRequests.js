import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cashRequestApi } from '../api/cashRequestApi'

/**
 * Wraps cashRequestApi with list state + the full workflow actions
 * (create -> edit/resubmit -> approve/reject -> complete/reject).
 * Mirrors useCashDisbursements.js's shape and invalidation pattern: local
 * useState list (not react-query) refetched after every mutation, with a
 * shared runMutation() helper returning { success, message } so modals
 * can decide whether to close themselves.
 *
 * IMPORTANT: only completing a request (disburseRequest, below) actually
 * moves money. It creates a new cash_disbursement row and moves the
 * Fund-Custodian-selected revolving_fund's balance/status server-side —
 * an IDENTICAL cascade to cashDisbursementController.js's
 * issueCashDisbursement (see completeCashRequest's docstring on the
 * backend). That means both the Revolving Funds cache AND the Budgets
 * cache can go stale from this page. Both are invalidated after
 * disburseRequest only — create/edit/approve/reject never move money, so
 * they never invalidate them.
 */
export function useCashRequests({ role, ...initialParams } = {}) {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMutating, setIsMutating] = useState(false)
  const queryClient = useQueryClient()

  const fetchCashRequests = useCallback(async (params = initialParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await cashRequestApi.getAll(params)
      setRequests(data || [])
    } catch (err) {
      console.error('Failed to fetch cash requests:', err)
      setError(err.response?.data?.message || 'Failed to load cash requests.')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchCashRequests()
  }, [fetchCashRequests])

  const invalidateFinancialCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['revolvingFunds'] })
    queryClient.invalidateQueries({ queryKey: ['budgets'] })
  }, [queryClient])

  const runMutation = useCallback(
    async (fn, payload, { invalidateFinancial = false } = {}) => {
      setIsMutating(true)
      try {
        const result = await fn(payload)
        await fetchCashRequests()
        if (invalidateFinancial) invalidateFinancialCaches()
        return { success: true, data: result }
      } catch (err) {
        console.error('Cash request mutation failed:', err)
        const message = err.response?.data?.message || 'Something went wrong. Please try again.'
        return { success: false, message }
      } finally {
        setIsMutating(false)
      }
    },
    [fetchCashRequests, invalidateFinancialCaches],
  )

  // Requester creates a request -> PENDING. No financial effect, no
  // Revolving Fund selection.
  const createRequest = useCallback(
    (payload) => runMutation(cashRequestApi.create, payload),
    [runMutation],
  )

  // Requester edits + resubmits a PENDING or REJECTED request. Backend
  // resets it to PENDING (back in the Team Lead queue). No financial
  // effect — never invalidates financial caches.
  const editRequest = useCallback(
    (id, payload = {}) => runMutation(cashRequestApi.update, { id, ...payload }),
    [runMutation],
  )

  // Team Lead approves a PENDING request -> APPROVED (pending Fund
  // Custodian). No financial effect.
  const approveRequest = useCallback(
    (id, payload = {}) => runMutation(cashRequestApi.approve, { id, ...payload }),
    [runMutation],
  )

  // Team Lead (PENDING) or Fund Custodian (APPROVED) rejects -> REJECTED.
  // No financial effect.
  const rejectRequest = useCallback(
    (id, payload = {}) => runMutation(cashRequestApi.reject, { id, ...payload }),
    [runMutation],
  )

  // Fund Custodian completes an APPROVED request -> COMPLETED. THIS is
  // the step that creates a Cash Disbursement and moves fund/budget
  // figures — the only mutation in this hook that invalidates the
  // financial caches. Payload must include the Fund-Custodian-selected
  // revolving_fund_id. UI-facing verb is "Disburse"; backend/API name is
  // "complete" (cashRequestApi.complete -> PUT /cash-request/complete).
  const disburseRequest = useCallback(
    (id, payload = {}) =>
      runMutation(cashRequestApi.complete, { id, ...payload }, { invalidateFinancial: true }),
    [runMutation],
  )

  // role is accepted but not yet used to filter server-side — the backend
  // getCashRequest only supports `status`/`employee_id` query params.
  // Role only drives which action buttons render client-side (see
  // requestColumns.js).
  void role

  // Derived metrics for the StatCard banner. Deliberately does NOT
  // include "Disbursed"/"Unliquidated" totals — those are Cash
  // Disbursement figures (see the Disbursements page).
  const metrics = useMemo(() => {
    return requests.reduce(
      (acc, req) => {
        const amount = parseFloat(req.amount || 0)
        const status = String(req.status || '').toUpperCase()

        if (status !== 'REJECTED') {
          acc.totalRequested += amount
        }
        if (status === 'PENDING') {
          acc.pendingCount += 1
        }
        if (status === 'APPROVED') {
          acc.approvedAmount += amount
        }
        if (status === 'COMPLETED') {
          acc.completedAmount += amount
        }
        return acc
      },
      { totalRequested: 0, pendingCount: 0, approvedAmount: 0, completedAmount: 0 },
    )
  }, [requests])

  return {
    requests,
    metrics,
    isLoading,
    isMutating,
    error,
    fetchCashRequests,
    createRequest,
    editRequest,
    approveRequest,
    rejectRequest,
    disburseRequest,
  }
}

export default useCashRequests
