import { useState, useEffect, useCallback } from 'react'
import { masterDistrictApi, masterModeOfTransportationApi } from '../api/liquidationApi'

// Defensive unwrap — handles a bare array, { data: [...] } (matches
// getMasterModeOfTransportation's actual response shape), or
// { result: [...] }, so this works regardless of whether the api layer
// already unwrapped the response.
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
    masterModeOfTransportationApi
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
