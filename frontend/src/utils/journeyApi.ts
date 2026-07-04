import type { MockTrip } from '../data/mockTrips'
import { mediaUrl } from '../api/client'

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
}) {
  return {
    title: input.title.trim(),
    summary: input.summary.trim(),
    cover_image: input.coverImage.trim() || '',
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
  }
}
