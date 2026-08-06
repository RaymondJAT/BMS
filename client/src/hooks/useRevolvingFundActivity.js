import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import revolvingFundApi from '../api/revolvingFundApi'

function useRevolvingFundActivity() {
  const queryClient = useQueryClient()
  const [activityModalFund, setActivityModalFund] = useState(null)

  // Resolve ID regardless of field naming convention (id vs revolving_fund_id)
  const revolvingFundId = activityModalFund?.id || activityModalFund?.revolving_fund_id

  // Fetch activity logs when a valid fund ID exists
  const {
    data: activityLogs = [],
    isLoading: isActivityLoading,
    error: activityErrorObj,
  } = useQuery({
    queryKey: ['revolvingFundActivity', revolvingFundId],
    queryFn: () => revolvingFundApi.getActivity(revolvingFundId),
    enabled: Boolean(revolvingFundId),
  })

  const logActivityMutation = useMutation({
    mutationFn: (payload) => revolvingFundApi.saveActivity(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revolvingFundActivity', revolvingFundId] })
      queryClient.invalidateQueries({ queryKey: ['revolvingFunds'] })
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to log revolving fund activity.')
    },
  })

  const handleOpenActivityModal = (row, e) => {
    e?.stopPropagation?.()
    setActivityModalFund(row)
  }

  const handleCloseActivityModal = () => {
    setActivityModalFund(null)
  }

  const handleAddActivity = (activityPayload) => {
    if (!revolvingFundId) return

    // Guard: Do not allow logging activity on closed funds
    if (activityModalFund?.status?.toUpperCase() === 'CLOSED') {
      alert('Cannot log activity for a closed revolving fund.')
      return
    }

    logActivityMutation.mutate({
      revolving_fund_id: revolvingFundId,
      ...activityPayload,
    })
  }

  return {
    activityModalFund,
    activityLogs,
    isActivityLoading,
    activityError: activityErrorObj
      ? activityErrorObj.response?.data?.message || 'Failed to load activity logs.'
      : null,
    isLoggingActivity: logActivityMutation.isPending,
    handleOpenActivityModal,
    handleCloseActivityModal,
    handleAddActivity,
  }
}

export default useRevolvingFundActivity
