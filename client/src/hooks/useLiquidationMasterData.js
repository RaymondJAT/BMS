import { useState, useEffect, useCallback } from 'react'
import { masterDistrictApi } from '../api/liquidationApi'
import { masterTransportationApi } from '../api/masterTransportationApi'

// Defensive unwrap — masterTransportationApi.getAll() already unwraps to
// a bare array, but this stays in case that ever changes or district's
// response shape differs.
const unwrap = (res) => {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.data)) return res.data
  if (Array.isArray(res?.result)) return res.result
  return []
}

export function useLiquidationMasterData() {
  const [districts, setDistricts] = useState([])
  const [modes, setModes] = useState([])

  useEffect(() => {
    masterDistrictApi
      .getAll()
      .then((res) => setDistricts(unwrap(res)))
      .catch(() => setDistricts([]))

    // FIXED: was pulling masterModeOfTransportationApi from
    // liquidationApi.js, which hits '/master-modeoftransportation' — a
    // path that doesn't exist. masterTransportationApi hits the real
    // route, '/master-mode-of-transportation'.
    masterTransportationApi
      .getAll()
      .then((res) => setModes(unwrap(res)))
      .catch(() => setModes([]))
  }, [])

  const getModeName = useCallback(
    (id) => modes.find((m) => String(m.id) === String(id))?.name || `Mode #${id}`,
    [modes],
  )

  return { districts, modes, getModeName }
}

export default useLiquidationMasterData
