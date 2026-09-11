import { fetchPublicListings } from './listingClient'
import { fetchPublicDeals } from './dealClient'
import { listJourneys } from './journeyClient'
import { allListings, type ListingFull } from '../data/listingData'
import { allDeals, type DealFull } from '../data/dealsData'
import { allJourneys, type JourneyDetail } from '../data/journeyData'
import { transportResults, type TransportResult } from '../data/transportData'
import type { ListingPublicDto, DealDto, JourneySummary } from '@delve/contracts'

export interface HomeFeedData {
  listings: NormalizedListing[]
  deals: NormalizedDeal[]
  journeys: NormalizedJourney[]
  transport: TransportResult[]
  isLiveBackend: {
    listings: boolean
    deals: boolean
    journeys: boolean
  }
}

export interface NormalizedListing {
  id: string
  title: string
  subtitle?: string
  businessName: string
  businessCategory?: string
  destination: string
  coverImage: string
  priceFormatted?: string
  priceBasis?: string
  rating?: number
  reviewCount?: number
  verified: boolean
  category: string
  highlights?: string[]
}

export interface NormalizedDeal {
  id: string
  title: string
  businessName: string
  category: string
  destination: string
  image: string
  currentPrice: string
  discountSummary: string
  validUntil?: string
  verified: boolean
}

export interface NormalizedJourney {
  id: string
  title: string
  creatorName: string
  creatorAvatar: string
  creatorHandle: string
  coverImage: string
  route: string
  duration: string
  stopCount: number
  transportModes: string[]
  historicalCost: string
}

function normalizeBackendListing(l: ListingPublicDto): NormalizedListing {
  const cover = l.media.find(m => m.isCover && m.resourceType === 'image' && m.delivery?.url)?.delivery?.url
    || l.media.find(m => m.resourceType === 'image' && m.delivery?.url)?.delivery?.url
    || 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=700&h=460&fit=crop&auto=format'

  const location = [l.business.city, l.business.countryCode].filter(Boolean).join(', ')

  return {
    id: l.id,
    title: l.title,
    subtitle: l.description ? l.description.slice(0, 80) : undefined,
    businessName: l.business.name,
    businessCategory: l.business.category ?? undefined,
    destination: location || 'Namibia',
    coverImage: cover,
    priceFormatted: l.pricing ? `${l.pricing.currency} ${l.pricing.amount}` : undefined,
    priceBasis: l.pricing ? 'experience' : undefined,
    verified: true,
    category: l.business.category || 'Experience',
    highlights: [],
  }
}

function normalizeFallbackListing(l: ListingFull): NormalizedListing {
  return {
    id: l.id,
    title: l.title,
    subtitle: l.subtitle,
    businessName: l.business,
    businessCategory: l.serviceCategory,
    destination: l.destination,
    coverImage: l.media[0] || 'https://images.unsplash.com/photo-1582152629442-4a864303fb96?w=700&h=460&fit=crop&auto=format',
    priceFormatted: l.price && l.price !== '0' ? `${l.currency} ${l.price}` : 'Free / Inquiry',
    priceBasis: l.priceBasis,
    rating: l.rating,
    reviewCount: l.reviewCount,
    verified: l.verification.verified,
    category: l.serviceCategory,
    highlights: l.highlights?.slice(0, 3),
  }
}

function normalizeBackendDeal(d: DealDto): NormalizedDeal {
  return {
    id: d.id,
    title: d.title,
    businessName: d.business.name,
    category: d.category || 'Special Offer',
    destination: d.city || 'Namibia',
    image: d.coverUrl || 'https://images.unsplash.com/photo-1584132869994-873f9363a562?w=700&h=460&fit=crop&auto=format',
    currentPrice: d.discountValue ? `${d.currency} ${d.discountValue}` : '',
    discountSummary: d.discountSummary,
    validUntil: d.endDate ? new Date(d.endDate).toLocaleDateString() : undefined,
    verified: true,
  }
}

function normalizeFallbackDeal(d: DealFull): NormalizedDeal {
  return {
    id: d.id,
    title: d.title,
    businessName: d.business,
    category: d.serviceCategory,
    destination: d.destination,
    image: d.image,
    currentPrice: `${d.currency} ${d.currentPrice}`,
    discountSummary: d.typeLabel,
    validUntil: d.endsAt,
    verified: d.verification.verified,
  }
}

