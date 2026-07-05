import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ProviderGuideProfile } from '../components/provider/guides'
import type { ProviderFoodVenue } from '../components/provider/food/foodVenueTypes'
import type { ProviderBusTripListing } from '../components/provider/transport/busTripListingTypes'
import type { ProviderVehicleListing } from '../components/provider/transport/vehicleListingTypes'
import type { ProviderStayListing } from '../components/provider/stays/stayListingTypes'
import {
  busTripToProviderListing,
  foodVenueToProviderListing,
  getProviderListings,
  guidePackageToProviderListing,
  vehicleToProviderListing,
  type ProviderListing,
} from '../data/providerData'
import { useProviderStayBookings } from './useProviderStayData'
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

  const { data: guideProfile = null } = useQuery({
    queryKey: ['provider-guide-profile', owner],
    queryFn: () => apiFetch<ProviderGuideProfile | null>('/api/guides/provider-profile/'),
    enabled: Boolean(owner),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['provider-vehicles', owner],
    queryFn: async () => asArray<ProviderVehicleListing>(await apiFetch('/api/transport/provider-vehicles/')),
    enabled: Boolean(owner),
  })

  const { data: busTrips = [] } = useQuery({
    queryKey: ['provider-bus-trips', owner],
    queryFn: async () => asArray<ProviderBusTripListing>(await apiFetch('/api/transport/provider-bus-trips/')),
    enabled: Boolean(owner),
  })

  const { data: foodVenues = [] } = useQuery({
    queryKey: ['provider-food-venues', owner],
    queryFn: async () => asArray<ProviderFoodVenue>(await apiFetch('/api/food/provider-venues/')),
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

  const extraListings = useMemo(() => {
    const rows: ProviderListing[] = []
    if (guideProfile?.id) {
      for (const pkg of guideProfile.tour_packages ?? []) {
        rows.push(
          guidePackageToProviderListing(guideProfile.id, pkg, {
            regions: guideProfile.regions,
            guidePhoto: guideProfile.photo ?? null,
            rating: guideProfile.rating_avg,
            ratingCount: guideProfile.rating_count,
            isActive: guideProfile.is_active,
          }),
        )
      }
    }
    for (const v of vehicles) {
      rows.push(vehicleToProviderListing(v))
    }
    for (const t of busTrips) {
      rows.push(busTripToProviderListing(t))
    }
    for (const f of foodVenues) {
      rows.push(foodVenueToProviderListing(f))
    }
    return rows
  }, [guideProfile, vehicles, busTrips, foodVenues])

  return useMemo(
    () => getProviderListings(owner, apiEvents, apiStays, stayBookingCounts, extraListings),
    [owner, apiEvents, apiStays, stayBookingCounts, extraListings],
  )
}
