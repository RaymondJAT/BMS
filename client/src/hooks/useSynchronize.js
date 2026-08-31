import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import syncApi from '../api/syncApi'

function useSynchronize() {
  const queryClient = useQueryClient()
  const [lastResult, setLastResult] = useState(null)

  const syncMutation = useMutation({
    mutationFn: () => syncApi.run(),
    onSuccess: (data) => {
      setLastResult(data.summary || data)
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Synchronization failed.')
    },
  })

  return {
    runSync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    lastResult,
    error: syncMutation.error?.response?.data?.message || null,
  }
}

export default useSynchronize
