import { useState, useEffect, useCallback } from 'react'
import { cashDisbursementApi } from '../api/cashDisbursementApi'

/**
 * Wraps cashDisbursementApi with list state + all backend actions.
 * Every mutating action refetches the list on success so the table stays
 * in sync with server-computed fields (outstanding_amount, status, etc —
 * these are never set optimistically since the backend, not the client,
 * owns that math).
 */
export function useCashDisbursements(initialParams = {}) {
  const [disbursements, setDisbursements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMutating, setIsMutating] = useState(false)

  const fetchDisbursements = useCallback(async (params = initialParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await cashDisbursementApi.getAll(params)
      setDisbursements(data || [])
    } catch (err) {
      console.error('Failed to fetch cash disbursements:', err)
      setError(err.response?.data?.message || 'Failed to load cash disbursements.')
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchDisbursements()
  }, [fetchDisbursements])

  const runMutation = useCallback(
    async (fn, payload) => {
      setIsMutating(true)
      try {
        const result = await fn(payload)
        await fetchDisbursements()
        return { success: true, data: result }
      } catch (err) {
        console.error('Cash disbursement mutation failed:', err)
        const message = err.response?.data?.message || 'Something went wrong. Please try again.'
        return { success: false, message }
      } finally {
        setIsMutating(false)
      }
    },
    [fetchDisbursements],
  )

  // Issue new cash from a revolving fund
  const issue = useCallback(
    (payload) => runMutation(cashDisbursementApi.issue, payload),
    [runMutation],
  )

  // Record a return of unused issued cash against an existing disbursement
  const returnCash = useCallback(
    (payload) => runMutation(cashDisbursementApi.returnCash, payload),
    [runMutation],
  )

  // Record spending against previously issued cash
  const recordExpended = useCallback(
    (payload) => runMutation(cashDisbursementApi.recordExpended, payload),
    [runMutation],
  )

  // Reimburse an employee (new, immediately-liquidated disbursement)
  const reimburse = useCallback(
    (payload) => runMutation(cashDisbursementApi.reimburse, payload),
    [runMutation],
  )

  // Metadata-only edit (received_by, department_id, particulars, cash_voucher)
  // — id is required; the backend rejects metadata upserts without one.
  const updateMetadata = useCallback(
    (payload) => runMutation(cashDisbursementApi.save, payload),
    [runMutation],
  )

  /**
   * Convenience wrapper for the "Submit Liquidation" flow: the backend has
   * no single endpoint that records both a return and an expended amount
   * at once, so this fires them sequentially. If amount_return succeeds but
   * amount_expended then fails, the disbursement is left partially updated
   * (return recorded, expense not) — the caller should surface the error
   * and let the person retry just the expended portion.
   */
  const submitLiquidation = useCallback(
    async ({ id, amount_return, amount_expended }) => {
      setIsMutating(true)
      try {
        if (amount_return > 0) {
          await cashDisbursementApi.returnCash({ id, amount_return })
        }
        if (amount_expended > 0) {
          await cashDisbursementApi.recordExpended({ id, amount_expended })
        }
        await fetchDisbursements()
        return { success: true }
      } catch (err) {
        console.error('Submit liquidation failed:', err)
        await fetchDisbursements() // pick up whichever half may have committed
        const message = err.response?.data?.message || 'Something went wrong. Please try again.'
        return { success: false, message }
      } finally {
        setIsMutating(false)
      }
    },
    [fetchDisbursements],
  )

  return {
    disbursements,
    isLoading,
    isMutating,
    error,
    fetchDisbursements,
    issue,
    returnCash,
    recordExpended,
    reimburse,
    updateMetadata,
    submitLiquidation,
  }
}

export default useCashDisbursements
