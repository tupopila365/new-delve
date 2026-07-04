import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { buildGalleryItems } from '../components/AccommodationGallery'
import { normalizeReviews, type ReviewItem } from '../components/GuestReviewCard'
import type { TourPackage } from '../components/guide/types'
import type { ListingGalleryItem, ListingMomentItem } from '../components/listing/types'
import { mockTrips } from '../data/mockTrips'
import { findUserTrip } from '../data/userTrips'
import {
  buildListingImages,
  type AccommodationListing,
} from './accommodationListing'
import {
  buildEventGalleryImages,
  type EventDetail,
} from './eventListing'
import {
  buildFoodGalleryImages,
  normalizeFoodReviews,
  type FoodVenueListing,
} from './foodListing'
import {
  buildGuideGallery,
  buildPackageGallery,
  normalizePortfolio,
  type GuideProfile,
} from './guideListing'
import {
  buildJourneyGallery,
  collectJourneyPhotos,
} from './journeyListing'
import { fetchListingMoments } from './listingMoments'
import { normalizeTourPackages } from './tourPackages'
import {
  buildBusGalleryImages,
  buildVehicleGalleryImages,
  type BusTripListing,
  type VehicleListing,
} from './transportListing'

export type ListingSeeAllType =
  | 'accommodation'
  | 'food'
  | 'guide'
  | 'guide-package'
  | 'journey'
  | 'event'
  | 'transport'

export type ListingSeeAllSection = 'gallery' | 'reviews' | 'moments'

export type ListingSeeAllData = {
  listingTitle: string
  backTo: string
  gallery: {
    title: string
    images: ListingGalleryItem[]
  }
  reviews: {
    title: string
    reviews: ReviewItem[]
    rating?: string | null
    count?: number | null
  }
  moments: {
    title: string
    moments: ListingMomentItem[]
  }
}

export function listingSeeAllPath(
  listingType: string,
  listingId: string | number,
  section: ListingSeeAllSection,
): string {
  return `/listing/${listingType}/${encodeURIComponent(String(listingId))}/${section}`
}

function parseGuidePackageCompositeId(compositeId: string): { guideId: string; packageId: string } | null {
  const match = compositeId.match(/^(\d+)-(.+)$/)
  if (!match) return null
  return { guideId: match[1], packageId: match[2] }
}

function packageReviewMeta(pkg: TourPackage, guide: GuideProfile) {
  const packageReviews = pkg.reviews ?? []
  if (packageReviews.length > 0) {
    const avg = packageReviews.reduce((sum, r) => sum + Number(r.rating ?? 0), 0) / packageReviews.length
    return {
      reviews: packageReviews,
      rating: avg.toFixed(1),
      count: packageReviews.length,
      title: 'Reviews for this experience',
    }
  }

  const guideReviews = normalizeReviews(guide.guest_reviews).slice(0, 50)
  return {
    reviews: guideReviews,
    rating: guide.rating_avg ?? null,
    count: guide.rating_count ?? (guideReviews.length > 0 ? guideReviews.length : null),
    title: 'Guest reviews',
  }
}

const EMPTY_MOMENTS: ListingMomentItem[] = []

async function fetchAccommodationSeeAll(id: string): Promise<ListingSeeAllData> {
  const data = await apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, { auth: false })
  const moments = await fetchListingMoments('accommodation', id, data.title)
  return {
    listingTitle: data.title,
    backTo: `/accommodation/${id}`,
    gallery: { title: 'Photos', images: buildListingImages(data) },
    reviews: {
      title: 'Reviews',
      reviews: normalizeReviews(data.guest_reviews),
      rating: data.rating_avg ?? null,
      count: data.rating_count ?? null,
    },
    moments: {
      title: 'From Delvers',
      moments,
    },
  }
}

async function fetchFoodSeeAll(id: string): Promise<ListingSeeAllData> {
  const data = await apiFetch<FoodVenueListing>(`/api/food/venues/${id}/`, { auth: false })
  const [moments, reviewPayload] = await Promise.all([
    fetchListingMoments('food', id, data.name),
    apiFetch<{ reviews: unknown[]; rating_avg: number | string | null; rating_count: number }>(
      `/api/food/venues/${id}/reviews/`,
      { auth: false },
    ),
  ])

  return {
    listingTitle: data.name,
    backTo: `/food/${id}`,
    gallery: { title: 'Photos', images: buildFoodGalleryImages(data) },
    reviews: {
      title: 'Reviews',
      reviews: normalizeReviews(reviewPayload.reviews),
      rating: reviewPayload.rating_avg ?? data.rating_avg ?? null,
      count: reviewPayload.rating_count ?? data.rating_count ?? null,
    },
    moments: { title: 'From Delvers', moments },
  }
}

async function fetchGuideSeeAll(id: string): Promise<ListingSeeAllData> {
  const guide = await apiFetch<GuideProfile>(`/api/guides/profiles/${id}/`, { auth: false })
  const portfolio = normalizePortfolio(guide.portfolio_gallery)
  const packages = normalizeTourPackages(guide.tour_packages)

  return {
    listingTitle: guide.headline,
    backTo: `/guides/${id}`,
    gallery: {
      title: 'Photos',
      images: buildGuideGallery(guide, portfolio, packages),
    },
    reviews: {
      title: 'Reviews',
      reviews: normalizeReviews(guide.guest_reviews),
      rating: guide.rating_avg ?? null,
      count: guide.rating_count ?? null,
    },
    moments: {
      title: 'From Delvers',
      moments: EMPTY_MOMENTS,
    },
  }
}

