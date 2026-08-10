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
   * Submits a liquidation report: settles the existing outstanding via
   * return + expended, and if the reported expended amount exceeds what's
   * left after the return (employee spent out of pocket), auto-triggers a
   * reimbursement for the excess — reusing the original cash_voucher, which
   * is exactly the "issue row + reimbursement row" pattern the backend's
   * 2-per-voucher limit is designed for.
   */
  const submitLiquidation = useCallback(
    async ({
      disbursement,
      revolving_fund_id,
      amount_return = 0,
      amount_expended = 0,
      is_reimbursement = false,
      reimbursement_amount = 0,
    }) => {
      setIsMutating(true)
      try {
        const outstanding = parseFloat(disbursement.outstanding_amount || 0)
        const expendedToRecord = Math.min(parseFloat(amount_expended) || 0, outstanding)

        if (expendedToRecord > 0) {
          await cashDisbursementApi.recordExpended({
            id: disbursement.id,
            amount_expended: expendedToRecord,
          })
        }

        if (!is_reimbursement) {
          const returnToRecord = Math.min(
            parseFloat(amount_return) || 0,
            Math.max(0, outstanding - expendedToRecord),
          )
          if (returnToRecord > 0) {
            await cashDisbursementApi.returnCash({
              id: disbursement.id,
              amount_return: returnToRecord,
              revolving_fund_id: revolving_fund_id || disbursement.revolving_fund_id,
            })
          }
        }

        if (is_reimbursement) {
          const reimburseAmt = parseFloat(reimbursement_amount) || 0
          if (reimburseAmt > 0) {
            await cashDisbursementApi.reimburse({
              revolving_fund_id: revolving_fund_id || disbursement.revolving_fund_id,
              received_by: disbursement.received_by,
              department_id: disbursement.department_id,
              particulars: disbursement.particulars,
              amount_reimburse: reimburseAmt,
              cash_voucher: disbursement.cash_voucher,
            })
          }
        }

        await fetchDisbursements()
        return { success: true }
      } catch (err) {
        console.error('Submit liquidation failed:', err)
        await fetchDisbursements()
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
