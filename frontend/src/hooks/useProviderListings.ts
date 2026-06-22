import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { getProviderListings, type ProviderListing } from '../data/providerData'
import type { EventListing } from '../utils/eventDisplay'

type ProviderEvent = EventListing & { is_published?: boolean }

export function useProviderListings(owner?: string): ProviderListing[] {
  const { data: apiEvents = [] } = useQuery({
    queryKey: ['provider-events', owner],
    queryFn: () => apiFetch<ProviderEvent[]>('/api/events/?mine=1'),
    enabled: Boolean(owner),
  })

  return useMemo(() => getProviderListings(owner, apiEvents), [owner, apiEvents])
}
