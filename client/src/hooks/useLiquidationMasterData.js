import { useState, useEffect, useCallback } from 'react'
import { masterDistrictApi } from '../api/liquidationApi'
import { masterTransportationApi } from '../api/masterTransportationApi'

const unwrap = (res) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.result)) return res.result
  return []
}

// Initial load fetches only the first page of stores, not the full
// ~4.5k list — the rest is fetched on demand as the user types (see
// searchStores), matching a server-side search-on-type pattern.
const INITIAL_STORE_LIMIT = 12
const SEARCH_STORE_LIMIT = 20

export function useLiquidationMasterData() {
  const [districts, setDistricts] = useState([])
  const [modes, setModes] = useState([])

  useEffect(() => {
    masterDistrictApi
      .getAll({ status: 'ACTIVE', limit: INITIAL_STORE_LIMIT })
      .then((res) => setDistricts(unwrap(res)))
      .catch(() => setDistricts([]))

    masterTransportationApi
      .getAll()
      .then((res) => setModes(unwrap(res)))
      .catch(() => setModes([]))
  }, [])

  // Called by RemoteSearchSelect after its own debounce timer fires —
  // this function itself does not debounce.
  const searchStores = useCallback(async (term) => {
    const res = await masterDistrictApi.getAll({
      status: 'ACTIVE',
      search: term,
      limit: SEARCH_STORE_LIMIT,
    })
    return unwrap(res).map((d) => ({ value: d.store_name, label: d.store_name }))
  }, [])

  const getModeName = useCallback(
    (id) => modes.find((m) => String(m.id) === String(id))?.name || `Mode #${id}`,
    [modes],
  )

  return { districts, modes, getModeName, searchStores }
}

export default useLiquidationMasterData
