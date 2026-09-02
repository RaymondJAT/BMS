import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterTransportationApi } from '../api/masterTransportationApi'

export function useTransportation() {
  const queryClient = useQueryClient()

  // Fetch Mode of Transportation list
  const {
    data: transportationList = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['master-transportation'],
    queryFn: masterTransportationApi.getAll,
  })

  // Upsert Mutation 
  const upsertMutation = useMutation({
    mutationFn: masterTransportationApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-transportation'] })
    },
  })

  // Bulk CSV Import Mutation
  const importTransportationMutation = useMutation({
    mutationFn: masterTransportationApi.importCSV,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-transportation'] })
    },
  })

  return {
    transportationList,
    isLoading,
    isSubmitting: upsertMutation.isPending || importTransportationMutation.isPending,
    error,
    upsertTransportation: (data) => upsertMutation.mutateAsync(data),
    importTransportation: (items) => importTransportationMutation.mutateAsync(items),
  }
}
