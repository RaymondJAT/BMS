import { useMutation, useQueryClient } from '@tanstack/react-query'
import revolvingFundApi from '../api/revolvingFundApi'

/**
 * Saves edits to an existing revolving fund — currently just the
 * "Add to Fund Now" top-up flow from EditRevolvingFundModal.
 *
 * The payload only needs { id, add_amount }: the backend recomputes
 * added/total_fund/balance itself from the fund's current row and the
 * literal delta, so this hook doesn't need to know or send those totals.
 */
function useEditRevolvingFund() {
  const queryClient = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (payload) => revolvingFundApi.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revolvingFunds'] })
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Error updating revolving fund.')
    },
  })

  return {
    saveFund: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}

export default useEditRevolvingFund
