import { mockTrips, type MockTrip } from '../data/mockTrips'
import { findUserTrip, loadUserTrips } from '../data/userTrips'
import { mediaUrl } from '../api/client'
import type { HighlightChannelInput } from '../components/highlights/types'
import { normalizeHighlightsForSave } from '../components/highlights/highlightFormUtils'
import { parseGalleryMediaList } from '../components/listing/photos/listingGalleryMedia'

/** Demo journeys fill feeds only when VITE_USE_MOCKS=true (local dev). */
export function isJourneyDemoFallbackEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCKS === 'true'
}

/** Hardcoded + localStorage demo rows merged into list feeds in mock mode only. */
export function journeyListFallback(): MockTrip[] {
  if (!isJourneyDemoFallbackEnabled()) return []
  return [...loadUserTrips(), ...mockTrips]
}

/** Resolve a journey from demo/local sources when the mock API is active. */
export function findJourneyDemoTrip(id: number): MockTrip | undefined {
  if (!isJourneyDemoFallbackEnabled()) return undefined
  return findUserTrip(id) ?? mockTrips.find((t) => t.id === id)
}

/** Tag/country-matched similar journeys from demo data (mock mode only). */
export function similarJourneyDemoFallback(trip: MockTrip, excludeId: number): MockTrip[] {
  if (!isJourneyDemoFallbackEnabled()) return []
  return mergeJourneyFeeds([], mockTrips)
    .filter((t) => t.id !== excludeId)
    .filter(
      (t) =>
        t.countries.some((c) => trip.countries.includes(c)) ||
        t.tags.some((tag) => trip.tags.includes(tag)),
    )
    .slice(0, 3)
}

export type ApiJourney = {
  id: number
  author: {
    username: string
    display_name?: string | null
    avatar?: string | null
  }
  title: string
  summary: string
  cover_image: string | null
  starts_on: string
  starts_at?: string
  ends_on: string
  countries: string[]
  transport_modes: string[]
  party: string
  tags: string[]
  total_cost: number | string
  currency: string
  days: number
  stops: MockTrip['stops']
  costs: MockTrip['costs']
  likes_count?: number
  saves_count?: number
  comments_count?: number
  liked_by_me?: boolean
  saved_by_me?: boolean
  is_featured?: boolean
  journey_stories?: HighlightChannelInput[]
  gallery_images?: unknown[]
}

export function mapApiJourneyToTrip(j: ApiJourney): MockTrip {
  const avatar = j.author.avatar ? mediaUrl(j.author.avatar) : null
  return {
    id: j.id,
    author: {
      username: j.author.username,
      display_name: j.author.display_name?.trim() || j.author.username,
      avatar,
    },
    title: j.title,
    summary: j.summary || '',
    cover_image: j.cover_image ? (mediaUrl(j.cover_image) ?? j.cover_image) : null,
    starts_on: j.starts_on,
    ends_on: j.ends_on,
    countries: j.countries || [],
    transport_modes: j.transport_modes || [],
    party: j.party || 'solo',
    tags: j.tags || [],
    total_cost: Number(j.total_cost) || 0,
    currency: j.currency || 'NAD',
    days: j.days,
    stops: (j.stops || []).map((s) => ({
      ...s,
      cost: s.cost != null ? Number(s.cost) : undefined,
      entries: (s.entries || []).map((e) => ({
        ...e,
        image: e.image ? (mediaUrl(e.image) ?? e.image) : null,
        video: e.video ? (mediaUrl(e.video) ?? e.video) : null,
      })),
    })),
    costs: (j.costs || []).map((c) => ({
      ...c,
      amount: Number(c.amount) || 0,
    })),
    likes_count: j.likes_count ?? 0,
    saves_count: j.saves_count ?? 0,
    comments_count: j.comments_count ?? 0,
    liked_by_me: j.liked_by_me ?? false,
    saved_by_me: j.saved_by_me ?? false,
    is_featured: j.is_featured ?? false,
    journey_stories: (j.journey_stories ?? []).map((ch) => ({
      ...ch,
      slides: (ch.slides ?? []).map((s) => ({ ...s })),
    })),
    gallery_images: parseGalleryMediaList(j.gallery_images).map((item) => ({
      url: mediaUrl(item.url) ?? item.url,
      kind: item.kind,
    })),
  }
}

export function mergeJourneyFeeds(apiRows: ApiJourney[], fallback: MockTrip[]): MockTrip[] {
  const apiTrips = apiRows.map(mapApiJourneyToTrip)
  const apiIds = new Set(apiTrips.map((t) => t.id))
  const extras = fallback.filter((t) => !apiIds.has(t.id))
  // Keep admin-featured journeys ahead of organic/mock fill.
  return [...apiTrips, ...extras].sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))
}

export function buildJourneyPayload(input: {
  title: string
  summary: string
  coverImage: string
  startsOn: string
  endsOn: string
  party: string
  selectedCountries: string[]
  selectedTransport: string[]
  selectedTags: string[]
  stops: MockTrip['stops']
  costs: MockTrip['costs']
  days: number
  totalCost: number
  journeyStories?: HighlightChannelInput[]
  galleryImages?: (string | { url: string; kind: 'image' | 'video' })[]
}) {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    cover_image: input.coverImage.trim() || '',
    gallery_images: input.galleryImages ?? [],
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    countries: input.selectedCountries,
    transport_modes: input.selectedTransport,
    party: input.party,
    tags: input.selectedTags,
    total_cost: input.totalCost,
    currency: 'NAD',
    days: input.days,
    stops: input.stops,
    costs: input.costs,
    journey_stories: normalizeHighlightsForSave(input.journeyStories ?? []),
  }
}