async function fetchGuidePackageSeeAll(compositeId: string): Promise<ListingSeeAllData> {
  const parsed = parseGuidePackageCompositeId(compositeId)
  if (!parsed) throw new ApiError('Invalid guide package id.', 404, null)

  const guide = await apiFetch<GuideProfile>(`/api/guides/profiles/${parsed.guideId}/`, { auth: false })
  const packages = normalizeTourPackages(guide.tour_packages)
  const pkg = packages.find((p) => p.id === parsed.packageId)
  if (!pkg) throw new ApiError('Guide package not found.', 404, null)

  const reviewMeta = packageReviewMeta(pkg, guide)
  const backTo = `/guides/${parsed.guideId}/packages/${encodeURIComponent(pkg.id)}`

  return {
    listingTitle: pkg.title,
    backTo,
    gallery: {
      title: 'Photos',
      images: buildPackageGallery(pkg, guide),
    },
    reviews: {
      title: reviewMeta.title,
      reviews: reviewMeta.reviews,
      rating: reviewMeta.rating,
      count: reviewMeta.count,
    },
    moments: {
      title: 'From Delvers',
      moments: EMPTY_MOMENTS,
    },
  }
}

function fetchJourneySeeAll(id: string): ListingSeeAllData {
  const trip = findUserTrip(Number(id)) ?? mockTrips.find((t) => t.id === Number(id))
  if (!trip) throw new ApiError('Journey not found.', 404, null)

  const photoItems = collectJourneyPhotos(trip)

  return {
    listingTitle: trip.title,
    backTo: `/journeys/${id}`,
    gallery: {
      title: 'Photos',
      images: buildJourneyGallery(trip, photoItems),
    },
    reviews: {
      title: 'Reviews',
      reviews: [],
      rating: null,
      count: null,
    },
    moments: {
      title: 'From Delvers',
      moments: EMPTY_MOMENTS,
    },
  }
}

async function fetchEventSeeAll(id: string): Promise<ListingSeeAllData> {
  const event = await apiFetch<EventDetail>(`/api/events/${id}/`, { auth: false })
  const moments = await fetchListingMoments('event', id, event.title)

  return {
    listingTitle: event.title,
    backTo: `/events/${id}`,
    gallery: {
      title: 'Photos',
      images: buildEventGalleryImages(event),
    },
    reviews: {
      title: 'Reviews',
      reviews: [],
      rating: null,
      count: null,
    },
    moments: {
      title: 'From Delvers',
      moments,
    },
  }
}

async function fetchTransportSeeAll(id: string): Promise<ListingSeeAllData> {
  try {
    const vehicle = await apiFetch<VehicleListing>(`/api/transport/vehicles/${id}/`, { auth: false })
    const gallery = buildVehicleGalleryImages(vehicle)
    const [moments, reviewPayload] = await Promise.all([
      fetchListingMoments('vehicle', id, vehicle.title),
      apiFetch<{ reviews: unknown[]; rating_avg: string | null; rating_count: number }>(
        `/api/transport/vehicles/${id}/reviews/`,
        { auth: false },
      ),
    ])
    return {
      listingTitle: vehicle.title,
      backTo: `/transport/vehicle/${id}`,
      gallery: { title: 'Photos', images: gallery },
      reviews: {
        title: 'Reviews',
        reviews: normalizeReviews(reviewPayload.reviews),
        rating: reviewPayload.rating_avg ?? vehicle.rating_avg ?? null,
        count: reviewPayload.rating_count ?? vehicle.rating_count ?? null,
      },
      moments: { title: 'From Delvers', moments },
    }
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err
  }

  const trip = await apiFetch<BusTripListing>(`/api/transport/bus/trips/${id}/`, { auth: false })
  const gallery = buildBusGalleryImages(trip)
  const title = `${trip.route_detail.origin} → ${trip.route_detail.destination}`
  const [moments, reviewPayload] = await Promise.all([
    fetchListingMoments('bus_trip', id, title),
    apiFetch<{ reviews: unknown[]; rating_avg: string | null; rating_count: number }>(
      `/api/transport/bus/trips/${id}/reviews/`,
      { auth: false },
    ),
  ])

  return {
    listingTitle: title,
    backTo: `/transport/bus/${id}`,
    gallery: { title: 'Photos', images: gallery },
    reviews: {
      title: 'Reviews',
      reviews: normalizeReviews(reviewPayload.reviews),
      rating: reviewPayload.rating_avg,
      count: reviewPayload.rating_count,
    },
    moments: { title: 'From Delvers', moments },
  }
}

export async function fetchListingSeeAllData(type: string, id: string): Promise<ListingSeeAllData> {
  switch (type as ListingSeeAllType) {
    case 'accommodation':
      return fetchAccommodationSeeAll(id)
    case 'food':
      return fetchFoodSeeAll(id)
    case 'guide':
      return fetchGuideSeeAll(id)
    case 'guide-package':
      return fetchGuidePackageSeeAll(id)
    case 'journey':
      return fetchJourneySeeAll(id)
    case 'event':
      return fetchEventSeeAll(id)
    case 'transport':
      return fetchTransportSeeAll(id)
    default:
      throw new ApiError('Unknown listing type.', 404, null)
  }
}