function normalizeBackendJourney(j: JourneySummary): NormalizedJourney {
  const authorName = (j as any).author?.displayName || (j as any).author?.username || (j as any).creator?.name || 'Traveler'
  const authorAvatar = (j as any).author?.avatarUrl || (j as any).creator?.avatar || ''
  const authorHandle = (j as any).author?.username ? `@${(j as any).author.username}` : ((j as any).creator?.handle || '@traveler')
  const cover = (j as any).coverUrl || (j as any).coverMedia || 'https://images.unsplash.com/photo-1652439310454-a50203f01d8f?w=900&h=600&fit=crop&auto=format'

  return {
    id: j.id,
    title: j.title,
    creatorName: authorName,
    creatorAvatar: authorAvatar,
    creatorHandle: authorHandle,
    coverImage: cover,
    route: `${j.startPlace} → ${j.endPlace}`,
    duration: `${j.durationDays ?? 3} days · ${j.stopCount} stops`,
    stopCount: j.stopCount,
    transportModes: j.transportModes || ['Car rental'],
    historicalCost: j.historicalCost ? `${j.currency} ${j.historicalCost}` : 'Variable trip cost',
  }
}

function normalizeFallbackJourney(j: JourneyDetail): NormalizedJourney {
  return {
    id: j.id,
    title: j.title,
    creatorName: j.creator.name,
    creatorAvatar: j.creator.avatar,
    creatorHandle: j.creator.handle,
    coverImage: j.coverMedia,
    route: `${j.startPlace} → ${j.endPlace}`,
    duration: `${j.durationDays} days · ${j.stopCount} stops`,
    stopCount: j.stopCount,
    transportModes: j.transportModes,
    historicalCost: `${j.currency} ${j.historicalCost}`,
  }
}

export async function fetchHomePageData(destination?: string | null): Promise<HomeFeedData> {
  const [listingsResult, dealsResult, journeysResult] = await Promise.allSettled([
    fetchPublicListings({ limit: 40, city: destination || undefined }),
    fetchPublicDeals(12, undefined, { city: destination || undefined }),
    listJourneys({ destination: destination || undefined }),
  ])

  let listings: NormalizedListing[] = []
  let isLiveListings = false
  if (listingsResult.status === 'fulfilled' && listingsResult.value && listingsResult.value.length > 0) {
    listings = listingsResult.value.map(normalizeBackendListing)
    isLiveListings = true
  } else {
    // Curated fallback
    let fallback = allListings
    if (destination) {
      const match = fallback.filter(l => l.destination.toLowerCase() === destination.toLowerCase())
      if (match.length > 0) fallback = match
    }
    listings = fallback.map(normalizeFallbackListing)
  }

  let deals: NormalizedDeal[] = []
  let isLiveDeals = false
  if (dealsResult.status === 'fulfilled' && dealsResult.value && dealsResult.value.length > 0) {
    deals = dealsResult.value.map(normalizeBackendDeal)
    isLiveDeals = true
  } else {
    let fallback = allDeals
    if (destination) {
      const match = fallback.filter(d => d.destination.toLowerCase() === destination.toLowerCase())
      if (match.length > 0) fallback = match
    }
    deals = fallback.map(normalizeFallbackDeal)
  }

  let journeys: NormalizedJourney[] = []
  let isLiveJourneys = false
  if (journeysResult.status === 'fulfilled' && journeysResult.value && journeysResult.value.length > 0) {
    journeys = journeysResult.value.map(normalizeBackendJourney)
    isLiveJourneys = true
  } else {
    journeys = allJourneys.map(normalizeFallbackJourney)
  }

  // Filter transport options if destination is active
  let transport = transportResults
  if (destination) {
    const destMatch = transportResults.filter(
      t => t.destination.toLowerCase() === destination.toLowerCase() || t.origin.toLowerCase() === destination.toLowerCase()
    )
    if (destMatch.length > 0) transport = destMatch
  }

  return {
    listings,
    deals,
    journeys,
    transport,
    isLiveBackend: {
      listings: isLiveListings,
      deals: isLiveDeals,
      journeys: isLiveJourneys,
    },
  }
}
