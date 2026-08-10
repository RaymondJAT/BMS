import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import budgetApi from '../api/budgetApi'

function useBudgetHistory() {
  const [historyModalBudget, setHistoryModalBudget] = useState(null)

  const budgetId = historyModalBudget?.id

  const {
    data: historyLogs = [],
    isLoading: isHistoryLoading,
    error: historyErrorObj,
  } = useQuery({
    queryKey: ['budgetHistory', budgetId],
    queryFn: () => budgetApi.getHistory(budgetId),
    enabled: Boolean(budgetId),
  })

  const handleOpenHistoryModal = (row, e) => {
    e?.stopPropagation?.()
    setHistoryModalBudget(row)
  }

  const handleCloseHistoryModal = () => {
    setHistoryModalBudget(null)
  }

  return {
    historyModalBudget,
    historyLogs,
    isHistoryLoading,
    historyError: historyErrorObj
      ? historyErrorObj.response?.data?.message || 'Failed to load budget history.'
      : null,
    handleOpenHistoryModal,
    handleCloseHistoryModal,
  }
}

export default useBudgetHistory
