import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import revolvingFundApi from '../api/revolvingFundApi'

function useRevolvingFunds(filters = {}) {
  const queryClient = useQueryClient()

  const {
    data: rawFunds = [],
    isLoading,
    error,
    refetch: fetchRevolvingFunds,
  } = useQuery({
    queryKey: ['revolvingFunds', filters],
    queryFn: () => revolvingFundApi.getAll(filters),
  })

  // Normalize API data fields to ensure standard UI consumption
  const funds = useMemo(() => {
    if (!Array.isArray(rawFunds)) return []
    return rawFunds.map((item) => {
      const beginningVal = Number(item.beginning ?? item.baseCap ?? item.base_cap ?? 0)
      const replenishedVal = Number(item.added ?? item.replenished ?? 0)
      const issuedVal = Number(item.issued ?? item.total_issued ?? 0)
      const liquidatedVal = Number(item.liquidated ?? item.total_liquidated ?? 0)
      const rawStatus = String(item.status || '').toUpperCase()
      const isFinalized = rawStatus === 'CLOSED' || rawStatus === 'CLEARED' || rawStatus === 'CLEAR'
      const endingVal = Number(item.ending ?? 0)
      const liveBalanceVal = Number(item.balance ?? item.ending_balance ?? beginningVal)

      return {
        ...item,
        id: item.id || item.revolving_fund_id,
        name: item.name || item.fund_name || `Revolving Fund #${item.id || item.revolving_fund_id}`,
        beginning: beginningVal,
        baseCap: beginningVal,
        replenished: replenishedVal,
        issued: issuedVal,
        liquidated: liquidatedVal,
        unliquidated: Math.max(0, issuedVal - liquidatedVal),
        balance: liveBalanceVal,
        displayBalance: isFinalized ? endingVal : liveBalanceVal,
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        status: item.status || 'Active',
      }
    })
  }, [rawFunds])

  // Compute summary metrics directly from normalized records
  const metrics = useMemo(() => {
    return funds.reduce(
      (acc, fund) => {
        const totalCap = (fund.beginning || fund.baseCap || 0) + (fund.replenished || 0)
        acc.totalCapacity += totalCap
        acc.totalIssued += fund.issued || 0
        acc.totalLiquidated += fund.liquidated || 0
        acc.totalUnliquidated += fund.unliquidated || 0
        acc.totalBalance += fund.balance || 0
        return acc
      },
      {
        totalCapacity: 0,
        totalIssued: 0,
        totalLiquidated: 0,
        totalUnliquidated: 0,
        totalBalance: 0,
      },
    )
  }, [funds])

  return {
    funds,
    metrics,
    isLoading,
    error: error ? error.response?.data?.message || 'Failed to load revolving fund records.' : null,
    fetchRevolvingFunds,
  }
}

export default useRevolvingFunds
