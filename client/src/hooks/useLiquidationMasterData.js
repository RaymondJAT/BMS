import { useState, useEffect, useCallback } from 'react'
import { masterDistrictApi, masterModeOfTransportationApi } from '../api/liquidationApi'

export function useLiquidationMasterData() {
  const [districts, setDistricts] = useState([])
  const [modes, setModes] = useState([])

  useEffect(() => {
    masterDistrictApi
      .getAll()
      .then(setDistricts)
      .catch(() => setDistricts([]))
    masterModeOfTransportationApi
      .getAll()
      .then(setModes)
      .catch(() => setModes([]))
  }, [])

  const getModeName = useCallback(
    (id) => modes.find((m) => String(m.id) === String(id))?.name || `Mode #${id}`,
    [modes],
  )

  return { districts, modes, getModeName }
}

export default useLiquidationMasterData
