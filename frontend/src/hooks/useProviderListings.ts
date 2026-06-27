import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ProviderStayListing } from '../components/provider/stays/stayListingTypes'
import { getProviderListings, type ProviderListing } from '../data/providerData'
import { mapStayBooking, useProviderStayBookings } from './useProviderStayData'
import type { EventListing } from '../utils/eventDisplay'

type ProviderEvent = EventListing & { is_published?: boolean }

export function useProviderListings(owner?: string): ProviderListing[] {
  const { data: apiEvents = [] } = useQuery({
    queryKey: ['provider-events', owner],
    queryFn: async () => asArray<ProviderEvent>(await apiFetch('/api/events/?mine=1')),
    enabled: Boolean(owner),
  })

  const { data: apiStays = [] } = useQuery({
    queryKey: ['provider-stays', owner],
    queryFn: async () =>
      asArray<ProviderStayListing>(await apiFetch('/api/accommodation/provider-listings/')),
    enabled: Boolean(owner),
  })

  const { data: stayBookings = [] } = useProviderStayBookings(Boolean(owner))

  const stayBookingCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of stayBookings) {
      counts.set(b.service, (counts.get(b.service) ?? 0) + 1)
    }
    return counts
  }, [stayBookings])

  return useMemo(
    () => getProviderListings(owner, apiEvents, apiStays, stayBookingCounts),
    [owner, apiEvents, apiStays, stayBookingCounts],
  )
}