import { useState, useEffect, useCallback } from 'react'
import { masterParticularsApi } from '../api/masterParticularsApi'
import { masterTransportationApi } from '../api/masterTransportationApi'
import { masterDistrictApi } from '../api/liquidationApi'
import { unwrapList } from '../utils/apiResponse'

const toStoreLabel = (d) => (d?.store_number ? `${d.store_number} ${d.store_name}` : d?.store_name)

/**
 * Liquidation Detail page's own lookup hook — deliberately SEPARATE from
 * useLiquidationMasterData / useLiquidationLookups, which back the
 * Create/Edit form's live-search Store/Particulars/Mode dropdowns and
 * only ever hold a small batch for that reason. This page has a
 * different job: resolve ids/names a liquidation ALREADY SAVED into
 * display labels — reusing the small-batch hooks here silently showed
 * raw ids/names whenever the saved value wasn't in that batch (the bug
 * this hook fixes).
 *
 * Particulars and Mode of Transportation are both small enough to load
 * in full for that purpose — per getMasterParticulars/
 * getMasterModeOfTransportation's own docs, ~100 and ~25-50 rows
 * respectively. Store is not (~4.5k rows), so this resolves ONLY the
 * store_name/from/to values actually referenced by `items` — one search
 * call per distinct name, never the full table.
 */
export function useLiquidationDetailLookups(items = []) {
  const [particulars, setParticulars] = useState([])
  const [modes, setModes] = useState([])
  const [storeLabels, setStoreLabels] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    Promise.allSettled([masterParticularsApi.getAll(), masterTransportationApi.getAll()]).then(
      ([partRes, modeRes]) => {
        if (cancelled) return
        setParticulars(partRes.status === 'fulfilled' ? unwrapList(partRes.value) : [])
        setModes(modeRes.status === 'fulfilled' ? unwrapList(modeRes.value) : [])
        setIsLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // Resolve labels only for the store names THIS liquidation actually
  // uses — never the full district table.
  useEffect(() => {
    const names = [
      ...new Set(items.flatMap((it) => [it.store_name, it.from, it.to]).filter(Boolean)),
    ]
    if (names.length === 0) return

    let cancelled = false
    Promise.all(
      names.map((name) =>
        masterDistrictApi
          .getAll({ search: name, limit: 1 })
          .then((res) => unwrapList(res)[0])
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return
      setStoreLabels((prev) => {
        const next = { ...prev }
        names.forEach((name, i) => {
          next[name] = toStoreLabel(results[i]) || name
        })
        return next
      })
    })
    return () => {
      cancelled = true
    }
    // Only re-resolve when the actual set of names changes, not on every
    // items reference — items is stable per liquidation load anyway.
  }, [items])

  const getParticularsName = useCallback(
    (id) => {
      const match = particulars.find((p) => String(p.id) === String(id))
      if (!match) return `Particulars #${id ?? 'N/A'}`
      const label = match.name || match.description
      return match.code ? `${match.code} ${label}` : label
    },
    [particulars],
  )

  const getModeName = useCallback(
    (id) => (id ? modes.find((m) => String(m.id) === String(id))?.name || '—' : '—'),
    [modes],
  )

  const getStoreLabel = useCallback((name) => storeLabels[name] || name || '—', [storeLabels])

  return { isLoading, getParticularsName, getModeName, getStoreLabel }
}

export default useLiquidationDetailLookups
