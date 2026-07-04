import { useQuery } from '@tanstack/react-query'
import { fetchListingMoments, listingMomentsSupported } from '../utils/listingMoments'

export function useListingMoments(
  listingType: string,
  listingId: string | number | undefined,
  listingTitle: string,
) {
  const id = listingId != null ? String(listingId) : ''
  return useQuery({
    queryKey: ['listing-moments', listingType, id],
    queryFn: () => fetchListingMoments(listingType, id, listingTitle),
    enabled: Boolean(id) && listingMomentsSupported(listingType),
    staleTime: 60_000,
  })
}
