import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { recordForYouSignal } from '../lib/forYou'

export function useToggleFoodSave() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (venueId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/food/venues/${venueId}/save/`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      if (data?.saved) recordForYouSignal('food', 'save')
      void qc.invalidateQueries({ queryKey: ['food'] })
      void qc.invalidateQueries({ queryKey: ['saved-food'] })
    },
  })
}
