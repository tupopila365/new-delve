import { fetchPublicListings } from './listingClient'
import { fetchPublicDeals } from './dealClient'
import { listJourneys } from './journeyClient'
import type { TransportResult } from '../data/transportData'
import type { ListingPublicDto, DealDto, JourneySummary } from '@delve/contracts'

export interface HomeFeedData {
  listings: NormalizedListing[]
  deals: NormalizedDeal[]
  journeys: NormalizedJourney[]
  transport: TransportResult[]
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

export function listingToTransportResult(l: ListingPublicDto): TransportResult {
  const cover = l.media.find(m => m.isCover && m.resourceType === 'image' && m.delivery?.url)?.delivery?.url
    || l.media.find(m => m.resourceType === 'image' && m.delivery?.url)?.delivery?.url
    || 'https://images.unsplash.com/photo-1544632688-712e150321a5?w=700&h=460&fit=crop&auto=format'
  const originCity = l.business.city || 'Windhoek'

  return {
    id: l.id,
    transportGroup: 'road',
    transportMode: l.business.category || 'Transport',
    operator: l.business.name,
    operatorType: 'Verified provider',
    origin: originCity,
    destination: 'Namibia',
    departure: 'Daily departures',
    arrival: 'On schedule',
    duration: 'Direct / Scheduled',
    price: l.pricing ? String(l.pricing.amount) : 'Inquire',
    currency: l.pricing?.currency || 'NAD',
    priceBasis: 'per trip',
    capacity: 4,
    luggage: 'Standard baggage',
    accessibility: null,
    verification: { verified: true, label: 'Verified Provider' },
    cancellation: 'Flexible cancellation',
    image: cover,
    bookingMethod: 'request',
    sponsored: false,
    status: 'available',
  }
}

export async function fetchHomePageData(destination?: string | null): Promise<HomeFeedData> {
  const [listingsResult, dealsResult, journeysResult, transportResult] = await Promise.allSettled([
    fetchPublicListings({ limit: 40, city: destination || undefined }),
    fetchPublicDeals(12, undefined, { city: destination || undefined }),
    listJourneys({ destination: destination || undefined }),
    fetchPublicListings({ limit: 12, category: 'Transport', city: destination || undefined }),
  ])

  let listings: NormalizedListing[] = []
  if (listingsResult.status === 'fulfilled' && listingsResult.value && listingsResult.value.length > 0) {
    listings = listingsResult.value.map(normalizeBackendListing)
  }

  let deals: NormalizedDeal[] = []
  if (dealsResult.status === 'fulfilled' && dealsResult.value && dealsResult.value.length > 0) {
    deals = dealsResult.value.map(normalizeBackendDeal)
  }

  let journeys: NormalizedJourney[] = []
  if (journeysResult.status === 'fulfilled' && journeysResult.value && journeysResult.value.length > 0) {
    journeys = journeysResult.value.map(normalizeBackendJourney)
  }

  let transport: TransportResult[] = []
  if (transportResult.status === 'fulfilled' && transportResult.value && transportResult.value.length > 0) {
    transport = transportResult.value.map(listingToTransportResult)
  }

  return {
    listings,
    deals,
    journeys,
    transport,
  }
}
