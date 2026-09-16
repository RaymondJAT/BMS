import { useState, useEffect } from 'react'
import { liquidationApi } from '../api/liquidationApi'

/**
 * Fetches a single Liquidation's detail + activity log together, for the
 * full-page Liquidation Detail view. (The same getById + getActivity pair
 * also appears in LiquidationPage's row-detail modal — if that's ever
 * pulled into a hook too, this is the shape to match.)
 */
export function useLiquidationDetail(id) {
  const [liquidation, setLiquidation] = useState(null)
  const [activity, setActivity] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    Promise.all([liquidationApi.getById(id), liquidationApi.getActivity({ liquidation_id: id })])
      .then(([detail, acts]) => {
        if (cancelled) return
        setLiquidation(detail)
        setActivity(acts || [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Failed to load liquidation.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  return { liquidation, activity, isLoading, error }
}

export default useLiquidationDetail
