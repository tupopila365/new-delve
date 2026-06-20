import { useQuery } from '@tanstack/react-query'
import { fetchListingSeeAllData } from '../utils/listingSeeAll'

export function useListingSeeAll(type: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: ['listing-see-all', type, id],
    queryFn: () => fetchListingSeeAllData(type!, decodeURIComponent(id!)),
    enabled: Boolean(type && id),
    staleTime: 60_000,
  })
}
