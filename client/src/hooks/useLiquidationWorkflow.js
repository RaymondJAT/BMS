import { useState, useCallback } from 'react'
import { liquidationApi } from '../api/liquidationApi'

/**
 * The Cash Request page's "Liquidate" flow: creating a new Liquidation
 * against a COMPLETED request, and viewing one that already exists for a
 * row. Kept as its own hook (rather than folded into the page's main
 * create/edit/view/approve/disburse modal state) because it's a distinct
 * two-step flow with its own submitting state — mirrors the "separate
 * object per concern" reasoning already used for that modal state.
 *
 * @param {() => Promise<void>} onLiquidationCreated - called after a
 *   liquidation is successfully created, so the caller can refresh its
 *   cash request list (liquidation_id/liquidation_status are joined onto
 *   each row — see getCashRequest in cashRequestController.js).
 */
export function useLiquidationWorkflow({ onLiquidationCreated }) {
  const [liquidateTarget, setLiquidateTarget] = useState(null)
  const [isLiquidating, setIsLiquidating] = useState(false)
  const [liquidationView, setLiquidationView] = useState(null) // { detail, activity } | null

  const openLiquidate = useCallback((row) => setLiquidateTarget(row), [])
  const closeLiquidate = useCallback(() => setLiquidateTarget(null), [])

  const createLiquidation = useCallback(
    async (payload) => {
      setIsLiquidating(true)
      try {
        await liquidationApi.create(payload)
        await onLiquidationCreated?.()
        return { success: true }
      } catch (err) {
        return {
          success: false,
          message: err.response?.data?.message || 'Failed to submit liquidation.',
        }
      } finally {
        setIsLiquidating(false)
      }
    },
    [onLiquidationCreated],
  )

  const viewLiquidation = useCallback(async (row) => {
    const [detail, activity] = await Promise.all([
      liquidationApi.getById(row.liquidation_id),
      liquidationApi.getActivity({ liquidation_id: row.liquidation_id }),
    ])
    setLiquidationView({ detail, activity: activity || [] })
  }, [])

  const closeLiquidationView = useCallback(() => setLiquidationView(null), [])

  return {
    liquidateTarget,
    isLiquidating,
    liquidationView,
    openLiquidate,
    closeLiquidate,
    createLiquidation,
    viewLiquidation,
    closeLiquidationView,
  }
}

export default useLiquidationWorkflow
