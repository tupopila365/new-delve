import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { recordForYouSignal } from '../lib/forYou'

export function useToggleGuideSave() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (guideId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(`/api/guides/profiles/${guideId}/save/`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      if (data?.saved) recordForYouSignal('guides', 'save')
      void qc.invalidateQueries({ queryKey: ['guides'] })
      void qc.invalidateQueries({ queryKey: ['guide'] })
      void qc.invalidateQueries({ queryKey: ['saved-guides'] })
    },
  })
}
