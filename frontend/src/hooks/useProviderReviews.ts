import { useQuery } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ProviderGuideProfile } from '../components/provider/guides'
import type { ProviderFoodVenue } from '../components/provider/food/foodVenueTypes'
import type { ProviderStayListing } from '../components/provider/stays/stayListingTypes'
import type { ProviderVehicleListing } from '../components/provider/transport/vehicleListingTypes'
import type { ProviderBusTripListing } from '../components/provider/transport/busTripListingTypes'
import { normalizeReviews } from '../components/GuestReviewCard'
import type { ListingCategory } from '../data/providerData'
import { mocksEnabled } from '../utils/useMocks'

export type ProviderReviewRow = {
  id: string
  guest: string
  listing: string
  category: ListingCategory
  rating: number
  date: string
  body: string
  needsReply: boolean
  response?: string
}

const DEMO_REVIEWS: ProviderReviewRow[] = [
  {
    id: 'demo-1',
    guest: 'Anna K.',
    listing: 'Freesia Hotel',
    category: 'Stay',
    rating: 5,
    date: '2026-04-28',
    body: 'Spotless room and great breakfast.',
    needsReply: true,
  },
  {
    id: 'demo-2',
    guest: 'Tobias L.',
    listing: 'Coastal Guesthouse',
    category: 'Stay',
    rating: 4.8,
    date: '2026-04-20',
    body: 'Loved the dune views from the terrace.',
    needsReply: false,
    response: 'Thank you — we are glad you enjoyed the terrace!',
  },
  {
    id: 'demo-3',
    guest: 'Mila K.',
    listing: 'Desert sunrise tour',
    category: 'Guide',
    rating: 5,
    date: '2026-04-15',
    body: 'Kaoko knew every photo stop on the route.',
    needsReply: true,
  },
  {
    id: 'demo-4',
    guest: 'Priya N.',
    listing: 'Oryx Grill House',
    category: 'Food',
    rating: 4.7,
    date: '2026-04-10',
    body: 'Amazing local flavours. Will definitely be back.',
    needsReply: false,
  },
]

type ReviewsPayload = {
  reviews?: unknown[]
}

async function fetchListingReviews(path: string): Promise<ReviewsPayload> {
  try {
    return await apiFetch<ReviewsPayload>(path, { auth: false })
  } catch {
    return { reviews: [] }
  }
}

function rowsFromPayload(
  payload: ReviewsPayload,
  listing: string,
  category: ListingCategory,
  prefix: string,
): ProviderReviewRow[] {
  return normalizeReviews(payload.reviews).map((r, i) => ({
    id: `${prefix}-${i}-${r.name}`,
    guest: r.name,
    listing: r.place || listing,
    category,
    rating: r.rating,
    date: '',
    body: r.body,
    needsReply: false,
  }))
}

async function loadLiveReviews(): Promise<ProviderReviewRow[]> {
  const stays = asArray<ProviderStayListing>(
    await apiFetch<ProviderStayListing[]>('/api/accommodation/provider-listings/'),
  )
  const venues = asArray<ProviderFoodVenue>(
    await apiFetch<ProviderFoodVenue[]>('/api/food/provider-venues/'),
  )
  const guideRaw = await apiFetch<ProviderGuideProfile | null>('/api/guides/provider-profile/').catch(
    () => null,
  )
  const vehicles = asArray<ProviderVehicleListing>(
    await apiFetch<ProviderVehicleListing[]>('/api/transport/provider-vehicles/'),
  )
  const busTrips = asArray<ProviderBusTripListing>(
    await apiFetch<ProviderBusTripListing[]>('/api/transport/provider-bus-trips/'),
  )

  const rows: ProviderReviewRow[] = []

  for (const stay of stays) {
    const payload = await fetchListingReviews(`/api/accommodation/listings/${stay.id}/reviews/`)
    rows.push(...rowsFromPayload(payload, stay.title, 'Stay', `stay-${stay.id}`))
  }

  for (const venue of venues) {
    const payload = await fetchListingReviews(`/api/food/venues/${venue.id}/reviews/`)
    const travelerOnly = normalizeReviews(payload.reviews).filter((_, idx) => {
      const raw = payload.reviews?.[idx] as { source?: string } | undefined
      return raw?.source !== 'seed'
    })
    rows.push(
      ...travelerOnly.map((r, i) => ({
        id: `food-${venue.id}-${i}`,
        guest: r.name,
        listing: venue.name,
        category: 'Food' as const,
        rating: r.rating,
        date: '',
        body: r.body,
        needsReply: false,
      })),
    )
  }

  if (guideRaw?.id) {
    for (const [i, r] of (guideRaw.guest_reviews ?? []).entries()) {
      rows.push({
        id: `guide-profile-${i}`,
        guest: r.name,
        listing: r.place || 'Guide profile',
        category: 'Guide',
        rating: r.rating,
        date: '',
        body: r.body,
        needsReply: false,
      })
    }
    for (const pkg of guideRaw.tour_packages ?? []) {
      for (const [i, r] of (pkg.reviews ?? []).entries()) {
        rows.push({
          id: `guide-${pkg.id}-${i}`,
          guest: r.name,
          listing: pkg.title,
          category: 'Guide',
          rating: r.rating,
          date: '',
          body: r.body,
          needsReply: false,
        })
      }
    }
  }

  for (const vehicle of vehicles) {
    const payload = await fetchListingReviews(`/api/transport/vehicles/${vehicle.id}/reviews/`)
    rows.push(...rowsFromPayload(payload, vehicle.title, 'Transport', `vehicle-${vehicle.id}`))
  }

  for (const trip of busTrips) {
    const payload = await fetchListingReviews(`/api/transport/bus/trips/${trip.id}/reviews/`)
    const label = `${trip.route_detail.origin} → ${trip.route_detail.destination}`
    rows.push(...rowsFromPayload(payload, label, 'Transport', `bus-${trip.id}`))
  }

  return rows
}

export function useProviderReviews(enabled = true) {
  return useQuery({
    queryKey: ['provider-reviews-all'],
    queryFn: async () => {
      if (mocksEnabled()) return DEMO_REVIEWS
      return loadLiveReviews()
    },
    enabled,
    staleTime: 60_000,
  })
}

export function reviewStarBreakdown(reviews: ProviderReviewRow[]) {
  if (reviews.length === 0) {
    return [
      { stars: 5, pct: 0 },
      { stars: 4, pct: 0 },
      { stars: 3, pct: 0 },
      { stars: 2, pct: 0 },
      { stars: 1, pct: 0 },
    ]
  }
  const counts = [0, 0, 0, 0, 0]
  for (const r of reviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(r.rating))) - 1
    counts[bucket] += 1
  }
  const total = reviews.length
  return [5, 4, 3, 2, 1].map((stars, idx) => ({
    stars,
    pct: Math.round((counts[4 - idx] / total) * 100),
  }))
}
