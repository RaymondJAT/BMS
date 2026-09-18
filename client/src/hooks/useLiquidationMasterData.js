import { useState, useEffect, useCallback } from 'react'
import { masterDistrictApi } from '../api/liquidationApi'
import { masterTransportationApi } from '../api/masterTransportationApi'
import { unwrapList, unwrapSettled } from '../utils/apiResponse'

// Search-on-type limits — a small initial ACTIVE batch on mount, then a
// fresh server search per call as the user types (RemoteSearchSelect
// debounces before calling searchStores/searchModes; these functions
// themselves don't debounce). Store backs a ~4.5k row table and can
// never be loaded in full. Mode of Transportation is much smaller but
// follows the SAME pattern now, instead of the full-table getAll() it
// used before — one consistent loading story for both fields, and Mode
// stops silently growing past what a plain dropdown should hold.
const INITIAL_LIMIT = 12
const SEARCH_LIMIT = 20

// store_number lives in exactly one place — reused by both the initial
// batch and every live search result, so they can't drift apart (the
// bug being fixed here: the old searchStores dropped store_number from
// its label even though people search by store number).
const toStoreOption = (d) => ({
  value: d.store_name,
  label: d.store_number ? `${d.store_number} ${d.store_name}` : d.store_name,
})

const toModeOption = (m) => ({ value: m.id, label: m.name })

/**
 * Liquidation form's master-data hook — Store (District) and Mode of
 * Transportation, both search-on-type against getMasterDistrict /
 * getMasterModeOfTransportation's `search`/`limit`/`status` params.
 */
export function useLiquidationMasterData() {
  const [districts, setDistricts] = useState([])
  const [modes, setModes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInitial = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [districtRes, modeRes] = await Promise.allSettled([
        masterDistrictApi.getAll({ status: 'ACTIVE', limit: INITIAL_LIMIT }),
        masterTransportationApi.getAll({ status: 'ACTIVE', limit: INITIAL_LIMIT }),
      ])
      setDistricts(unwrapSettled(districtRes))
      setModes(unwrapSettled(modeRes))
    } catch (err) {
      console.error('Failed to fetch liquidation master data:', err)
      setError('Failed to load reference data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  const searchStores = useCallback(async (term) => {
    try {
      const res = await masterDistrictApi.getAll({
        status: 'ACTIVE',
        search: term,
        limit: SEARCH_LIMIT,
      })
      return unwrapList(res).map(toStoreOption)
    } catch (err) {
      console.error('Failed to search stores:', err)
      return []
    }
  }, [])

  const searchModes = useCallback(async (term) => {
    try {
      const res = await masterTransportationApi.getAll({
        status: 'ACTIVE',
        search: term,
        limit: SEARCH_LIMIT,
      })
      return unwrapList(res).map(toModeOption)
    } catch (err) {
      console.error('Failed to search modes of transportation:', err)
      return []
    }
  }, [])

  // Name resolution for read-only views (e.g. liquidationDetail). `modes`
  // is only ever a small batch now, not the full table, so an id from
  // outside that batch is expected — falls back to a placeholder.
  const getModeName = useCallback(
    (id) => modes.find((m) => String(m.id) === String(id))?.name || `Mode #${id ?? 'N/A'}`,
    [modes],
  )

  return {
    districts,
    modes,
    isLoading,
    error,
    refetch: fetchInitial,
    searchStores,
    searchModes,
    getModeName,
  }
}

export default useLiquidationMasterData
