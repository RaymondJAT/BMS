import { useState, useEffect } from 'react'
import { cashRequestEligibilityApi } from '../api/liquidationApi'

/**
 * Whether `employeeId` may currently create a new Cash Request. Re-checks
 * whenever `requests` changes, since creating/completing/liquidating a
 * request can flip eligibility server-side (see hasOutstandingLiquidation
 * in cashRequestController.js) — this is purely an advisory UI hint, the
 * real gate is enforced on the backend at creation time.
 *
 * Guards against setting state from a stale response if `employeeId` or
 * `requests` changes again before the request resolves.
 */
export function useCashRequestEligibility(employeeId, requests) {
  const [eligibility, setEligibility] = useState({ eligible: true, message: null })

  useEffect(() => {
    if (!employeeId) return
    let cancelled = false

    cashRequestEligibilityApi
      .check(employeeId)
      .then((result) => {
        if (!cancelled) setEligibility(result)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [employeeId, requests])

  return eligibility
}

export default useCashRequestEligibility
