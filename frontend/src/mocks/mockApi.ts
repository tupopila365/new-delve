import { ApiError } from '../api/client'
import { mockTrips, type MockTrip } from '../data/mockTrips'
import { mockBusinessProfiles } from '../data/businessProfiles'
import { enrichFoodVenueDetail } from '../data/foodVenueSocial'
import {
  mockBusTrips,
  mockEvents,
  mockFood,
  mockGuides,
  mockPosts,
  mockProfiles,
  mockStays,
  mockVehicles,
  type MockPost,
  type MockProfile,
} from './mockData'

type MockJourney = MockTrip & { starts_at: string; visibility?: string; is_hidden?: boolean; is_featured?: boolean }

type MockJourneyQuestionRow = {
  id: number
  journey_id: number
  author: string
  body: string
  is_hidden?: boolean
  created_at: string
  answers: { id: number; author: string; body: string; is_official?: boolean; created_at: string }[]
}

type MockState = {
  currentUser: string | null
  profiles: Record<string, MockProfile>
  posts: MockPost[]
  nextPostId: number
  likes: Record<string, number[]>
  saves: Record<string, number[]>
  comments: Record<string, MockComment[]>
  nextCommentId: number
  commentHelpful: Record<string, number[]>
  follows: Record<string, string[]>
  journeys: MockJourney[]
  nextJourneyId: number
  journeyLikes: Record<string, number[]>
  journeySaves: Record<string, number[]>
  journeyQuestions: MockJourneyQuestionRow[]
  nextJourneyQuestionId: number
  nextJourneyAnswerId: number
}

type MockComment = {
  id: number
  author: { username: string; display_name: string; avatar: string | null }
  body: string
  created_at: string
  is_hidden?: boolean
  is_accepted_answer?: boolean
  helpful_count?: number
  marked_helpful_by_me?: boolean
}

const KEY = 'delve_mock_state_v8'

/** In-memory accommodation bookings for mock API (session only). */
type MockAccBookingRow = {
  id: number
  listing: number
  listing_title: string
  guest?: string
  check_in: string
  check_out: string
  guests: number
  total_price: string
  special_requests: string
  room_type_name: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'refunded'
  mock_payment_ref: string
}
const mockAccBookings = new Map<number, MockAccBookingRow>()
let mockAccNextBookingId = 1

/** token -> username for email verification flow in mock mode */
const mockVerificationTokens = new Map<string, string>()

function issueMockTokens(username: string) {
  return { access: `mock_access_${username}`, refresh: `mock_refresh_${username}` }
}

function createMockVerificationToken(username: string) {
  const token = crypto.randomUUID()
  mockVerificationTokens.set(token, username)
  return token
}

type MockAccQuestionRow = {
  id: number
  listing: number
  listing_title: string
  author: string
  body: string
  ago: string
  answers: { id: number; author: string; body: string; ago: string; is_official?: boolean }[]
}
const mockAccQuestions: MockAccQuestionRow[] = []
let mockAccNextQuestionId = 1
let mockAccNextAnswerId = 1

type MockFoodQuestionRow = {
  id: number
  listing: number
  listing_title: string
  author: string
  body: string
  ago: string
  answers: { id: number; author: string; body: string; ago: string; is_official?: boolean }[]
}
const mockFoodQuestions: MockFoodQuestionRow[] = []
let mockFoodNextQuestionId = 1
let mockFoodNextAnswerId = 1

type MockAccReviewRow = {
  listing: number
  booking: number
  name: string
  rating: number
  body: string
  created_at: string
}
const mockAccReviews: MockAccReviewRow[] = []
const mockAccReviewedBookings = new Set<number>()

type MockTransportReviewRow = {
  listing: number
  name: string
  rating: number
  body: string
  created_at: string
}
const mockVehSessionReviews: MockTransportReviewRow[] = []
const mockBusTripSessionReviews: MockTransportReviewRow[] = []
const mockVehReviewedBookings = new Set<number>()
const mockBusReviewedReservations = new Set<number>()

type MockFoodReviewRow = {
  listing: number
  name: string
  rating: number
  body: string
  created_at: string
}
const mockFoodSessionReviews: MockFoodReviewRow[] = []
const mockFoodReviewedVenues = new Set<string>()

const MOCK_ACC_BLOCKING = new Set(['pending', 'confirmed', 'checked_in'])

function mockAccDatesOverlap(aIn: string, aOut: string, bIn: string, bOut: string) {
  return aIn < bOut && aOut > bIn
}

function mockAccBlockedRanges(listingId: number, roomType = '') {
  return [...mockAccBookings.values()].filter(
    (b) =>
      b.listing === listingId &&
      MOCK_ACC_BLOCKING.has(b.status) &&
      (b.room_type_name || '').trim() === roomType.trim(),
  )
}

function mockAccHasOverlap(listingId: number, checkIn: string, checkOut: string, roomType = '') {
  return mockAccBlockedRanges(listingId, roomType.trim()).some((b) =>
    mockAccDatesOverlap(checkIn, checkOut, b.check_in, b.check_out),
  )
}

/** Mock guide bookings (session only). */
type MockGuideBookingRow = {
  id: number
  guide: number
  guide_headline: string
  total_price: string
  status: string
  mock_payment_ref: string
}
const mockGuideBookings = new Map<number, MockGuideBookingRow & Record<string, unknown>>()
let mockGuideBookingNextId = 1

/** Extra seats taken during this mock session (reservations not stored past ids map). */
const mockBusSessionTaken = new Map<number, Set<number>>()
let nextBusReservationId = 7000
const mockBusReservationRows = new Map<
  number,
  {
    id: number
    trip: number
    seat_number: number
    status: 'pending' | 'confirmed' | 'cancelled'
    mock_payment_ref: string
    client?: string
  }
>()

type MockFoodReservationRow = {
  id: number
  venue: number
  client: string
  reserved_for: string
  party_size: number
  special_requests: string
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'refunded'
}
let nextFoodReservationId = 8000
const mockFoodReservationRows = new Map<number, MockFoodReservationRow>()

type MockVehicleBookingRow = {
  id: number
  listing: number
  client?: string
  start_date: string
  end_date: string
  pickup_area?: string
  total_price: string
  status: 'pending' | 'confirmed'
  mock_payment_ref: string
  renter_documents?: { doc_type: string; file_name: string; image_data: string }[]
}
const mockVehicleBookings = new Map<number, MockVehicleBookingRow>()
let mockVehicleBookingNextId = 8000

type MockUserBusiness = {
  id: number
  slug: string
  owner_username: string
  business_name: string
  business_types: string[]
  transport_modes?: ('rental' | 'shared')[]
  verification_status: string
  description: string
  tagline: string
  logo: string | null
  cover_image: string | null
  region: string
  city: string
  onboarding_completed: boolean
  verification_notes?: string
}

const mockUserBusinesses = new Map<string, MockUserBusiness[]>()
let mockUserBusinessNextId = 9000

const ownerBusinessPermissions = {
  role: 'owner' as const,
  permissions: {
    view_dashboard: true,
    manage_bookings: true,
    manage_listings: true,
    manage_team: true,
    manage_payouts: true,
    manage_settings: true,
  },
}

function serializeMyBusiness(b: MockUserBusiness) {
  return { ...b, ...ownerBusinessPermissions }
}

type PublicBusinessSource = (typeof mockBusinessProfiles)[number] | MockUserBusiness

function serializePublicBusiness(b: PublicBusinessSource) {
  const extras = mockBusinessProfiles.find((row) => row.id === b.id)
  return {
    id: b.id,
    slug: b.slug,
    owner_username: b.owner_username,
    business_name: b.business_name,
    business_types: b.business_types,
    verification_status: b.verification_status,
    description: b.description,
    tagline: b.tagline ?? '',
    logo: b.logo,
    cover_image: b.cover_image,
    region: b.region,
    city: b.city,
    stats: {
      listings_count: extras?.listings_count ?? 0,
      rating_avg: extras?.rating_avg ?? null,
      rating_count: extras?.rating_count ?? 0,
      response_hours: extras?.response_hours ?? null,
    },
  }
}

function mockBusinessListingsFor(b: PublicBusinessSource) {
  const owner = b.owner_username
  const transportModes: ('rental' | 'shared')[] = b.transport_modes?.length
    ? b.transport_modes
    : b.business_types.includes('transport')
      ? ['rental', 'shared']
      : []
  const items: Array<{
    kind: 'stays' | 'food' | 'guides' | 'transport' | 'events'
    transport_mode?: 'rental' | 'shared'
    id: number
    title: string
    subtitle: string
    image: string | null
    href: string
    meta: string | null
  }> = []

  mockStays
    .filter((s) => s.owner_username === owner)
    .forEach((s) => {
      items.push({
        kind: 'stays',
        id: s.id,
        title: s.title,
        subtitle: s.property_type ? `${s.property_type} · ${s.city}` : s.city,
        image: s.cover_image ?? null,
        href: `/accommodation/${s.id}`,
        meta: `N$${s.price_per_night}/night`,
      })
    })

  mockFood
    .filter((f) => f.owner_username === owner)
    .forEach((f) => {
      items.push({
        kind: 'food',
        id: f.id,
        title: f.name,
        subtitle: f.cuisine,
        image: f.cover_image ?? null,
        href: `/food/${f.id}`,
        meta: null,
      })
    })

  mockGuides
    .filter((g) => g.username === owner)
    .forEach((g) => {
      items.push({
        kind: 'guides',
        id: g.id,
        title: g.display_name || g.username,
        subtitle: g.headline,
        image: g.photo ?? null,
        href: `/guides/${g.id}`,
        meta: g.hourly_rate ? `N$${g.hourly_rate}/hr` : null,
      })
    })

  if (transportModes.includes('rental')) {
    mockVehicles
      .filter((v) => v.owner_username === owner)
      .forEach((v) => {
        items.push({
          kind: 'transport',
          transport_mode: 'rental',
          id: v.id,
          title: v.title,
          subtitle: [v.city, v.vehicle_type].filter(Boolean).join(' · '),
          image: v.cover_image ?? v.gallery_images?.[0] ?? null,
          href: `/transport/vehicle/${v.id}`,
          meta: `N$${v.price_per_day}/day`,
        })
      })
  }

  if (transportModes.includes('shared')) {
    const now = Date.now()
    mockBusTrips
      .filter((t) => (t as { owner_username?: string }).owner_username === owner)
      .filter((t) => t.is_active !== false && new Date(t.departs_at).getTime() >= now)
      .forEach((t) => {
        const dep = new Date(t.departs_at)
        const depLabel = Number.isNaN(dep.getTime())
          ? t.departs_at
          : dep.toLocaleDateString('en-NA', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
        items.push({
          kind: 'transport',
          transport_mode: 'shared',
          id: t.id,
          title: `${t.route_detail.origin} → ${t.route_detail.destination}`,
          subtitle: `${t.route_detail.operator_name} · ${depLabel}`,
          image: t.route_detail.cover_image ?? t.route_detail.gallery_images?.[0] ?? null,
          href: `/transport/bus/${t.id}`,
          meta: `N$${t.price}/seat`,
        })
      })
  }

  mockEvents
    .filter((e) => e.organizer_username === owner)
    .forEach((e) => {
      items.push({
        kind: 'events',
        id: e.id,
        title: e.title,
        subtitle: e.venue || [e.city, e.region].filter(Boolean).join(', '),
        image: e.cover_image ?? null,
        href: `/events/${e.id}`,
        meta: e.is_free ? 'Free' : e.price ? `N$${e.price}` : null,
      })
    })

  return items
}

function allPublicBusinesses(): PublicBusinessSource[] {
  const created = Array.from(mockUserBusinesses.values()).flat()
  return [...mockBusinessProfiles, ...created]
}

function findPublicBusinessById(id: number): PublicBusinessSource | undefined {
  return allPublicBusinesses().find((b) => b.id === id)
}

function rentalDaysInclusive(start: string, end: string): number | null {
  if (!start || !end) return null
  const a = new Date(start)
  const b = new Date(end)
  if (b < a) return null
  const diff = b.getTime() - a.getTime()
  const n = Math.round(diff / (1000 * 60 * 60 * 24)) + 1
  return n > 0 ? n : null
}

function busTripOccupied(tripId: number): number[] {
  const t = mockBusTrips.find((x) => x.id === tripId)
  const s = new Set<number>([...(t?.occupied_seats ?? [])])
  const extra = mockBusSessionTaken.get(tripId)
  extra?.forEach((n) => s.add(n))
  return [...s].sort((a, b) => a - b)
}

function busTripDetailForApi(t: (typeof mockBusTrips)[number]) {
  const occ = busTripOccupied(t.id)
  const available = Math.max(0, t.total_seats - occ.length)
  return {
    id: t.id,
    route: t.id,
    route_detail: t.route_detail,
    departs_at: t.departs_at,
    arrives_at: t.arrives_at,
    price: t.price,
    total_seats: t.total_seats,
    amenities: t.amenities ?? [],
    is_active: t.is_active,
    occupied_seats: occ,
    available_seats: available,
  }
}

function formatBusReservationRow(row: {
  id: number
  trip: number
  seat_number: number
  status: string
  mock_payment_ref: string
}) {
  return {
    id: row.id,
    trip: row.trip,
    seat_number: row.seat_number,
    passenger: 1,
    status: row.status,
    mock_payment_ref: row.mock_payment_ref,
    created_at: nowIso(),
  }
}

function nowIso() {
  return new Date().toISOString()
}

/** Session-local likes on accommodation listings (listing id → usernames). */
const mockListingLikes = new Map<number, Set<string>>()
const mockListingSaves = new Map<number, Set<string>>()
const mockFoodVenueSaves = new Map<number, Set<string>>()
const mockGuideSaves = new Map<number, Set<string>>()
const mockGuideQuestions = new Map<number, { id: number; author: string; body: string; ago: string; answers: { id: number; author: string; body: string; ago: string; is_official?: boolean }[] }[]>()
const mockGuideReviews = new Map<number, { id: number; name: string; place: string; rating: number; body: string; source: string }[]>()
let mockGuideQuestionNextId = 1
let mockGuideReviewNextId = 1

type MockFeaturedCampaign = {
  id: number
  placement: string
  target_type: string
  target_id: number
  region: string
  starts_at: string
  ends_at: string
  status: 'requested' | 'scheduled' | 'active' | 'expired' | 'rejected' | 'cancelled'
  priority: number
  label: string
}

const PLACEMENT_MAX_SLOTS: Record<string, number> = {
  homepage_stays: 2,
  homepage_guides: 2,
  homepage_food: 2,
  homepage_events: 2,
  homepage_transport: 2,
  delvers_feed: 2,
  community_feed: 2,
}

let mockFeaturedCampaigns: MockFeaturedCampaign[] = [
  {
    id: 1,
    placement: 'homepage_stays',
    target_type: 'accommodation',
    target_id: 101,
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
    priority: 10,
    label: 'Featured Partner',
  },
  {
    id: 2,
    placement: 'homepage_food',
    target_type: 'food',
    target_id: 501,
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
    priority: 8,
    label: 'Featured Partner',
  },
  {
    id: 6,
    placement: 'homepage_guides',
    target_type: 'guide',
    target_id: 601,
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
    priority: 10,
    label: 'Featured Partner',
  },
  {
    id: 3,
    placement: 'category_spotlight',
    target_type: 'food',
    target_id: 501,
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
    priority: 10,
    label: 'Featured Partner',
  },
  {
    id: 7,
    placement: 'category_spotlight',
    target_type: 'guide',
    target_id: 601,
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
    priority: 9,
    label: 'Featured Partner',
  },
  {
    id: 4,
    placement: 'delvers_feed',
    target_type: 'accommodation',
    target_id: 101,
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
    priority: 10,
    label: 'Sponsored',
  },
  {
    id: 5,
    placement: 'delvers_feed',
    target_type: 'post',
    target_id: 702,
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'active',
    priority: 8,
    label: 'Sponsored',
  },
]

const PROMOTION_PRICING = [
  { placement: 'homepage_stays', label: 'Homepage — Featured stays', price_label: 'N$2,500 / week', note: 'Up to 2 slots on the stays rail' },
  { placement: 'homepage_guides', label: 'Homepage — Featured guides', price_label: 'N$2,000 / week', note: 'Up to 2 slots' },
  { placement: 'homepage_food', label: 'Homepage — Featured food', price_label: 'N$1,800 / week', note: 'Up to 2 slots' },
  { placement: 'homepage_events', label: 'Homepage — Featured events', price_label: 'N$1,500 / week', note: 'Up to 2 slots' },
  { placement: 'homepage_transport', label: 'Homepage — Featured transport', price_label: 'N$1,800 / week', note: 'Up to 2 slots' },
  { placement: 'delvers_feed', label: 'Delvers feed — Sponsored', price_label: 'N$1,200 / week', note: 'Positions 3 & 8 in feed' },
]

const PLACEMENT_LABELS: Record<string, string> = {
  homepage_stays: 'Homepage — Featured stays',
  homepage_guides: 'Homepage — Featured guides',
  homepage_food: 'Homepage — Featured food',
  homepage_events: 'Homepage — Featured events',
  homepage_transport: 'Homepage — Featured transport',
  delvers_feed: 'Delvers feed — Sponsored',
}

type MockPromotionProduct = {
  id: number
  slug: string
  name: string
  placement: string
  placement_label: string
  region: string
  duration_days: number
  price_cents: number
  price_display: string
  currency: string
}

type MockProviderCampaign = {
  id: number
  placement: string
  placement_label: string
  target_type: string
  target_id: string
  target_label: string
  region: string
  starts_at: string
  ends_at: string
  status: 'pending_payment' | 'requested' | 'scheduled' | 'active' | 'expired' | 'rejected' | 'cancelled' | 'refunded'
  status_label: string
  is_live: boolean
  label: string
  product_id: number | null
  product_name: string | null
  amount_cents: number
  amount_display: string
  currency: string
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
  payment_status_label: string
  payment_provider: string
  payment_ref: string
  receipt_number: string
  paid_at: string | null
  refunded_at: string | null
  refund_amount_cents: number
  refund_reason: string
  can_pay: boolean
  can_cancel: boolean
  refund_preview: { amount_cents: number; amount_display: string; note: string }
  provider_notes: string
  rejection_reason: string
  metrics?: {
    impressions: number
    clicks: number
    listing_opens: number
    bookings: number
    ctr_pct: number
    underperforming: boolean
  }
  created_at: string
}

const MOCK_PROMOTION_PRODUCTS: MockPromotionProduct[] = [
  { id: 1, slug: 'homepage_stays_7d_national', name: 'Homepage featured 7 days — Stays — National', placement: 'homepage_stays', placement_label: PLACEMENT_LABELS.homepage_stays, region: '', duration_days: 7, price_cents: 250_000, price_display: 'N$2,500.00', currency: 'NAD' },
  { id: 2, slug: 'homepage_stays_7d_khomas', name: 'Homepage featured 7 days — Stays — Khomas', placement: 'homepage_stays', placement_label: PLACEMENT_LABELS.homepage_stays, region: 'Khomas', duration_days: 7, price_cents: 250_000, price_display: 'N$2,500.00', currency: 'NAD' },
  { id: 3, slug: 'homepage_food_7d_national', name: 'Homepage featured 7 days — Food — National', placement: 'homepage_food', placement_label: PLACEMENT_LABELS.homepage_food, region: '', duration_days: 7, price_cents: 180_000, price_display: 'N$1,800.00', currency: 'NAD' },
  { id: 4, slug: 'delvers_feed_7d_national', name: 'Sponsored 7 days — Delvers feed — National', placement: 'delvers_feed', placement_label: PLACEMENT_LABELS.delvers_feed, region: '', duration_days: 7, price_cents: 120_000, price_display: 'N$1,200.00', currency: 'NAD' },
]

let providerPromotionIdCounter = 1
let mockProviderPromotionRequests: MockProviderCampaign[] = []

const mockPromotionMetrics: Record<number, { impressions: number; clicks: number; listing_opens: number }> = {
  1: { impressions: 1240, clicks: 62, listing_opens: 18 },
  2: { impressions: 890, clicks: 12, listing_opens: 4 },
  3: { impressions: 420, clicks: 28, listing_opens: 9 },
  4: { impressions: 680, clicks: 41, listing_opens: 11 },
}

function mockRefundPreview(c: MockProviderCampaign) {
  const now = Date.now()
  const start = new Date(c.starts_at).getTime()
  const end = new Date(c.ends_at).getTime()
  if (c.payment_status !== 'paid') {
    return { amount_cents: 0, amount_display: '', note: 'No payment to refund.' }
  }
  if (now < start) {
    return { amount_cents: c.amount_cents, amount_display: c.amount_display, note: 'Full refund — cancelled before the campaign starts.' }
  }
  if (now >= end) {
    return { amount_cents: 0, amount_display: '', note: 'Campaign has ended — no refund.' }
  }
  const remaining = Math.max(0, end - now)
  const total = Math.max(1, end - start)
  const refund = Math.floor(c.amount_cents * (remaining / total) * 0.5)
  return {
    amount_cents: refund,
    amount_display: refund ? `N$${(refund / 100).toFixed(2)}` : '',
    note: refund ? 'Partial refund — 50% of unused time.' : 'No refund — less than one day unused.',
  }
}

function enrichMockCampaign(c: MockProviderCampaign): MockProviderCampaign {
  const canPay = c.status === 'pending_payment' && c.payment_status === 'pending'
  const canCancel = ['pending_payment', 'scheduled', 'active'].includes(c.status)
  const m = mockPromotionMetrics[c.id] ?? { impressions: 0, clicks: 0, listing_opens: 0 }
  const ctr_pct = m.impressions ? Math.round((m.clicks / m.impressions) * 10000) / 100 : 0
  return {
    ...c,
    can_pay: canPay,
    can_cancel: canCancel,
    refund_preview: mockRefundPreview(c),
    is_live: c.status === 'active',
    metrics: {
      impressions: m.impressions,
      clicks: m.clicks,
      listing_opens: m.listing_opens,
      bookings: Math.floor(m.listing_opens * 0.15),
      ctr_pct,
      underperforming: m.impressions >= 50 && ctr_pct < 1,
    },
  }
}

function activeFeaturedCampaigns(placement: string, region: string, targetType?: string) {
  const now = Date.now()
  region = region.trim()
  return mockFeaturedCampaigns
    .filter((c) => c.placement === placement && !['cancelled', 'requested', 'rejected', 'pending_payment', 'refunded'].includes(c.status))
    .filter((c) => (targetType ? c.target_type === targetType : true))
    .filter((c) => {
      const start = new Date(c.starts_at).getTime()
      const end = new Date(c.ends_at).getTime()
      return now >= start && now <= end
    })
    .filter((c) => (region ? !c.region || c.region.toLowerCase() === region.toLowerCase() : !c.region))
    .sort((a, b) => b.priority - a.priority)
}

function mergeFeaturedRail<T extends { id: number }>(
  s: MockState,
  placement: string,
  region: string,
  source: T[],
  enrich: (row: T) => Record<string, unknown>,
  limit = 8,
) {
  const max = PLACEMENT_MAX_SLOTS[placement] ?? 2
  const campaigns = activeFeaturedCampaigns(placement, region).slice(0, max)
  const promotedIds = new Set<number>()
  const promoted: Record<string, unknown>[] = []

  for (const campaign of campaigns) {
    if (promotedIds.has(campaign.target_id)) continue
    const row = source.find((x) => x.id === campaign.target_id)
    if (!row) continue
    promotedIds.add(campaign.target_id)
    promoted.push({
      ...enrich(row),
      is_featured_partner: true,
      partner_label: campaign.label,
      promotion_id: campaign.id,
    })
  }

  let organic = source.filter((row) => !promotedIds.has(row.id))
  if (region) {
    const r = region.toLowerCase()
    organic = organic.filter((row) => {
      const rec = row as Record<string, unknown>
      const regionVal = String(rec.region ?? '')
      const cityVal = String(rec.city ?? '')
      const regionsVal = Array.isArray(rec.regions) ? rec.regions.join(' ') : ''
      return regionVal.toLowerCase().includes(r) || cityVal.toLowerCase().includes(r) || regionsVal.toLowerCase().includes(r)
    })
  }
  const remaining = Math.max(0, limit - promoted.length)
  const organicRows = organic.slice(0, remaining).map((row) => ({
    ...enrich(row),
    is_featured_partner: false,
    partner_label: '',
  }))
  return [...promoted, ...organicRows]
}

function mergeFeaturedTransport(region: string, limit = 8) {
  const placement = 'homepage_transport'
  const max = PLACEMENT_MAX_SLOTS[placement] ?? 2
  const campaigns = activeFeaturedCampaigns(placement, region).slice(0, max)
  const promotedVehicleIds = new Set<number>()
  const promotedTripIds = new Set<number>()
  const promoted: Record<string, unknown>[] = []

  for (const campaign of campaigns) {
    if (campaign.target_type === 'bus_trip') {
      if (promotedTripIds.has(campaign.target_id)) continue
      const row = mockBusTrips.find((x) => x.id === campaign.target_id && x.is_active)
      if (!row) continue
      promotedTripIds.add(campaign.target_id)
      promoted.push({
        ...busTripDetailForApi(row),
        is_featured_partner: true,
        partner_label: campaign.label,
        promotion_id: campaign.id,
      })
      continue
    }
    if (campaign.target_type === 'vehicle') {
      if (promotedVehicleIds.has(campaign.target_id)) continue
      const row = mockVehicles.find((x) => x.id === campaign.target_id)
      if (!row) continue
      promotedVehicleIds.add(campaign.target_id)
      promoted.push({
        ...row,
        is_featured_partner: true,
        partner_label: campaign.label,
        promotion_id: campaign.id,
      })
    }
  }

  const remaining = Math.max(0, limit - promoted.length)
  const r = region.trim().toLowerCase()

  let organicVehicles = mockVehicles.filter((row) => !promotedVehicleIds.has(row.id))
  if (r) {
    organicVehicles = organicVehicles.filter(
      (row) => row.region.toLowerCase().includes(r) || (row.city || '').toLowerCase().includes(r),
    )
  }
  const vehicleRows = organicVehicles.slice(0, remaining).map((row) => ({
    ...row,
    is_featured_partner: false,
    partner_label: '',
  }))

  const tripRemaining = Math.max(0, remaining - vehicleRows.length)
  const now = Date.now()
  let organicTrips = mockBusTrips.filter(
    (row) => row.is_active && !promotedTripIds.has(row.id) && new Date(row.departs_at).getTime() >= now,
  )
  if (r) {
    organicTrips = organicTrips.filter((row) => {
      const origin = row.route_detail.origin.toLowerCase()
      const dest = row.route_detail.destination.toLowerCase()
      return origin.includes(r) || dest.includes(r)
    })
  }
  const tripRows = organicTrips.slice(0, tripRemaining).map((row) => ({
    ...busTripDetailForApi(row),
    is_featured_partner: false,
    partner_label: '',
  }))

  return [...promoted, ...vehicleRows, ...tripRows].slice(0, limit)
}

function categorySpotlightMock(s: MockState, region: string, category: string) {
  const targetMap: Record<string, string> = {
    stays: 'accommodation',
    accommodation: 'accommodation',
    guides: 'guide',
    guide: 'guide',
    food: 'food',
    events: 'event',
    event: 'event',
    transport: 'vehicle',
    vehicle: 'vehicle',
    bus_trip: 'bus_trip',
    bus: 'bus_trip',
    shared: 'bus_trip',
  }
  const targetType = targetMap[category.toLowerCase()]
  if (!targetType) return []
  const campaigns = activeFeaturedCampaigns('category_spotlight', region, targetType).slice(0, 1)
  for (const campaign of campaigns) {
    if (targetType === 'food') {
      const row = mockFood.find((x) => x.id === campaign.target_id)
      if (row) return [{ ...row, is_featured_partner: true, partner_label: campaign.label, promotion_id: campaign.id }]
    }
    if (targetType === 'guide') {
      const row = mockGuides.find((x) => x.id === campaign.target_id)
      if (row) return [{ ...row, is_featured_partner: true, partner_label: campaign.label, promotion_id: campaign.id }]
    }
    if (targetType === 'accommodation') {
      const row = mockStays.find((x) => x.id === campaign.target_id)
      if (row) {
        return [{
          ...enrichAccommodationListingRow(s, row),
          is_featured_partner: true,
          partner_label: campaign.label,
          promotion_id: campaign.id,
        }]
      }
    }
    if (targetType === 'bus_trip') {
      const row = mockBusTrips.find((x) => x.id === campaign.target_id)
      if (row) {
        return [{
          ...busTripDetailForApi(row),
          is_featured_partner: true,
          partner_label: campaign.label,
          promotion_id: campaign.id,
        }]
      }
    }
  }
  return []
}

function homepageFeaturedStays(s: MockState, region: string) {
  return mergeFeaturedRail(s, 'homepage_stays', region, mockStays, (row) => enrichAccommodationListingRow(s, row))
}

const FEED_INJECT_INDICES = [2, 7]

function buildMockListingCard(campaign: MockFeaturedCampaign) {
  if (campaign.target_type === 'accommodation') {
    const stay = mockStays.find((x) => x.id === campaign.target_id)
    if (!stay) return null
    return {
      feed_item_type: 'sponsored_listing',
      id: `sponsored-${campaign.id}-accommodation-${stay.id}`,
      is_sponsored: true,
      sponsor_label: campaign.label,
      promotion_id: campaign.id,
      listing_type: 'accommodation',
      listing_id: stay.id,
      listing_title: stay.title,
      listing_subtitle: stay.city ? `${stay.city}, ${stay.region}` : stay.region,
      listing_image: stay.cover_image,
      listing_meta: stay.property_type || 'Stay',
      listing_price: `From $${stay.price_per_night}/night`,
      listing_href: `/accommodation/${stay.id}`,
    }
  }
  if (campaign.target_type === 'guide') {
    const guide = mockGuides.find((x) => x.id === campaign.target_id)
    if (!guide) return null
    return {
      feed_item_type: 'sponsored_listing',
      id: `sponsored-${campaign.id}-guide-${guide.id}`,
      is_sponsored: true,
      sponsor_label: campaign.label,
      promotion_id: campaign.id,
      listing_type: 'guide',
      listing_id: guide.id,
      listing_title: guide.headline,
      listing_subtitle: (guide.regions || []).slice(0, 2).join(', ') || 'Local guide',
      listing_image: guide.photo,
      listing_meta: 'Local expert',
      listing_price: guide.hourly_rate ? `From $${guide.hourly_rate}/hr` : 'View profile',
      listing_href: `/guides/${guide.id}`,
    }
  }
  return null
}

function injectMockFeedPromotions(
  s: MockState,
  organic: Record<string, unknown>[],
  placement: string,
  region: string,
  requireDelvers: boolean | null,
) {
  const max = PLACEMENT_MAX_SLOTS[placement] ?? 2
  const campaigns = activeFeaturedCampaigns(placement, region).slice(0, max)
  const promoted: Record<string, unknown>[] = []
  const promotedPostIds = new Set<number>()

  for (const campaign of campaigns) {
    if (campaign.target_type === 'post') {
      const post = s.posts.find((p) => p.id === campaign.target_id && !p.is_hidden)
      if (!post) continue
      if (requireDelvers === true && !post.is_delvers) continue
      if (requireDelvers === false && post.is_delvers) continue
      if (promotedPostIds.has(post.id)) continue
      promotedPostIds.add(post.id)
      promoted.push({
        ...withMeFlags(s, [post])[0],
        feed_item_type: 'post',
        is_sponsored: true,
        sponsor_label: campaign.label,
        promotion_id: campaign.id,
      })
      continue
    }
    const card = buildMockListingCard(campaign)
    if (card) promoted.push(card)
  }

  let result = organic.filter((row) => !(typeof row.id === 'number' && promotedPostIds.has(row.id)))
  for (let i = 0; i < promoted.length && i < FEED_INJECT_INDICES.length; i++) {
    const at = FEED_INJECT_INDICES[i]
    if (at <= result.length) result.splice(at, 0, promoted[i])
    else result.push(promoted[i])
  }
  return result
}

function enrichAccommodationListingRow(s: MockState, row: (typeof mockStays)[number]) {
  const likers = mockListingLikes.get(row.id)
  const savers = mockListingSaves.get(row.id)
  return {
    ...row,
    likes_count: likers?.size ?? 0,
    liked_by_me: Boolean(s.currentUser && likers?.has(s.currentUser as string)),
    saves_count: savers?.size ?? 0,
    saved_by_me: Boolean(s.currentUser && savers?.has(s.currentUser as string)),
  }
}

function enrichFoodVenueRow(s: MockState, row: (typeof mockFood)[number]) {
  const savers = mockFoodVenueSaves.get(row.id)
  return {
    ...row,
    saves_count: savers?.size ?? 0,
    saved_by_me: Boolean(s.currentUser && savers?.has(s.currentUser as string)),
  }
}

function enrichGuideRow(s: MockState, row: (typeof mockGuides)[number]) {
  const savers = mockGuideSaves.get(row.id)
  return {
    ...row,
    saves_count: savers?.size ?? 0,
    saved_by_me: Boolean(s.currentUser && savers?.has(s.currentUser as string)),
  }
}

// ---- Mock messaging (session; mirrors backend ConversationSerializer / MessageSerializer) ----

type MockMessagingConv = {
  id: number
  participantIds: number[]
  pair_key: string
  context_type?: string
  context_id?: number | null
  context_label?: string
  created_at: string
  updated_at: string
}

type MockMessagingMsg = {
  id: number
  senderId: number
  body: string
  created_at: string
  read: boolean
  is_automated?: boolean
}

type MockProviderMessagingSettings = {
  auto_welcome_enabled: boolean
  auto_welcome_body: string
  booking_confirmed_enabled: boolean
  booking_confirmed_body: string
  quick_replies_enabled: boolean
  quick_replies: string[]
  updated_at: string
}

const mockProviderMessagingSettings = new Map<string, MockProviderMessagingSettings>()

const mockMessagingConversations = new Map<number, MockMessagingConv>()
const mockMessagingMessages = new Map<number, MockMessagingMsg[]>()
const mockMessagingBlocks = new Set<string>()
const mockMessagingTyping = new Map<string, { username: string; until: number }>()
let mockMessagingConvSeq = 1
let mockMessagingMsgSeq = 1

function messagingBlockKey(a: number, b: number): string {
  return `${a}->${b}`
}

function messagingIsBlockedEitherWay(a: number, b: number): boolean {
  return mockMessagingBlocks.has(messagingBlockKey(a, b)) || mockMessagingBlocks.has(messagingBlockKey(b, a))
}

function messagingNumericIdForUsername(username: string): number {
  if (username === 'demo_user') return 1
  if (username === 'demo_provider') return 2
  let h = 2166136261
  for (let i = 0; i < username.length; i++) {
    h ^= username.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return 10_000 + (Math.abs(h) % 900_000)
}

function messagingParticipantDetail(s: MockState, userId: number) {
  for (const username of Object.keys(s.profiles)) {
    if (messagingNumericIdForUsername(username) === userId) {
      const p = s.profiles[username]
      return { id: userId, username: p.username, display_name: p.display_name }
    }
  }
  return { id: userId, username: `user_${userId}`, display_name: `User ${userId}` }
}

function messagingUsernameForId(s: MockState, userId: number): string {
  return messagingParticipantDetail(s, userId).username
}

function messagingUserExists(s: MockState, userId: number): boolean {
  return Object.keys(s.profiles).some((u) => messagingNumericIdForUsername(u) === userId)
}

function messagingPairKey(a: number, b: number): string {
  const x = Math.min(a, b)
  const y = Math.max(a, b)
  return `${x}:${y}`
}

function mockProviderGuestUsernames(s: MockState, providerUsername: string): Set<string> {
  const guests = new Set<string>()
  const ownedStayIds = new Set(mockStays.filter((st) => st.owner_username === providerUsername).map((st) => st.id))
  const ownedStayTitles = new Set(
    mockStays.filter((st) => st.owner_username === providerUsername).map((st) => st.title),
  )

  for (const row of mockAccBookings.values()) {
    if (ownedStayIds.has(row.listing) && row.guest) guests.add(row.guest)
  }
  for (const row of [
    { listing_title: 'Coastal guesthouse', guest_username: 'demo_user' },
    { listing_title: 'Independence Ave Hotel', guest_username: 'demo_user' },
    { listing_title: 'Freesia Hotel', guest_username: 'anna' },
  ]) {
    if (ownedStayTitles.has(row.listing_title)) guests.add(row.guest_username)
  }

  const guide = mockGuides.find((g) => g.username === providerUsername)
  if (guide) {
    if (guide.username === 'guide_pro') {
      guests.add('demo_user')
      guests.add('anna')
    }
    for (const row of mockGuideBookings.values()) {
      if (row.guide === guide.id && row.client) guests.add(String(row.client))
    }
  }

  const ownedVehicleIds = new Set(
    mockVehicles.filter((v) => v.owner_username === providerUsername).map((v) => v.id),
  )
  for (const row of mockVehicleBookings.values()) {
    if (ownedVehicleIds.has(row.listing) && row.client) guests.add(row.client)
  }

  const ownedFoodIds = new Set(mockFood.filter((f) => f.owner_username === providerUsername).map((f) => f.id))
  for (const row of mockFoodReservationRows.values()) {
    if (ownedFoodIds.has(row.venue) && row.client) guests.add(row.client)
  }

  const ownedTripIds = new Set(
    mockBusTrips
      .filter((t) => (t as { owner_username?: string }).owner_username === providerUsername)
      .map((t) => t.id),
  )
  for (const row of mockBusReservationRows.values()) {
    if (ownedTripIds.has(row.trip) && row.client) guests.add(row.client)
  }

  return guests
}

function mockProviderSettingsKey(ownerUsername: string, businessId: number | null): string {
  return businessId != null ? `biz:${businessId}` : `user:${ownerUsername}`
}

function mockProviderMessagingSettingsFor(
  ownerUsername: string,
  businessId: number | null = null,
): MockProviderMessagingSettings {
  const key = mockProviderSettingsKey(ownerUsername, businessId)
  let row = mockProviderMessagingSettings.get(key)
  if (!row) {
    row = {
      auto_welcome_enabled: false,
      auto_welcome_body: '',
      booking_confirmed_enabled: false,
      booking_confirmed_body: '',
      quick_replies_enabled: false,
      quick_replies: [],
      updated_at: nowIso(),
    }
    mockProviderMessagingSettings.set(key, row)
  }
  return row
}

function mockFindBusinessById(businessId: number) {
  const seeded = mockBusinessProfiles.find((b) => b.id === businessId)
  if (seeded) return seeded
  for (const rows of mockUserBusinesses.values()) {
    const hit = rows.find((b) => b.id === businessId)
    if (hit) return hit
  }
  return undefined
}

function mockResolveProviderSettingsForRead(ownerUsername: string, businessId: number | null) {
  if (businessId != null) {
    const bizKey = mockProviderSettingsKey(ownerUsername, businessId)
    const bizRow = mockProviderMessagingSettings.get(bizKey)
    if (bizRow) return { row: bizRow, inherits: false }
    const defaultRow = mockProviderMessagingSettings.get(mockProviderSettingsKey(ownerUsername, null))
    if (defaultRow) return { row: defaultRow, inherits: true }
    return { row: mockProviderMessagingSettingsFor(ownerUsername, businessId), inherits: false }
  }
  return { row: mockProviderMessagingSettingsFor(ownerUsername, null), inherits: false }
}

function mockEffectiveWelcomeSettings(ownerUsername: string, businessId: number | null) {
  if (businessId != null) {
    const bizKey = mockProviderSettingsKey(ownerUsername, businessId)
    const bizRow = mockProviderMessagingSettings.get(bizKey)
    if (bizRow) return bizRow
  }
  return mockProviderMessagingSettings.get(mockProviderSettingsKey(ownerUsername, null))
}

function mockMaybeSendProviderAutoWelcome(
  s: MockState,
  convId: number,
  initiatorId: number,
  recipientId: number,
  startPayload?: { business_id?: unknown; context_type?: unknown },
) {
  if (initiatorId === recipientId) return
  const recipientUsername = messagingUsernameForId(s, recipientId)
  const profile = s.profiles[recipientUsername]
  if (!profile || profile.user_type !== 'service_provider') return
  let businessId: number | null = null
  const rawBusinessId = startPayload?.business_id
  if (rawBusinessId != null && rawBusinessId !== '') {
    const parsed = Number(rawBusinessId)
    if (Number.isFinite(parsed)) {
      const business = mockFindBusinessById(parsed)
      if (business?.owner_username === recipientUsername) businessId = parsed
    }
  } else if (startPayload?.context_type) {
    const owned = mockBusinessProfiles.filter((b) => b.owner_username === recipientUsername)
    const created = mockUserBusinesses.get(recipientUsername) ?? []
    const all = [...owned, ...created]
    if (all.length === 1) businessId = all[0].id
  }
  const settings =
    mockEffectiveWelcomeSettings(recipientUsername, businessId) ??
    mockProviderMessagingSettingsFor(recipientUsername, null)
  if (!settings.auto_welcome_enabled) return
  const body = settings.auto_welcome_body.trim()
  if (!body) return
  const list = mockMessagingMessages.get(convId) ?? []
  if (list.length > 0) return
  const msg: MockMessagingMsg = {
    id: mockMessagingMsgSeq++,
    senderId: recipientId,
    body,
    created_at: nowIso(),
    read: false,
    is_automated: true,
  }
  mockMessagingMessages.set(convId, [msg])
}

function mockProviderHasAutoWelcome(username: string): boolean {
  const keys = [mockProviderSettingsKey(username, null)]
  for (const b of mockBusinessProfiles) {
    if (b.owner_username === username) keys.push(mockProviderSettingsKey(username, b.id))
  }
  for (const b of mockUserBusinesses.get(username) ?? []) {
    keys.push(mockProviderSettingsKey(username, b.id))
  }
  return keys.some((key) => {
    const settings = mockProviderMessagingSettings.get(key)
    return Boolean(settings?.auto_welcome_enabled && settings.auto_welcome_body.trim())
  })
}

function mockValidateProviderMessagingSettings(row: MockProviderMessagingSettings): string | null {
  if (row.auto_welcome_enabled && !row.auto_welcome_body.trim()) {
    return 'Welcome message is required when automated welcome is enabled.'
  }
  if (row.booking_confirmed_enabled && !row.booking_confirmed_body.trim()) {
    return 'Booking confirmed message is required when booking automation is enabled.'
  }
  if (row.quick_replies_enabled && row.quick_replies.length === 0) {
    return 'Add at least one quick reply shortcut or turn the feature off.'
  }
  return null
}

function messagingEnsureSeed() {
  if (mockMessagingConversations.size > 0) return
  const id = mockMessagingConvSeq++
  const t = nowIso()
  mockMessagingConversations.set(id, {
    id,
    participantIds: [1, 2].sort((a, b) => a - b),
    pair_key: messagingPairKey(1, 2),
    created_at: t,
    updated_at: t,
  })
  mockMessagingMessages.set(id, [
    {
      id: mockMessagingMsgSeq++,
      senderId: 2,
      body: 'Hi! Thanks for your interest in a desert tour — let me know your dates.',
      created_at: t,
      read: false,
    },
  ])
}

function messagingFindConvBetween(a: number, b: number): MockMessagingConv | undefined {
  const key = messagingPairKey(a, b)
  for (const c of mockMessagingConversations.values()) {
    if (c.pair_key === key) return c
  }
  return undefined
}

function messagingFindUserIdByUsername(s: MockState, username: string): number | null {
  const needle = username.trim().toLowerCase()
  for (const u of Object.keys(s.profiles)) {
    if (u.toLowerCase() === needle) return messagingNumericIdForUsername(u)
  }
  return null
}

function messagingLastMessage(convId: number): MockMessagingMsg | null {
  const arr = mockMessagingMessages.get(convId) ?? []
  if (!arr.length) return null
  return [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

function messagingUnreadCount(convId: number, viewerId: number): number {
  const arr = mockMessagingMessages.get(convId) ?? []
  return arr.filter((m) => !m.read && m.senderId !== viewerId).length
}

const MESSAGING_CONTEXT_HREFS: Record<string, string> = {
  accommodation: '/accommodation/{id}',
  food: '/food/{id}',
  guide: '/guides/{id}',
  event: '/events/{id}',
  transport: '/transport/vehicle/{id}',
  bus_trip: '/transport/bus/{id}',
  booking_stay: '/dashboard/bookings/stay/{id}',
  booking_guide: '/dashboard/bookings/guide/{id}',
  booking_vehicle: '/dashboard/bookings/vehicle/{id}',
  booking_bus: '/dashboard/bookings/bus/{id}',
  booking_food: '/dashboard/bookings/food/{id}',
}

function messagingContextPayload(conv: MockMessagingConv) {
  const type = (conv.context_type || '').trim()
  if (!type) return null
  const id = conv.context_id ?? null
  const template = MESSAGING_CONTEXT_HREFS[type]
  const href = template && id != null ? template.replace('{id}', String(id)) : null
  const label = (conv.context_label || '').trim() || type.replace(/_/g, ' ')
  return { type, id, label, href }
}

function messagingApplyContext(
  conv: MockMessagingConv,
  payload: { context_type?: unknown; context_id?: unknown; context_label?: unknown },
) {
  const type = typeof payload.context_type === 'string' ? payload.context_type.trim().toLowerCase() : ''
  if (!type || !(type in MESSAGING_CONTEXT_HREFS)) return
  let contextId: number | null = null
  if (payload.context_id != null && payload.context_id !== '') {
    const n = Number(payload.context_id)
    contextId = Number.isFinite(n) ? n : null
  }
  const label =
    typeof payload.context_label === 'string' ? payload.context_label.trim().slice(0, 200) : ''
  conv.context_type = type
  conv.context_id = contextId
  conv.context_label = label || type.replace(/_/g, ' ')
}

function messagingSerializeConversation(s: MockState, conv: MockMessagingConv, viewerId?: number) {
  const last = messagingLastMessage(conv.id)
  const me = viewerId ?? messagingNumericIdForUsername(s.currentUser as string)
  const participants_detail = conv.participantIds.map((pid) => {
    const detail = messagingParticipantDetail(s, pid)
    const profile = s.profiles[detail.username]
    return {
      ...detail,
      avatar: profile?.avatar ?? null,
    }
  })
  const other = participants_detail.find((p) => p.id !== me) ?? null
  return {
    id: conv.id,
    pair_key: conv.pair_key,
    participants_detail,
    other,
    context: messagingContextPayload(conv),
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    unread_count: messagingUnreadCount(conv.id, me),
    last_message: last
      ? {
          id: last.id,
          sender: last.senderId,
          sender_username: messagingUsernameForId(s, last.senderId),
          body: last.body,
          read: last.read,
          created_at: last.created_at,
        }
      : null,
  }
}

function messagingSerializeMessage(s: MockState, m: MockMessagingMsg) {
  return {
    id: m.id,
    sender: m.senderId,
    sender_username: messagingUsernameForId(s, m.senderId),
    body: m.body,
    read: m.read,
    is_automated: Boolean(m.is_automated),
    created_at: m.created_at,
  }
}

function mockTripToJourney(t: MockTrip, index = 0): MockJourney {
  return { ...t, starts_at: t.starts_on, visibility: 'public', is_featured: index < 3 }
}

function ensureJourneyState(s: MockState): MockState {
  if (!Array.isArray(s.journeys) || s.journeys.length === 0) {
    s.journeys = mockTrips.map((t, i) => mockTripToJourney(t, i))
  }
  if (!s.nextJourneyId) {
    s.nextJourneyId = Math.max(2000, ...s.journeys.map((j) => j.id)) + 1
  }
  s.journeyLikes = s.journeyLikes ?? {}
  s.journeySaves = s.journeySaves ?? {}
  s.journeyQuestions = s.journeyQuestions ?? []
  if (!s.nextJourneyQuestionId) s.nextJourneyQuestionId = 1
  if (!s.nextJourneyAnswerId) s.nextJourneyAnswerId = 1
  return s
}

function mockResolveStopLinkedListing(stop: MockTrip['stops'][number]) {
  const lt = (stop.linked_listing_type || '').trim()
  const id = stop.linked_listing_id
  if (!lt || !id) return null
  if (lt === 'accommodation') {
    const row = mockStays.find((item) => item.id === id)
    if (!row) return null
    return { kind: 'accommodation' as const, id, title: row.title, href: `/accommodation/${id}` }
  }
  if (lt === 'food') {
    const row = mockFood.find((item) => item.id === id)
    if (!row) return null
    return { kind: 'food' as const, id, title: row.name, href: `/food/${id}` }
  }
  if (lt === 'event') {
    const row = mockEvents.find((item) => item.id === id)
    if (!row) return null
    return { kind: 'event' as const, id, title: row.title, href: `/events/${id}` }
  }
  return null
}

function mockSerializeJourneyStop(stop: MockTrip['stops'][number]) {
  return {
    ...stop,
    linked_listing: mockResolveStopLinkedListing(stop),
  }
}

function mockSerializeJourney(s: MockState, j: MockJourney) {
  const me = s.currentUser
  const liked = me ? (s.journeyLikes[j.id] ?? []).includes(me) : false
  const saved = me ? (s.journeySaves[j.id] ?? []).includes(me) : false
  return {
    ...j,
    starts_at: j.starts_at || j.starts_on,
    is_featured: Boolean(j.is_featured),
    stops: (j.stops || []).map(mockSerializeJourneyStop),
    likes_count: j.likes_count ?? (s.journeyLikes[j.id]?.length || 0),
    saves_count: j.saves_count ?? (s.journeySaves[j.id]?.length || 0),
    liked_by_me: liked,
    saved_by_me: saved,
  }
}

function mockVisibleJourneys(s: MockState) {
  return s.journeys.filter(
    (j) => (j.visibility ?? 'public') === 'public' && !j.is_hidden,
  )
}

function mockJourneyQuestionsFor(s: MockState, journeyId: number) {
  const journey = s.journeys.find((row) => row.id === journeyId)
  if (!journey) return []
  return s.journeyQuestions
    .filter((q) => q.journey_id === journeyId && !q.is_hidden)
    .map((q) => ({
      id: q.id,
      listing: journeyId,
      listing_title: journey.title,
      journey_title: journey.title,
      author: q.author,
      body: q.body,
      ago: 'Just now',
      answers: q.answers.map((a) => ({
        id: a.id,
        author: a.author,
        body: a.body,
        ago: 'Just now',
        is_official: a.is_official,
      })),
      created_at: q.created_at,
    }))
}

function loadState(): MockState {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try {
      const stored = JSON.parse(raw) as MockState
      // Always merge seed profiles so new demo accounts are available
      stored.profiles = { ...mockProfiles, ...stored.profiles }
      stored.comments = stored.comments ?? {}
      stored.nextCommentId = stored.nextCommentId ?? 1
      stored.commentHelpful = stored.commentHelpful ?? {}
      stored.follows = stored.follows ?? {}
      return ensureJourneyState(stored)
    } catch {
      // fallthrough
    }
  }
  const seed: MockState = {
    currentUser: null,
    profiles: { ...mockProfiles },
    posts: mockPosts,
    nextPostId: Math.max(...mockPosts.map((p) => p.id)) + 1,
    likes: {},
    saves: {},
    comments: {},
    nextCommentId: 1,
    commentHelpful: {},
    follows: {},
    journeys: mockTrips.map((t, i) => mockTripToJourney(t, i)),
    nextJourneyId: 2000,
    journeyLikes: {},
    journeySaves: {},
    journeyQuestions: [],
    nextJourneyQuestionId: 1,
    nextJourneyAnswerId: 1,
  }
  localStorage.setItem(KEY, JSON.stringify(seed))
  return seed
}

function saveState(s: MockState) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

async function mockFileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const mime = file.type || 'application/octet-stream'
  return `data:${mime};base64,${btoa(binary)}`
}

function requireAuth(s: MockState) {
  if (!s.currentUser) {
    throw new ApiError('Unauthorized', 401, { detail: 'Unauthorized' })
  }
}

function isJsonBody(body: unknown): body is string {
  return typeof body === 'string'
}

function parseQuery(path: string) {
  const u = new URL(path, 'http://mock.local')
  return { pathname: u.pathname, q: u.searchParams }
}

function featuredPromotionPath(pathname: string, segment: string): boolean {
  const base = `/api/promotions/featured/${segment}`
  return pathname === base || pathname === `${base}/`
}

function withMeFlags(s: MockState, posts: MockPost[]) {
  const me = s.currentUser
  const liked = me ? new Set(s.likes[me] || []) : new Set<number>()
  const saved = me ? new Set(s.saves[me] || []) : new Set<number>()
  return posts.map((p) => {
    const row = {
      ...p,
      liked_by_me: liked.has(p.id),
      saved_by_me: saved.has(p.id),
    }
    if (p.post_kind === 'question') {
      const accepted = mockAcceptedAnswer(s, p.id)
      if (accepted) row.accepted_answer = accepted
    }
    return row
  })
}

function mockFindComment(s: MockState, commentId: number): { postId: number; comment: MockComment } | null {
  for (const [postKey, rows] of Object.entries(s.comments)) {
    const comment = rows.find((c) => c.id === commentId && !c.is_hidden)
    if (comment) return { postId: Number(postKey), comment }
  }
  return null
}

function mockSerializeComments(s: MockState, postId: number): MockComment[] {
  const me = s.currentUser
  const rows = (s.comments[String(postId)] || []).filter((c) => !c.is_hidden)
  return rows
    .map((c) => {
      const voters = s.commentHelpful[String(c.id)] || []
      return {
        ...c,
        helpful_count: voters.length,
        marked_helpful_by_me: me ? voters.includes(me) : false,
      }
    })
    .sort((a, b) => {
      if (Boolean(a.is_accepted_answer) !== Boolean(b.is_accepted_answer)) {
        return a.is_accepted_answer ? -1 : 1
      }
      return (b.helpful_count || 0) - (a.helpful_count || 0)
    })
}

function mockAcceptedAnswer(s: MockState, postId: number) {
  const accepted = (s.comments[String(postId)] || []).find((c) => c.is_accepted_answer && !c.is_hidden)
  if (!accepted) return null
  const voters = s.commentHelpful[String(accepted.id)] || []
  return {
    id: accepted.id,
    body: accepted.body,
    author: accepted.author,
    helpful_count: voters.length,
  }
}

function visiblePosts(posts: MockPost[]) {
  return posts.filter((p) => !p.is_hidden)
}

function profileKey(s: MockState, username: string): string | undefined {
  return Object.keys(s.profiles).find((k) => k.toLowerCase() === username.toLowerCase())
}

function mockIsFollowing(s: MockState, follower: string | null, targetUsername: string): boolean {
  if (!follower) return false
  const target = profileKey(s, targetUsername)
  if (!target || follower.toLowerCase() === target.toLowerCase()) return false
  return (s.follows[follower] || []).some((u) => u.toLowerCase() === target.toLowerCase())
}

function mockCanViewPosts(s: MockState, viewer: string | null, targetUsername: string): boolean {
  const key = profileKey(s, targetUsername)
  if (!key) return false
  const profile = s.profiles[key]
  if (viewer && viewer.toLowerCase() === key.toLowerCase()) return true
  if (profile.posts_visibility === 'only_me') return false
  if (profile.is_private) return mockIsFollowing(s, viewer, key)
  return true
}

function mockProfileStats(s: MockState, targetUsername: string) {
  const key = profileKey(s, targetUsername)
  const unLower = (key || targetUsername).toLowerCase()
  const posts = s.posts.filter(
    (p) => p.author.username.toLowerCase() === unLower && !p.is_hidden,
  )
  const followersCount = Object.values(s.follows).filter((following) =>
    following.some((u) => u.toLowerCase() === unLower),
  ).length
  return {
    posts_count: posts.length,
    photos_count: posts.filter((p) => Boolean(p.image || p.video)).length,
    followers_count: followersCount,
    following_count: key ? (s.follows[key] || []).length : 0,
  }
}

function mockProfileRelationship(s: MockState, viewer: string | null, targetUsername: string) {
  const key = profileKey(s, targetUsername)
  const profile = key ? s.profiles[key] : null
  const canMessage =
    Boolean(viewer && key && viewer.toLowerCase() !== key.toLowerCase() && (profile?.allow_messages ?? true))
  return {
    is_following: mockIsFollowing(s, viewer, targetUsername),
    is_followed_by: key && viewer ? mockIsFollowing(s, key, viewer) : false,
    can_view_posts: mockCanViewPosts(s, viewer, targetUsername),
    can_message: canMessage,
  }
}

function postsForViewer(s: MockState, posts: MockPost[]) {
  const viewer = s.currentUser
  return visiblePosts(posts).filter((p) => mockCanViewPosts(s, viewer, p.author.username))
}

function textMatch(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase())
}

export async function mockApiFetch(path: string, init: RequestInit & { auth?: boolean } = {}) {
  const s = loadState()
  const { pathname, q } = parseQuery(path.startsWith('/') ? path : `/${path}`)
  const method = (init.method || 'GET').toUpperCase()

  // ---- Accounts ----
  if (pathname === '/api/accounts/check-username/' && method === 'GET') {
    const qq = (q.get('q') || '').trim()
    const taken = Object.keys(s.profiles).some((u) => u.toLowerCase() === qq.toLowerCase())
    return { available: !taken, username: qq }
  }

  if (pathname === '/api/accounts/token/' && method === 'POST') {
    let username = ''
    if (isJsonBody(init.body)) {
      const data = JSON.parse(init.body) as { username?: string; email?: string }
      const email = (data.email || '').trim().toLowerCase()
      username = (data.username || '').trim()
      if (!username && email) {
        username =
          Object.keys(s.profiles).find((u) => s.profiles[u].email?.toLowerCase() === email) || ''
      }
      if (!username && email.includes('@')) {
        username = email.split('@')[0] || ''
      }
    }
    if (!username) username = 'demo_user'
    if (!s.profiles[username]) {
      s.profiles[username] = {
        username,
        email: `${username}@mock.delve`,
        user_type: 'normal',
        display_name: username,
        bio: '',
        region: 'Khomas',
        city: 'Windhoek',
        country_code: '',
        preferred_currency: '',
        avatar: null,
        email_verified: true,
        is_private: false,
        posts_visibility: 'public',
        allow_messages: true,
        show_in_search: true,
      }
    }
    s.currentUser = username
    saveState(s)
    return { access: `mock_access_${username}`, refresh: `mock_refresh_${username}` }
  }

  if (pathname === '/api/accounts/me/' && method === 'GET') {
    requireAuth(s)
    const p = s.profiles[s.currentUser as string]
    return { ...p, is_staff: p.is_staff ?? false }
  }

  if (pathname === '/api/accounts/me/become-provider/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const p = s.profiles[me]
    if (p.user_type === 'service_provider') {
      throw new ApiError('Already a service provider', 400, { detail: 'Already a service provider.' })
    }
    p.user_type = 'service_provider'
    saveState(s)
    return { ...p, is_staff: p.is_staff ?? false }
  }

  if (pathname === '/api/accounts/me/update/' && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    let data: Partial<MockProfile> = {}
    if (init.body instanceof FormData) {
      // Extract text fields; avatar becomes an object-URL blob reference
      const fd = init.body
      for (const [key, val] of fd.entries()) {
        if (key === 'avatar' && val instanceof File) {
          // Store a data-URL so it persists across page reloads
          const buf = await val.arrayBuffer()
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
          const dataUrl = `data:${val.type};base64,${b64}`;
          (data as Record<string, unknown>)['avatar'] = dataUrl
        } else if (typeof val === 'string') {
          const strVal = val
          if (key === 'is_private' || key === 'allow_messages' || key === 'show_in_search') {
            (data as Record<string, unknown>)[key] = strVal === 'true'
          } else {
            (data as Record<string, unknown>)[key] = strVal
          }
        }
      }
    } else if (isJsonBody(init.body)) {
      const raw = JSON.parse(init.body) as Record<string, unknown>
      // Ensure boolean fields come through correctly whether sent as bool or string
      if ('is_private' in raw) raw['is_private'] = raw['is_private'] === true || raw['is_private'] === 'true'
      if ('allow_messages' in raw) raw['allow_messages'] = raw['allow_messages'] === true || raw['allow_messages'] === 'true'
      if ('show_in_search' in raw) raw['show_in_search'] = raw['show_in_search'] === true || raw['show_in_search'] === 'true'
      if ('avatar' in raw && (raw.avatar === null || raw.avatar === '')) raw.avatar = null
      data = raw as Partial<MockProfile>
    }
    s.profiles[me] = { ...s.profiles[me], ...data, username: me, email: s.profiles[me].email }
    saveState(s)
    return s.profiles[me]
  }

  if (pathname === '/api/accounts/me/change-password/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init?.body)) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    }
    const body = JSON.parse(init.body) as { current_password?: string; new_password?: string }
    if (!body.current_password?.trim() || !body.new_password) {
      throw new ApiError('Bad request', 400, { detail: 'current_password and new_password are required.' })
    }
    if (body.new_password.length < 8) {
      throw new ApiError('Bad request', 400, { detail: ['This password is too short.'] })
    }
    return { detail: 'Password updated.' }
  }

  if (pathname === '/api/accounts/me/delete/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init?.body)) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    }
    const me = s.currentUser as string
    const body = JSON.parse(init.body) as { confirm_username?: string; current_password?: string }
    if ((body.confirm_username || '').trim() !== me) {
      throw new ApiError('Bad request', 400, { detail: 'confirm_username must match your username exactly.' })
    }
    if (!body.current_password?.trim()) {
      throw new ApiError('Bad request', 400, { detail: 'current_password is required.' })
    }
    const old = s.profiles[me]
    const tombstone = `deleted_${me}`
    delete s.profiles[me]
    s.profiles[tombstone] = {
      ...old,
      username: tombstone,
      email: `${tombstone}@deleted.delve`,
      display_name: 'Deleted user',
      bio: '',
      show_in_search: false,
      is_private: true,
    }
    s.posts = s.posts.map((p) =>
      p.author.username === me ? { ...p, is_hidden: true, body: '[deleted]' } : p,
    )
    s.currentUser = null
    saveState(s)
    return {
      detail: 'Account deleted. Personal data anonymized; booking records retained without PII.',
      username: tombstone,
    }
  }

  if (pathname === '/api/accounts/register/' && method === 'POST') {
    const data = isJsonBody(init.body)
      ? (JSON.parse(init.body) as { username: string; email: string; user_type?: 'normal' | 'service_provider' })
      : { username: 'new_user', email: 'new@mock', user_type: 'normal' as const }
    const u = data.username.trim()
    if (s.profiles[u]) {
      return { detail: 'Username is already taken.' }
    }
    s.profiles[u] = {
      username: u,
      email: data.email,
      user_type: data.user_type || 'normal',
      display_name: u,
      bio: '',
      region: '',
      city: '',
      country_code: '',
      preferred_currency: '',
      avatar: null,
      email_verified: false,
      is_private: false,
      posts_visibility: 'public',
      allow_messages: true,
      show_in_search: true,
    }
    createMockVerificationToken(u)
    saveState(s)
    return { detail: 'Account created (mock). Check console for verification token in dev.' }
  }

  if (pathname === '/api/accounts/verify-email/' && method === 'POST') {
    if (!isJsonBody(init.body)) {
      throw new ApiError('Bad request', 400, { detail: 'token required' })
    }
    const body = JSON.parse(init.body) as { token?: string }
    const raw = (body.token || '').trim()
    const username = raw ? mockVerificationTokens.get(raw) : undefined
    if (!username || !s.profiles[username]) {
      throw new ApiError('invalid or expired token', 400, { detail: 'invalid or expired token' })
    }
    s.profiles[username].email_verified = true
    mockVerificationTokens.delete(raw)
    s.currentUser = username
    saveState(s)
    return { detail: 'Email verified (mock).', ...issueMockTokens(username) }
  }

  if (pathname === '/api/accounts/resend-verification/' && method === 'POST') {
    let username = s.currentUser
    if (isJsonBody(init.body)) {
      const body = JSON.parse(init.body) as { email?: string }
      const email = (body.email || '').trim().toLowerCase()
      if (email) {
        username =
          Object.keys(s.profiles).find((u) => s.profiles[u].email?.toLowerCase() === email) || null
      }
    }
    if (username && s.profiles[username] && !s.profiles[username].email_verified) {
      createMockVerificationToken(username)
    }
    return {
      detail: username
        ? 'Verification email sent.'
        : 'If an account exists and is unverified, we sent a verification email.',
    }
  }

  if (pathname === '/api/accounts/password-reset/request/' && method === 'POST') {
    if (!isJsonBody(init?.body)) {
      throw new ApiError('Bad request', 400, { detail: 'email is required.' })
    }
    const body = JSON.parse(init.body) as { email?: string }
    if (!body.email?.trim()) {
      throw new ApiError('Bad request', 400, { detail: 'email is required.' })
    }
    return { detail: 'If an account exists, we sent reset instructions.' }
  }

  if (pathname === '/api/accounts/password-reset/confirm/' && method === 'POST') {
    if (!isJsonBody(init?.body)) {
      throw new ApiError('Bad request', 400, { detail: 'token and new_password are required.' })
    }
    const body = JSON.parse(init.body) as { token?: string; new_password?: string }
    if (!body.token?.trim() || !body.new_password) {
      throw new ApiError('Bad request', 400, { detail: 'token and new_password are required.' })
    }
    if (body.new_password.length < 8) {
      throw new ApiError('Bad request', 400, { detail: ['This password is too short.'] })
    }
    return { detail: 'Password updated.' }
  }

  if (pathname === '/api/accounts/businesses/' && method === 'GET') {
    const owner = (q.get('owner') || '').trim()
    const list = owner
      ? allPublicBusinesses().filter((b) => b.owner_username.toLowerCase() === owner.toLowerCase())
      : allPublicBusinesses()
    return list.map(serializePublicBusiness)
  }

  const businessDetailMatch = pathname.match(/^\/api\/accounts\/businesses\/(\d+)\/?$/)
  if (businessDetailMatch && method === 'GET') {
    const b = findPublicBusinessById(Number(businessDetailMatch[1]))
    if (!b) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return serializePublicBusiness(b)
  }

  const businessListingsMatch = pathname.match(/^\/api\/accounts\/businesses\/(\d+)\/listings\/?$/)
  if (businessListingsMatch && method === 'GET') {
    const b = findPublicBusinessById(Number(businessListingsMatch[1]))
    if (!b) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return mockBusinessListingsFor(b)
  }

  const myBusinessUpdateMatch = pathname.match(/^\/api\/accounts\/me\/businesses\/(\d+)\/?$/)
  if (myBusinessUpdateMatch && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser!
    const id = Number(myBusinessUpdateMatch[1])
    const seeded = mockBusinessProfiles.find((b) => b.id === id && b.owner_username === me)
    const userRows = mockUserBusinesses.get(me) ?? []
    const created = userRows.find((b) => b.id === id)
    const target = created ?? (seeded ? ({
      id: seeded.id,
      slug: seeded.slug,
      owner_username: seeded.owner_username,
      business_name: seeded.business_name,
      business_types: seeded.business_types,
      verification_status: seeded.verification_status,
      description: seeded.description,
      tagline: seeded.tagline ?? '',
      logo: seeded.logo,
      cover_image: seeded.cover_image,
      region: seeded.region,
      city: seeded.city,
      onboarding_completed: true,
    } satisfies MockUserBusiness) : undefined)
    if (!target) throw new ApiError('Not found', 404, { detail: 'Not found.' })

    if (init.body instanceof FormData) {
      const name = init.body.get('business_name')
      if (typeof name === 'string' && name.trim()) target.business_name = name.trim()
      const tagline = init.body.get('tagline')
      if (typeof tagline === 'string') target.tagline = tagline
      const description = init.body.get('description')
      if (typeof description === 'string') target.description = description
      const region = init.body.get('region')
      if (typeof region === 'string') target.region = region
      const city = init.body.get('city')
      if (typeof city === 'string') target.city = city
      const logo = init.body.get('logo')
      if (logo instanceof File) target.logo = URL.createObjectURL(logo)
      const cover = init.body.get('cover_image')
      if (cover instanceof File) target.cover_image = URL.createObjectURL(cover)
    } else if (isJsonBody(init.body)) {
      const data = JSON.parse(init.body) as Partial<MockUserBusiness>
      Object.assign(target, data)
    }

    if (created) {
      mockUserBusinesses.set(
        me,
        userRows.map((row) => (row.id === id ? { ...target } : row)),
      )
    }
    return serializeMyBusiness(target)
  }

  if (pathname === '/api/accounts/me/businesses/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const owned = mockBusinessProfiles.filter((b) => b.owner_username === me)
    const seeded = owned.map((b) =>
      serializeMyBusiness({
        id: b.id,
        slug: b.slug,
        owner_username: b.owner_username,
        business_name: b.business_name,
        business_types: b.business_types,
        transport_modes: b.business_types.includes('transport') ? ['rental', 'shared'] : undefined,
        verification_status: b.verification_status,
        description: b.description,
        tagline: b.tagline ?? '',
        logo: b.logo,
        cover_image: b.cover_image,
        region: b.region,
        city: b.city,
        onboarding_completed: true,
      }),
    )
    const created = (mockUserBusinesses.get(me) ?? []).map(serializeMyBusiness)
    return [...seeded, ...created]
  }

  if (pathname === '/api/accounts/me/businesses/create/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const existing = mockUserBusinesses.get(me) ?? []
    if (existing.length > 0) throw new ApiError('Already exists', 400, { detail: 'You already have a business profile.' })
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body' })
    const data = JSON.parse(init.body) as {
      business_name: string
      business_types: string[]
      transport_modes?: ('rental' | 'shared')[]
      tagline?: string
      description?: string
      region?: string
      city?: string
    }
    const slug = data.business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70) || 'business'
    const biz: MockUserBusiness = {
      id: mockUserBusinessNextId++,
      slug,
      owner_username: me,
      business_name: data.business_name.trim(),
      business_types: data.business_types,
      transport_modes: data.transport_modes,
      verification_status: 'unverified',
      description: data.description?.trim() ?? '',
      tagline: data.tagline?.trim() ?? '',
      logo: null,
      cover_image: null,
      region: data.region?.trim() ?? '',
      city: data.city?.trim() ?? '',
      onboarding_completed: false,
    }
    mockUserBusinesses.set(me, [biz])
    return serializeMyBusiness(biz)
  }

  const myBizPatchMatch = pathname.match(/^\/api\/accounts\/me\/businesses\/(\d+)\/?$/)
  if (myBizPatchMatch && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    const id = Number(myBizPatchMatch[1])
    const list = mockUserBusinesses.get(me) ?? []
    const biz = list.find((b) => b.id === id)
    if (!biz) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    if (isJsonBody(init.body)) {
      const data = JSON.parse(init.body) as Partial<MockUserBusiness>
      if (data.business_name) biz.business_name = data.business_name.trim()
      if (data.business_types) biz.business_types = data.business_types
      if (data.transport_modes) biz.transport_modes = data.transport_modes
      if (data.tagline !== undefined) biz.tagline = data.tagline
      if (data.description !== undefined) biz.description = data.description
      if (data.region !== undefined) biz.region = data.region
      if (data.city !== undefined) biz.city = data.city
      if (data.onboarding_completed !== undefined) biz.onboarding_completed = data.onboarding_completed
    }
    return serializeMyBusiness(biz)
  }

  const myBizDocsMatch = pathname.match(/^\/api\/accounts\/me\/businesses\/(\d+)\/documents\/?$/)
  if (myBizDocsMatch && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const id = Number(myBizDocsMatch[1])
    const list = mockUserBusinesses.get(me) ?? []
    if (!list.some((b) => b.id === id)) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return { id: Date.now(), doc_type: 'other', doc_type_label: 'Document', file: '', status: 'pending', notes: '', uploaded_at: new Date().toISOString() }
  }

  const myBizSubmitMatch = pathname.match(/^\/api\/accounts\/me\/businesses\/(\d+)\/submit-verification\/?$/)
  if (myBizSubmitMatch && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const id = Number(myBizSubmitMatch[1])
    const list = mockUserBusinesses.get(me) ?? []
    const biz = list.find((b) => b.id === id)
    if (!biz) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    biz.onboarding_completed = true
    biz.verification_status = 'pending'
    return serializeMyBusiness(biz)
  }

  if (pathname === '/api/accounts/admin/overview/' && method === 'GET') {
    requireAuth(s)
    const me = s.profiles[s.currentUser as string]
    if (!me?.is_staff) throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    return {
      users: Object.keys(s.profiles).length,
      providers: Object.values(s.profiles).filter((p) => p.user_type === 'service_provider').length,
      businesses: mockBusinessProfiles.length,
      businesses_pending: mockBusinessProfiles.filter((b) => b.verification_status === 'pending').length,
      listings: mockStays.length,
      bookings: 4,
      bookings_pending: 1,
    }
  }

  if (pathname === '/api/accounts/admin/users/' && method === 'GET') {
    requireAuth(s)
    const me = s.profiles[s.currentUser as string]
    if (!me?.is_staff) throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    return Object.values(s.profiles).map((p, i) => ({
      id: i + 1,
      username: p.username,
      email: p.email,
      is_active: true,
      is_staff: p.is_staff ?? false,
      user_type: p.user_type,
      display_name: p.display_name,
      date_joined: new Date().toISOString(),
    }))
  }

  if (pathname === '/api/accounts/admin/businesses/' && method === 'GET') {
    requireAuth(s)
    const me = s.profiles[s.currentUser as string]
    if (!me?.is_staff) throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    return mockBusinessProfiles.map((b) => ({
      id: b.id,
      slug: b.slug,
      owner_username: b.owner_username,
      business_name: b.business_name,
      business_types: b.business_types,
      verification_status: b.verification_status,
      description: b.description,
      tagline: b.tagline ?? '',
      logo: b.logo,
      cover_image: b.cover_image,
      region: b.region,
      city: b.city,
    }))
  }

  const adminBizVerifyMatch = pathname.match(/^\/api\/accounts\/admin\/businesses\/(\d+)\/verification\/?$/)
  if (adminBizVerifyMatch && method === 'PATCH') {
    requireAuth(s)
    const me = s.profiles[s.currentUser as string]
    if (!me?.is_staff) throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const b = mockBusinessProfiles.find((x) => x.id === Number(adminBizVerifyMatch[1]))
    if (!b) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    if (isJsonBody(init.body)) {
      const data = JSON.parse(init.body) as { verification_status?: string }
      if (data.verification_status) b.verification_status = data.verification_status as typeof b.verification_status
    }
    return {
      id: b.id,
      slug: b.slug,
      owner_username: b.owner_username,
      business_name: b.business_name,
      business_types: b.business_types,
      verification_status: b.verification_status,
      description: b.description,
      tagline: b.tagline ?? '',
      logo: b.logo,
      cover_image: b.cover_image,
      region: b.region,
      city: b.city,
    }
  }

  if (pathname === '/api/accommodation/provider-listings/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return mockStays
      .filter((st) => st.owner_username === me)
      .map((st) => ({
        id: st.id,
        title: st.title,
        description: st.description,
        region: st.region,
        city: st.city,
        price_per_night: st.price_per_night,
        max_guests: st.max_guests,
        bedrooms: st.bedrooms,
        property_type: st.property_type,
        amenities: st.amenities,
        cover_image: st.cover_image,
        media_gallery: st.media_gallery ?? [],
        check_in_from: st.check_in_from,
        check_out_until: st.check_out_until,
        house_rules: st.house_rules,
        cancellation_policy: st.cancellation_policy,
        faqs: st.faqs ?? [],
        room_types: st.room_types ?? [],
        pet_friendly: st.pet_friendly,
        wifi: st.wifi,
        parking: st.parking,
        pool: st.pool,
        kitchen: st.kitchen,
        breakfast: st.breakfast,
        rating_avg: st.rating_avg,
        rating_count: st.rating_count,
        is_active: true,
        guest_reviews: st.guest_reviews ?? [],
        likes_count: mockListingLikes.get(st.id)?.size ?? 0,
        saves_count: mockListingSaves.get(st.id)?.size ?? 0,
      }))
  }

  if (pathname === '/api/accommodation/provider-analytics/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const owned = mockStays.filter((st) => st.owner_username === me)
    const ownedIds = new Set(owned.map((st) => st.id))
    const rows = [...mockAccBookings.values()].filter((b) => ownedIds.has(b.listing))
    const paid = rows.filter((b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status))
    const revenue = paid.reduce((s, b) => s + Number(b.total_price || 0), 0)
    const listingRows = owned.map((st) => {
      const listingBookings = rows.filter((b) => b.listing === st.id)
      const confirmed = listingBookings.filter((b) =>
        ['confirmed', 'checked_in', 'checked_out'].includes(b.status),
      )
      const listingRevenue = confirmed.reduce((s, b) => s + Number(b.total_price || 0), 0)
      return {
        id: st.id,
        title: st.title,
        bookings: listingBookings.length,
        confirmed_bookings: confirmed.length,
        revenue: listingRevenue,
        likes_count: mockListingLikes.get(st.id)?.size ?? 0,
        saves_count: mockListingSaves.get(st.id)?.size ?? 0,
      }
    })
    listingRows.sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
    return {
      days: 30,
      on_platform_revenue: revenue,
      total_bookings: rows.length,
      confirmed_bookings: paid.length,
      pending_requests: rows.filter((b) => b.status === 'pending').length,
      total_likes: owned.reduce((s, st) => s + (mockListingLikes.get(st.id)?.size ?? 0), 0),
      total_saves: owned.reduce((s, st) => s + (mockListingSaves.get(st.id)?.size ?? 0), 0),
      promotion_impressions: 0,
      promotion_clicks: 0,
      promotion_listing_opens: 0,
      listings: listingRows.slice(0, 12),
    }
  }

  if (pathname === '/api/accommodation/provider-listings/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    const id = Date.now()
    const row = {
      id,
      owner_username: me,
      rating_avg: '4.5',
      rating_count: 0,
      ...data,
      amenities: data.amenities ?? [],
    }
    mockStays.push(row as (typeof mockStays)[0])
    return row
  }

  const providerListingMatch = pathname.match(/^\/api\/accommodation\/provider-listings\/(\d+)\/?$/)
  if (providerListingMatch && method === 'PATCH') {
    requireAuth(s)
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    const st = mockStays.find((x) => x.id === Number(providerListingMatch[1]))
    if (st) Object.assign(st, data)
    return {
      id: Number(providerListingMatch[1]),
      ...st,
      ...data,
      rating_avg: st?.rating_avg ?? '4.5',
      rating_count: st?.rating_count ?? 0,
    }
  }

  if (pathname === '/api/accommodation/provider-bookings/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const myTitles = new Set(mockStays.filter((st) => st.owner_username === me).map((st) => st.title))
    const all = [
      { id: 1, listing_title: 'Coastal guesthouse', guest_display_name: 'Demo Explorer', guest_username: 'demo_user', check_in: '2026-05-10', check_out: '2026-05-13', guests: 2, total_price: '2850', status: 'confirmed', created_at: '2026-04-28T10:00:00Z' },
      { id: 2, listing_title: 'Independence Ave Hotel', guest_display_name: 'Demo Explorer', guest_username: 'demo_user', check_in: '2026-05-20', check_out: '2026-05-22', guests: 1, total_price: '1240', status: 'pending', created_at: '2026-05-01T14:30:00Z' },
      { id: 3, listing_title: 'Freesia Hotel', guest_display_name: 'Anna K.', guest_username: 'anna', check_in: '2026-05-14', check_out: '2026-05-16', guests: 2, total_price: '700', status: 'confirmed', created_at: '2026-04-30T09:15:00Z' },
    ]
    const status = (q.get('status') || '').trim()
    return all.filter((b) => myTitles.has(b.listing_title) && (!status || b.status === status))
  }

  const providerBookingActionMatch = pathname.match(
    /^\/api\/accommodation\/provider-bookings\/(\d+)\/(confirm|cancel|check_in|check_out|refund)\/?$/
  )
  if (providerBookingActionMatch && method === 'POST') {
    requireAuth(s)
    const statusMap: Record<string, string> = {
      confirm: 'confirmed',
      cancel: 'cancelled',
      check_in: 'checked_in',
      check_out: 'checked_out',
      refund: 'refunded',
    }
    return {
      id: Number(providerBookingActionMatch[1]),
      listing_title: 'Coastal guesthouse',
      guest_display_name: 'Demo Explorer',
      guest_username: 'demo_user',
      check_in: '2026-05-10',
      check_out: '2026-05-13',
      guests: 2,
      total_price: '2850',
      status: statusMap[providerBookingActionMatch[2]] ?? 'confirmed',
    }
  }

  const publicProfileMatch = pathname.match(/^\/api\/accounts\/users\/([^/]+)\/?$/)
  if (publicProfileMatch && method === 'GET') {
    const slug = decodeURIComponent(publicProfileMatch[1])
    const key = Object.keys(s.profiles).find((k) => k.toLowerCase() === slug.toLowerCase())
    if (!key) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const mp = s.profiles[key]
    const viewer = s.currentUser
    return {
      id: messagingNumericIdForUsername(key),
      username: mp.username,
      display_name: mp.display_name,
      bio: mp.bio,
      region: mp.region,
      city: mp.city,
      avatar: mp.avatar,
      user_type: mp.user_type,
      is_private: mp.is_private ?? false,
      posts_visibility: mp.posts_visibility ?? 'public',
      allow_messages: mp.allow_messages ?? true,
      has_auto_welcome: mp.user_type === 'service_provider' ? mockProviderHasAutoWelcome(key) : false,
      stats: mockProfileStats(s, key),
      relationship: mockProfileRelationship(s, viewer, key),
      owned_businesses: allPublicBusinesses()
        .filter((b) => b.owner_username.toLowerCase() === key.toLowerCase())
        .map((b) => ({
          id: b.id,
          business_name: b.business_name,
          verification_status: b.verification_status,
          slug: b.slug,
        })),
    }
  }

  const userFollowMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/follow\/?$/)
  if (userFollowMatch && method === 'POST') {
    const slug = decodeURIComponent(userFollowMatch[1])
    const targetKey = profileKey(s, slug)
    if (!targetKey) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    requireAuth(s)
    const me = s.currentUser!
    if (me.toLowerCase() === targetKey.toLowerCase()) {
      throw new ApiError('Bad request', 400, { detail: 'Cannot follow yourself.' })
    }
    const list = s.follows[me] || []
    const idx = list.findIndex((u) => u.toLowerCase() === targetKey.toLowerCase())
    let following: boolean
    if (idx >= 0) {
      list.splice(idx, 1)
      following = false
    } else {
      list.push(targetKey)
      following = true
    }
    s.follows[me] = list
    saveState(s)
    const followersCount = Object.values(s.follows).filter((rows) =>
      rows.some((u) => u.toLowerCase() === targetKey.toLowerCase()),
    ).length
    return { following, followers_count: followersCount }
  }

  const userFollowersMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/followers\/?$/)
  if (userFollowersMatch && method === 'GET') {
    const slug = decodeURIComponent(userFollowersMatch[1])
    const targetKey = profileKey(s, slug)
    if (!targetKey) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const followers = Object.entries(s.follows)
      .filter(([, following]) => following.some((u) => u.toLowerCase() === targetKey.toLowerCase()))
      .map(([username]) => {
        const p = s.profiles[username]
        return {
          id: messagingNumericIdForUsername(username),
          username: p.username,
          display_name: p.display_name,
          avatar: p.avatar,
        }
      })
    return followers
  }

  const userFollowingMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/following\/?$/)
  if (userFollowingMatch && method === 'GET') {
    const slug = decodeURIComponent(userFollowingMatch[1])
    const targetKey = profileKey(s, slug)
    if (!targetKey) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const following = (s.follows[targetKey] || []).map((username) => {
      const p = s.profiles[username]
      return {
        id: messagingNumericIdForUsername(username),
        username: p.username,
        display_name: p.display_name,
        avatar: p.avatar,
      }
    })
    return following
  }

  // ---- Social feeds ----
  if (pathname === '/api/social/feed/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const kind = (q.get('kind') || '').trim().toLowerCase()
    const limitRaw = Number(q.get('limit') || '50')
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 50
    let posts = postsForViewer(s, s.posts)
      .filter((p) => !p.is_delvers && !p.is_accommodation_story)
      .filter((p) => (region ? p.region.toLowerCase().includes(region.toLowerCase()) : true))
    if (kind === 'question' || kind === 'tip') {
      posts = posts.filter((p) => (p.post_kind || 'tip') === kind)
    }
    const ranked = [...posts].sort((a, b) => b.likes_count + b.saves_count - (a.likes_count + a.saves_count))
    const organic = withMeFlags(s, ranked).slice(0, limit) as Record<string, unknown>[]
    if (kind === 'question') return organic
    return injectMockFeedPromotions(s, organic, 'community_feed', region, false)
  }

  if (pathname === '/api/social/accommodation-stories/' && method === 'GET') {
    const list = postsForViewer(s, s.posts)
      .filter((p) => Boolean(p.is_accommodation_story) && (p.image || p.video))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return withMeFlags(s, list).slice(0, 120)
  }

  if (pathname === '/api/social/delvers/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const posts = postsForViewer(s, s.posts)
      .filter((p) => p.is_delvers && !p.is_accommodation_story && !p.is_delvers_highlight)
      .filter((p) => (region ? p.region.toLowerCase().includes(region.toLowerCase()) : true))
    const ranked = [...posts].sort((a, b) => b.saves_count - a.saves_count)
    const organic = withMeFlags(s, ranked).slice(0, 80) as Record<string, unknown>[]
    return injectMockFeedPromotions(s, organic, 'delvers_feed', region, true)
  }

  if (pathname === '/api/social/delvers/highlights/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const posts = postsForViewer(s, s.posts)
      .filter((p) => Boolean(p.is_delvers_highlight))
      .filter((p) => new Date(p.created_at).getTime() >= cutoff)
      .filter((p) => (region ? p.region.toLowerCase().includes(region.toLowerCase()) : true))
    const sorted = [...posts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return withMeFlags(s, sorted).slice(0, 120)
  }

  if (pathname === '/api/social/delvers/hashtag-rings/' && method === 'GET') {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const viewer = s.currentUser
    const following = viewer ? new Set((s.follows[viewer] || []).map((u) => u.toLowerCase())) : new Set<string>()

    const normalizeTag = (raw: string): string => {
      const slug = (raw || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64)
      return slug
    }

    const extractTags = (text: string): string[] => {
      const seen = new Set<string>()
      const out: string[] = []
      const re = /#([\w\u00C0-\u024F]+)/g
      for (const match of text.matchAll(re)) {
        const raw = match[1] || ''
        const slug = normalizeTag(raw)
        if (!slug || seen.has(slug)) continue
        seen.add(slug)
        out.push(slug)
        if (out.length >= 5) break
      }
      return out
    }

    const eligible = visiblePosts(s.posts)
      .filter((p) => Boolean(p.is_delvers || p.is_delvers_highlight))
      .filter((p) => !p.is_accommodation_story)
      .filter((p) => p.post_kind !== 'question')
      .filter((p) => new Date(p.created_at).getTime() >= cutoff)
      // Hashtag rings: exclude private authors always.
      .filter((p) => !(s.profiles[p.author.username]?.is_private ?? false))
      .filter((p) => mockCanViewPosts(s, s.currentUser, p.author.username))

    const ringPosts = new Map<string, typeof s.posts>()
    for (const post of eligible) {
      const tags = extractTags(post.body || '')
      for (const slug of tags) {
        const current = ringPosts.get(slug) || []
        current.push(post)
        ringPosts.set(slug, current)
      }
    }

    const score = (p: MockPost) => (p.likes_count || 0) * 2.5 + (p.saves_count || 0) * 4.0 + (p.comments_count || 0)

    const rings = [...ringPosts.entries()].map(([slug, posts]) => {
      const ordered = [...posts].sort((a, b) => {
        const fa = following.has(a.author.username.toLowerCase())
        const fb = following.has(b.author.username.toLowerCase())
        if (fa !== fb) return fb ? 1 : -1
        const sa = score(a)
        const sb = score(b)
        if (sa !== sb) return sb - sa
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      const limited = ordered.slice(0, 10)
      const ringHasFollowed = limited.some((p) => following.has(p.author.username.toLowerCase()))
      const ringScore = Math.max(...limited.map(score), 0)
      return { slug, limited, ringHasFollowed, ringScore }
    })

    rings.sort((a, b) => {
      if (a.ringHasFollowed !== b.ringHasFollowed) return a.ringHasFollowed ? -1 : 1
      return b.ringScore - a.ringScore
    })

    const top = rings.slice(0, 12)
    return {
      rings: top.map((r) => ({
        ring_id: `tag:${r.slug}`,
        tag_slug: r.slug,
        label: r.slug,
        posts: withMeFlags(s, r.limited),
      })),
    }
  }

  const userPostsMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/posts\/$/)
  if (userPostsMatch && method === 'GET') {
    const slug = decodeURIComponent(userPostsMatch[1])
    if (!mockCanViewPosts(s, s.currentUser, slug)) {
      return []
    }
    const unLower = slug.toLowerCase()
    const list = postsForViewer(s, s.posts).filter((p) => p.author.username.toLowerCase() === unLower && !p.is_delvers_highlight)
    const sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return withMeFlags(s, sorted).slice(0, 60)
  }

  const postSimilarMatch = pathname.match(/^\/api\/social\/posts\/(\d+)\/similar\/?$/)
  if (postSimilarMatch && method === 'GET') {
    const id = Number(postSimilarMatch[1])
    const post = s.posts.find((p) => p.id === id)
    if (!post) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (post.is_hidden) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const board = (post.delvers_board || '').trim().toLowerCase()
    const regionLower = (post.region || '').trim().toLowerCase()
    const authorU = post.author.username.toLowerCase()
    const others = visiblePosts(s.posts).filter((p) => p.id !== id && !p.is_accommodation_story && !p.is_delvers_highlight)
    const ordered: typeof s.posts = []
    const seen = new Set<number>()

    const take = (pred: (p: (typeof s.posts)[0]) => boolean, limit: number) => {
      let n = 0
      for (const p of others) {
        if (seen.has(p.id)) continue
        if (!pred(p)) continue
        seen.add(p.id)
        ordered.push(p)
        n += 1
        if (n >= limit) break
      }
    }

    if (post.is_delvers && board) {
      take((p) => Boolean(p.is_delvers && (p.delvers_board || '').trim().toLowerCase() === board), 14)
    }
    take((p) => p.author.username.toLowerCase() === authorU, 10)
    if (regionLower) {
      take((p) => (p.region || '').trim().toLowerCase() === regionLower, 10)
    }
    take((p) => Boolean(p.is_delvers), 12)
    take(() => true, 24)

    const slice = ordered.slice(0, 20)
    return withMeFlags(s, slice)
  }

  const postDetailMatch = pathname.match(/^\/api\/social\/posts\/(\d+)\/?$/)
  if (postDetailMatch && method === 'GET') {
    const id = Number(postDetailMatch[1])
    const post = s.posts.find((p) => p.id === id)
    if (!post || post.is_hidden) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (!mockCanViewPosts(s, s.currentUser, post.author.username)) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    return withMeFlags(s, [post])[0]
  }

  const postCommentsMatch = pathname.match(/^\/api\/social\/posts\/(\d+)\/comments\/?$/)
  if (postCommentsMatch) {
    const id = Number(postCommentsMatch[1])
    const post = s.posts.find((p) => p.id === id)
    if (!post || post.is_hidden) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const key = String(id)
    if (!s.comments[key]) s.comments[key] = []

    if (method === 'GET') {
      return mockSerializeComments(s, id)
    }

    if (method === 'POST') {
      requireAuth(s)
      if (!isJsonBody(init?.body)) {
        throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
      }
      const body = JSON.parse(init.body) as { body?: string }
      const text = (body.body || '').trim()
      if (!text) {
        throw new ApiError('Bad request', 400, { detail: 'Comment body is required.' })
      }
      const me = s.currentUser as string
      const profile = s.profiles[me]
      const comment: MockComment = {
        id: s.nextCommentId++,
        author: {
          username: me,
          display_name: profile.display_name || me,
          avatar: profile.avatar,
        },
        body: text,
        created_at: nowIso(),
      }
      s.comments[key].push(comment)
      post.comments_count = (post.comments_count || 0) + 1
      saveState(s)
      return { detail: 'ok' }
    }
  }

  const commentAcceptMatch = pathname.match(/^\/api\/social\/comments\/(\d+)\/accept\/?$/)
  if (commentAcceptMatch && method === 'POST') {
    requireAuth(s)
    const commentId = Number(commentAcceptMatch[1])
    const found = mockFindComment(s, commentId)
    if (!found) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const post = s.posts.find((p) => p.id === found.postId)
    if (!post || post.post_kind !== 'question') {
      throw new ApiError('Bad request', 400, { detail: 'Only ask-locals questions support accepted answers.' })
    }
    const me = s.currentUser as string
    if (post.author.username.toLowerCase() !== me.toLowerCase()) {
      throw new ApiError('Forbidden', 403, { detail: 'Only the question author can accept an answer.' })
    }
    const rows = s.comments[String(found.postId)] || []
    const accepted = !found.comment.is_accepted_answer
    rows.forEach((c) => {
      c.is_accepted_answer = accepted && c.id === commentId
    })
    saveState(s)
    const comment = mockSerializeComments(s, found.postId).find((c) => c.id === commentId)
    return { accepted, comment }
  }

  const commentHelpfulMatch = pathname.match(/^\/api\/social\/comments\/(\d+)\/helpful\/?$/)
  if (commentHelpfulMatch && method === 'POST') {
    requireAuth(s)
    const commentId = Number(commentHelpfulMatch[1])
    const found = mockFindComment(s, commentId)
    if (!found) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const me = s.currentUser as string
    const key = String(commentId)
    const voters = s.commentHelpful[key] || []
    const idx = voters.indexOf(me)
    let marked = false
    if (idx >= 0) {
      voters.splice(idx, 1)
    } else {
      voters.push(me)
      marked = true
    }
    s.commentHelpful[key] = voters
    saveState(s)
    return { marked_helpful: marked, helpful_count: voters.length }
  }

  const shareAnswerMatch = pathname.match(/^\/api\/social\/posts\/(\d+)\/share-answer-to-delvers\/?$/)
  if (shareAnswerMatch && method === 'POST') {
    requireAuth(s)
    const postId = Number(shareAnswerMatch[1])
    const post = s.posts.find((p) => p.id === postId)
    if (!post || post.post_kind !== 'question') {
      throw new ApiError('Bad request', 400, { detail: 'Only ask-locals questions can be shared.' })
    }
    const me = s.currentUser as string
    if (post.author.username.toLowerCase() !== me.toLowerCase()) {
      throw new ApiError('Forbidden', 403, { detail: 'Only the question author can share the accepted answer.' })
    }
    const accepted = mockAcceptedAnswer(s, postId)
    if (!accepted) {
      throw new ApiError('Bad request', 400, { detail: 'Mark an accepted answer before sharing to Delvers.' })
    }
    const profile = s.profiles[me]
    const delversPost: MockPost = {
      id: s.nextPostId++,
      author: { username: me, display_name: profile.display_name || me, avatar: profile.avatar },
      body: `Local answer: ${accepted.body}\n\n— thanks to @${accepted.author?.username ?? 'local'}`,
      region: post.region,
      place_label: post.place_label,
      image: null,
      video: null,
      is_delvers: true,
      post_kind: 'tip',
      likes_count: 0,
      saves_count: 0,
      comments_count: 0,
      liked_by_me: false,
      saved_by_me: false,
    }
    s.posts.unshift(delversPost)
    saveState(s)
    return withMeFlags(s, [delversPost])[0]
  }

  if (pathname === '/api/highlights/upload/' && method === 'POST') {
    requireAuth(s)
    const fd = init.body instanceof FormData ? init.body : null
    const file = fd?.get('file')
    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      throw new ApiError('Bad request', 400, { detail: 'A photo or video file is required.' })
    }
    const uploadFile = file as File
    const kind = uploadFile.type.startsWith('video/') ? 'video' : 'image'
    const maxBytes = kind === 'video' ? 50 * 1024 * 1024 : 12 * 1024 * 1024
    if (uploadFile.size > maxBytes) {
      throw new ApiError('Bad request', 400, {
        detail: kind === 'video' ? 'Video must be 50MB or smaller.' : 'Image must be 12MB or smaller.',
      })
    }
    return { url: await mockFileToDataUrl(uploadFile), kind }
  }

  if (pathname === '/api/social/posts/' && method === 'GET') {
    const savedBy = (q.get('saved_by') || '').trim()
    if (savedBy) {
      requireAuth(s)
      const me = s.currentUser!
      if (me.toLowerCase() !== savedBy.toLowerCase()) {
        throw new ApiError('Forbidden', 403, { detail: 'You can only view your own saved posts.' })
      }
      const savedIds = new Set(s.saves[me] || [])
      const list = postsForViewer(s, s.posts).filter((p) => savedIds.has(p.id))
      return withMeFlags(s, list)
    }
    return withMeFlags(s, postsForViewer(s, s.posts))
  }

  if (pathname === '/api/social/posts/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const profile = s.profiles[me]
    if (init.body instanceof FormData) {
      for (const key of ['audio', 'music', 'soundtrack', 'sound']) {
        if (init.body.get(key)) {
          throw new ApiError('Bad request', 400, { detail: 'Audio uploads are not allowed on posts.' })
        }
      }
    }
    const base: MockPost = {
      id: s.nextPostId++,
      author: { username: me, display_name: profile.display_name || me, avatar: profile.avatar },
      body: '',
      region: profile.region || '',
      image: null,
      video: null,
      delvers_board: '',
      is_delvers: false,
      is_accommodation_story: false,
      is_delvers_highlight: false,
      post_kind: 'tip',
      place_label: '',
      listing: null,
      event: null,
      vehicle_listing: null,
      bus_trip: null,
      food_venue: null,
      created_at: nowIso(),
      likes_count: 0,
      saves_count: 0,
      comments_count: 0,
      liked_by_me: false,
      saved_by_me: false,
    }
    if (init.body instanceof FormData) {
      const body = String(init.body.get('body') || '')
      const region = String(init.body.get('region') || '')
      const is_delvers = String(init.body.get('is_delvers') || 'false') === 'true'
      const is_accommodation_story = String(init.body.get('is_accommodation_story') || 'false') === 'true'
      const is_delvers_highlight = String(init.body.get('is_delvers_highlight') || 'false') === 'true'
      const board = String(init.body.get('delvers_board') || '')
      const postKind = String(init.body.get('post_kind') || 'tip')
      const placeLabel = String(init.body.get('place_label') || '')
      const hasVideo = Boolean(init.body.get('video'))
      const hasImage = Boolean(init.body.get('image'))
      const listingRaw = String(init.body.get('listing') || '').trim()
      const eventRaw = String(init.body.get('event') || '').trim()
      const vehicleRaw = String(init.body.get('vehicle_listing') || '').trim()
      const busTripRaw = String(init.body.get('bus_trip') || '').trim()
      const foodVenueRaw = String(init.body.get('food_venue') || '').trim()
      base.body = body
      base.region = region
      base.is_delvers = is_delvers
      base.is_accommodation_story = is_accommodation_story
      base.is_delvers_highlight = is_delvers_highlight
      base.delvers_board = board
      base.post_kind = postKind === 'question' ? 'question' : 'tip'
      base.place_label = placeLabel
      if (base.post_kind === 'question') {
        base.is_delvers = false
        base.is_accommodation_story = false
      }
      if (hasVideo) {
        const videoFile = init.body.get('video')
        if (videoFile && typeof videoFile === 'object' && 'arrayBuffer' in videoFile) {
          base.video = await mockFileToDataUrl(videoFile as File)
        }
      }
      if (hasImage) {
        const imageFile = init.body.get('image')
        if (imageFile && typeof imageFile === 'object' && 'arrayBuffer' in imageFile) {
          base.image = await mockFileToDataUrl(imageFile as File)
        }
      }
      if (is_accommodation_story) {
        base.is_delvers = false
        base.is_delvers_highlight = false
      }
      if (is_delvers_highlight) {
        base.is_delvers = true
        base.is_accommodation_story = false
        if (!hasVideo && !hasImage) {
          base.image = 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1200&q=70'
        }
      }
      if (listingRaw) {
        const lid = Number(listingRaw)
        const stay = mockStays.find((st) => st.id === lid)
        if (is_accommodation_story && stay && stay.owner_username !== me) {
          throw new ApiError('Forbidden', 403, { detail: 'You can only link stories to your own listings.' })
        }
        base.listing = stay ? { id: stay.id, title: stay.title } : { id: lid, title: 'Listing' }
      }
      if (eventRaw) {
        const eid = Number(eventRaw)
        const ev = mockEvents.find((row) => row.id === eid)
        base.event = ev ? { id: ev.id, title: ev.title } : { id: eid, title: 'Event' }
        base.is_delvers = true
      }
      if (vehicleRaw) {
        const vid = Number(vehicleRaw)
        const vehicle = mockVehicles.find((row) => row.id === vid)
        base.vehicle_listing = vehicle
          ? { id: vehicle.id, title: vehicle.title || `${vehicle.make} ${vehicle.model}` }
          : { id: vid, title: 'Vehicle' }
        base.is_delvers = true
      }
      if (busTripRaw) {
        const tid = Number(busTripRaw)
        const trip = mockBusTrips.find((row) => row.id === tid)
        base.bus_trip = trip
          ? {
              id: trip.id,
              title: `${trip.route_detail.origin} → ${trip.route_detail.destination}`,
            }
          : { id: tid, title: 'Bus trip' }
        base.is_delvers = true
      }
      if (foodVenueRaw) {
        const fid = Number(foodVenueRaw)
        const venue = mockFood.find((row) => row.id === fid)
        base.food_venue = venue
          ? { id: venue.id, title: venue.name }
          : { id: fid, title: 'Food venue' }
        base.is_delvers = true
      }
      if (is_accommodation_story && profile.user_type !== 'service_provider') {
        throw new ApiError('Forbidden', 403, { detail: 'Only hosts can post accommodation stories.' })
      }
    } else if (isJsonBody(init.body)) {
      const data = JSON.parse(init.body) as Partial<MockPost> & {
        is_delvers?: boolean
        is_accommodation_story?: boolean
        is_delvers_highlight?: boolean
        post_kind?: 'tip' | 'question'
        place_label?: string
      }
      base.body = data.body || ''
      base.region = data.region || base.region
      base.is_delvers = Boolean(data.is_delvers)
      base.is_accommodation_story = Boolean(data.is_accommodation_story)
      base.is_delvers_highlight = Boolean(data.is_delvers_highlight)
      base.delvers_board = data.delvers_board || ''
      base.post_kind = data.post_kind === 'question' ? 'question' : 'tip'
      base.place_label = data.place_label || ''
      if (base.post_kind === 'question') {
        base.is_delvers = false
        base.is_accommodation_story = false
      }
      if (data.listing) base.listing = data.listing
      if (base.is_accommodation_story) {
        base.is_delvers = false
        base.is_delvers_highlight = false
      }
      if (base.is_delvers_highlight) {
        base.is_delvers = true
        base.is_accommodation_story = false
      }
    }
    s.posts.unshift(base)
    saveState(s)
    return base
  }

  const likeMatch = pathname.match(/^\/api\/social\/posts\/(\d+)\/like\/$/)
  if (likeMatch && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const id = Number(likeMatch[1])
    const arr = new Set(s.likes[me] || [])
    const post = s.posts.find((p) => p.id === id)
    if (!post) return { detail: 'Not found' }
    if (arr.has(id)) {
      arr.delete(id)
      post.likes_count = Math.max(0, post.likes_count - 1)
      s.likes[me] = [...arr]
      saveState(s)
      return { liked: false }
    }
    arr.add(id)
    post.likes_count += 1
    s.likes[me] = [...arr]
    saveState(s)
    return { liked: true }
  }

  const saveMatch = pathname.match(/^\/api\/social\/posts\/(\d+)\/save\/$/)
  if (saveMatch && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const id = Number(saveMatch[1])
    const arr = new Set(s.saves[me] || [])
    const post = s.posts.find((p) => p.id === id)
    if (!post) return { detail: 'Not found' }
    if (arr.has(id)) {
      arr.delete(id)
      post.saves_count = Math.max(0, post.saves_count - 1)
      s.saves[me] = [...arr]
      saveState(s)
      return { saved: false }
    }
    arr.add(id)
    post.saves_count += 1
    s.saves[me] = [...arr]
    saveState(s)
    return { saved: true }
  }

  // ---- Promotions ----
  if (featuredPromotionPath(pathname, 'stays') && method === 'GET') {
    return homepageFeaturedStays(s, (q.get('region') || '').trim())
  }
  if (featuredPromotionPath(pathname, 'guides') && method === 'GET') {
    return mergeFeaturedRail(s, 'homepage_guides', (q.get('region') || '').trim(), mockGuides, (row) => ({ ...row }))
  }
  if (featuredPromotionPath(pathname, 'food') && method === 'GET') {
    return mergeFeaturedRail(s, 'homepage_food', (q.get('region') || '').trim(), mockFood, (row) => ({ ...row }))
  }
  if (featuredPromotionPath(pathname, 'events') && method === 'GET') {
    return mergeFeaturedRail(s, 'homepage_events', (q.get('region') || '').trim(), mockEvents, (row) => ({ ...row }))
  }
  if (featuredPromotionPath(pathname, 'transport') && method === 'GET') {
    return mergeFeaturedTransport((q.get('region') || '').trim())
  }
  const spotlightMatch = pathname.match(/^\/api\/promotions\/spotlight\/([^/]+)\/?$/)
  if (spotlightMatch && method === 'GET') {
    return categorySpotlightMock(s, (q.get('region') || '').trim(), spotlightMatch[1])
  }

  if (pathname === '/api/promotions/pricing/' && method === 'GET') {
    return { pricing: PROMOTION_PRICING, note: 'Display only — payment is arranged offline.' }
  }

  if (pathname === '/api/promotions/track/' && method === 'POST') {
    const body = JSON.parse(String(init.body)) as { promotion_id?: number; event?: string }
    const id = Number(body.promotion_id)
    const event = body.event
    if (!id || !event) return { ok: false }
    if (!mockPromotionMetrics[id]) mockPromotionMetrics[id] = { impressions: 0, clicks: 0, listing_opens: 0 }
    if (event === 'impression') mockPromotionMetrics[id].impressions += 1
    if (event === 'click') mockPromotionMetrics[id].clicks += 1
    if (event === 'open') mockPromotionMetrics[id].listing_opens += 1
    return { ok: true }
  }

  if (pathname === '/api/promotions/my/analytics/' && method === 'GET') {
    requireAuth(s)
    const rows = mockProviderPromotionRequests.map(enrichMockCampaign)
    let impressions = 0
    let clicks = 0
    let listing_opens = 0
    let spend_cents = 0
    rows.forEach((c) => {
      const m = mockPromotionMetrics[c.id] ?? { impressions: 0, clicks: 0, listing_opens: 0 }
      impressions += m.impressions
      clicks += m.clicks
      listing_opens += m.listing_opens
      if (c.payment_status === 'paid') spend_cents += c.amount_cents
    })
    Object.entries(mockPromotionMetrics).forEach(([id, m]) => {
      if (rows.some((c) => c.id === Number(id))) return
      impressions += m.impressions
      clicks += m.clicks
      listing_opens += m.listing_opens
    })
    const bookings = Math.max(0, Math.floor(listing_opens * 0.15))
    return {
      totals: {
        impressions,
        clicks,
        listing_opens,
        bookings,
        ctr_pct: impressions ? Math.round((clicks / impressions) * 10000) / 100 : 0,
        spend_cents,
        roi_proxy: spend_cents > 0 && bookings > 0 ? Math.round((bookings / (spend_cents / 100)) * 100) / 100 : null,
      },
      campaigns: rows.map((c) => {
        const m = mockPromotionMetrics[c.id] ?? { impressions: 0, clicks: 0, listing_opens: 0 }
        const ctr_pct = m.impressions ? Math.round((m.clicks / m.impressions) * 10000) / 100 : 0
        return {
          id: c.id,
          target_label: c.target_label,
          product_name: c.product_name,
          status: c.status,
          status_label: c.status_label,
          starts_at: c.starts_at,
          ends_at: c.ends_at,
          impressions: m.impressions,
          clicks: m.clicks,
          listing_opens: m.listing_opens,
          bookings: Math.floor(m.listing_opens * 0.15),
          ctr_pct,
          underperforming: m.impressions >= 50 && ctr_pct < 1,
        }
      }),
    }
  }

  if (pathname === '/api/promotions/products/' && method === 'GET') {
    let rows = [...MOCK_PROMOTION_PRODUCTS]
    const placement = (q.get('placement') || '').trim()
    const region = (q.get('region') || '').trim()
    if (placement) rows = rows.filter((p) => p.placement === placement)
    if (region) rows = rows.filter((p) => !p.region || p.region.toLowerCase() === region.toLowerCase())
    return rows
  }

  if (pathname === '/api/promotions/purchase/' && method === 'POST') {
    requireAuth(s)
    const body = JSON.parse(String(init.body)) as {
      product_id: number
      target_type: string
      target_id: string
      target_label?: string
      starts_at: string
      provider_notes?: string
    }
    const product = MOCK_PROMOTION_PRODUCTS.find((p) => p.id === body.product_id)
    if (!product) throw new ApiError('Bad request', 400, { product_id: 'Product not found.' })
    const start = new Date(body.starts_at)
    const end = new Date(start)
    end.setDate(end.getDate() + product.duration_days)
    const row = enrichMockCampaign({
      id: providerPromotionIdCounter++,
      placement: product.placement,
      placement_label: product.placement_label,
      target_type: body.target_type,
      target_id: body.target_id,
      target_label: body.target_label ?? '',
      region: product.region,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: 'pending_payment',
      status_label: 'Pending payment',
      is_live: false,
      label: product.placement === 'delvers_feed' ? 'Sponsored' : 'Featured Partner',
      product_id: product.id,
      product_name: product.name,
      amount_cents: product.price_cents,
      amount_display: product.price_display,
      currency: product.currency,
      payment_status: 'pending',
      payment_status_label: 'Pending',
      payment_provider: '',
      payment_ref: '',
      receipt_number: '',
      paid_at: null,
      refunded_at: null,
      refund_amount_cents: 0,
      refund_reason: '',
      can_pay: true,
      can_cancel: true,
      refund_preview: { amount_cents: 0, amount_display: '', note: 'No payment to refund.' },
      provider_notes: body.provider_notes ?? '',
      rejection_reason: '',
      created_at: new Date().toISOString(),
    })
    mockProviderPromotionRequests = [row, ...mockProviderPromotionRequests]
    return row
  }

  const campaignMatch = pathname.match(/^\/api\/promotions\/campaigns\/(\d+)(\/receipt\/)?$/)
  if (campaignMatch) {
    requireAuth(s)
    const id = Number(campaignMatch[1])
    const isReceipt = Boolean(campaignMatch[2])
    const idx = mockProviderPromotionRequests.findIndex((c) => c.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    if (method === 'GET' && isReceipt) {
      const c = mockProviderPromotionRequests[idx]
      if (c.payment_status !== 'paid') throw new ApiError('Bad request', 400, { detail: 'Receipt available after payment.' })
      return {
        receipt_number: c.receipt_number,
        campaign_id: c.id,
        product_name: c.product_name ?? c.placement_label,
        target_label: c.target_label,
        placement_label: c.placement_label,
        region: c.region || 'National',
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        amount_cents: c.amount_cents,
        amount_display: c.amount_display,
        currency: c.currency,
        payment_ref: c.payment_ref,
        paid_at: c.paid_at,
        payment_status: c.payment_status,
        status: c.status,
        status_label: c.status_label,
      }
    }
    if (method === 'POST' && !isReceipt) {
      const body = JSON.parse(String(init.body)) as { action?: string; reason?: string }
      const c = mockProviderPromotionRequests[idx]
      if (body.action === 'mock_pay') {
        if (c.status !== 'pending_payment') throw new ApiError('Bad request', 400, { detail: 'Campaign is not awaiting payment.' })
        const paidAt = new Date().toISOString()
        const receipt = `DELVE-PR-${String(c.id).padStart(6, '0')}`
        const ref = `mock_${Math.random().toString(16).slice(2, 18)}`
        mockProviderPromotionRequests[idx] = enrichMockCampaign({
          ...c,
          status: 'scheduled',
          status_label: 'Scheduled',
          payment_status: 'paid',
          payment_status_label: 'Paid',
          payment_provider: 'mock',
          payment_ref: ref,
          receipt_number: receipt,
          paid_at: paidAt,
        })
        const updated = mockProviderPromotionRequests[idx]
        return {
          campaign: updated,
          receipt: {
            receipt_number: receipt,
            campaign_id: updated.id,
            product_name: updated.product_name ?? updated.placement_label,
            target_label: updated.target_label,
            placement_label: updated.placement_label,
            region: updated.region || 'National',
            starts_at: updated.starts_at,
            ends_at: updated.ends_at,
            amount_cents: updated.amount_cents,
            amount_display: updated.amount_display,
            currency: updated.currency,
            payment_ref: ref,
            paid_at: paidAt,
            payment_status: 'paid',
            status: updated.status,
            status_label: updated.status_label,
          },
          detail: 'Payment successful (mock).',
        }
      }
      if (body.action === 'cancel') {
        const preview = mockRefundPreview(c)
        const refund = preview.amount_cents
        mockProviderPromotionRequests[idx] = enrichMockCampaign({
          ...c,
          status: refund > 0 ? 'refunded' : 'cancelled',
          status_label: refund > 0 ? 'Refunded' : 'Cancelled',
          payment_status: refund > 0 ? 'refunded' : c.payment_status,
          payment_status_label: refund > 0 ? 'Refunded' : c.payment_status_label,
          refund_amount_cents: refund,
          refund_reason: body.reason?.trim() || preview.note,
          refunded_at: refund > 0 ? new Date().toISOString() : null,
          can_pay: false,
          can_cancel: false,
        })
        const updated = mockProviderPromotionRequests[idx]
        return {
          campaign: updated,
          refund_amount_cents: refund,
          refund_amount_display: preview.amount_display,
          refund_note: preview.note,
        }
      }
      throw new ApiError('Bad request', 400, { detail: 'Unknown action.' })
    }
  }

  if (pathname === '/api/promotions/my/' && method === 'GET') {
    requireAuth(s)
    return mockProviderPromotionRequests
      .filter((r) => r.status !== 'cancelled')
      .map(enrichMockCampaign)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  if (pathname === '/api/promotions/provider/listings/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const rows: { target_type: string; target_id: string; label: string; region: string; city: string; category_label: string }[] = []
    mockStays.filter((st) => st.owner_username === me).forEach((st) => {
      rows.push({ target_type: 'accommodation', target_id: String(st.id), label: st.title, region: st.region, city: st.city, category_label: 'Stay' })
    })
    mockFood.filter((f) => f.owner_username === me).forEach((f) => {
      rows.push({ target_type: 'food', target_id: String(f.id), label: f.name, region: f.region, city: f.city, category_label: 'Food & drink' })
    })
    mockGuides.filter((g) => g.username === me).forEach((g) => {
      rows.push({ target_type: 'guide', target_id: String(g.id), label: g.headline, region: (g.regions || []).join(', '), city: '', category_label: 'Guide' })
    })
    mockEvents.filter((ev) => ev.organizer_username === me).forEach((ev) => {
      rows.push({ target_type: 'event', target_id: String(ev.id), label: ev.title, region: ev.region, city: ev.city, category_label: 'Event' })
    })
    mockVehicles.filter((v) => v.owner_username === me).forEach((v) => {
      rows.push({ target_type: 'vehicle', target_id: String(v.id), label: v.title || `${v.make} ${v.model}`, region: v.region, city: v.city, category_label: 'Vehicle' })
    })
    const now = Date.now()
    mockBusTrips
      .filter((t) => t.owner_username === me && t.is_active && new Date(t.departs_at).getTime() >= now)
      .forEach((t) => {
        rows.push({
          target_type: 'bus_trip',
          target_id: String(t.id),
          label: `${t.route_detail.origin} → ${t.route_detail.destination}`,
          region: t.route_detail.origin,
          city: t.route_detail.origin,
          category_label: 'Bus trip',
        })
      })
    s.posts.filter((p) => p.author.username === me && p.is_delvers && !p.is_hidden).forEach((p) => {
      rows.push({
        target_type: 'post',
        target_id: String(p.id),
        label: (p.body || p.delvers_board || `Post #${p.id}`).slice(0, 80),
        region: p.region,
        city: '',
        category_label: 'Delvers post',
      })
    })
    s.posts.filter((p) => p.author.username === me && !p.is_delvers && p.post_kind === 'question' && !p.is_hidden).forEach((p) => {
      rows.push({
        target_type: 'post',
        target_id: String(p.id),
        label: (p.body || `Question #${p.id}`).slice(0, 80),
        region: p.region,
        city: p.place_label || '',
        category_label: 'Ask locals question',
      })
    })
    return rows
  }

  if (pathname === '/api/promotions/requests/' && method === 'POST') {
    requireAuth(s)
    const body = JSON.parse(String(init.body)) as {
      placement: string
      target_type: string
      target_id: string
      target_label?: string
      region?: string
      starts_at: string
      ends_at: string
      provider_notes?: string
    }
    const row = enrichMockCampaign({
      id: providerPromotionIdCounter++,
      placement: body.placement,
      placement_label: PLACEMENT_LABELS[body.placement] ?? body.placement,
      target_type: body.target_type,
      target_id: body.target_id,
      target_label: body.target_label ?? '',
      region: body.region ?? '',
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      status: 'requested',
      status_label: 'Requested',
      is_live: false,
      label: body.placement === 'delvers_feed' ? 'Sponsored' : 'Featured Partner',
      product_id: null,
      product_name: null,
      amount_cents: 0,
      amount_display: '',
      currency: 'NAD',
      payment_status: 'pending',
      payment_status_label: 'Pending',
      payment_provider: '',
      payment_ref: '',
      receipt_number: '',
      paid_at: null,
      refunded_at: null,
      refund_amount_cents: 0,
      refund_reason: '',
      can_pay: false,
      can_cancel: false,
      refund_preview: { amount_cents: 0, amount_display: '', note: 'No payment to refund.' },
      provider_notes: body.provider_notes ?? '',
      rejection_reason: '',
      created_at: new Date().toISOString(),
    })
    mockProviderPromotionRequests = [row, ...mockProviderPromotionRequests]
    return row
  }

  // ---- Accommodation ----
  const stayLikeMatch = pathname.match(/^\/api\/accommodation\/listings\/(\d+)\/like\/$/)
  if (stayLikeMatch && method === 'POST') {
    requireAuth(s)
    const lid = Number(stayLikeMatch[1])
    if (!mockStays.some((x) => x.id === lid)) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const me = s.currentUser as string
    let likers = mockListingLikes.get(lid)
    if (!likers) {
      likers = new Set<string>()
      mockListingLikes.set(lid, likers)
    }
    if (likers.has(me)) {
      likers.delete(me)
      return { liked: false, likes_count: likers.size }
    }
    likers.add(me)
    return { liked: true, likes_count: likers.size }
  }

  const staySaveMatch = pathname.match(/^\/api\/accommodation\/listings\/(\d+)\/save\/$/)
  if (staySaveMatch && method === 'POST') {
    requireAuth(s)
    const lid = Number(staySaveMatch[1])
    if (!mockStays.some((x) => x.id === lid)) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const me = s.currentUser as string
    let savers = mockListingSaves.get(lid)
    if (!savers) {
      savers = new Set<string>()
      mockListingSaves.set(lid, savers)
    }
    if (savers.has(me)) {
      savers.delete(me)
      return { saved: false, saves_count: savers.size }
    }
    savers.add(me)
    return { saved: true, saves_count: savers.size }
  }

  if (pathname === '/api/accommodation/listings/saved/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return mockStays
      .filter((row) => mockListingSaves.get(row.id)?.has(me))
      .map((row) => enrichAccommodationListingRow(s, row))
  }

  if (pathname === '/api/accommodation/listings/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const cityQ = (q.get('city') || '').trim()
    const search = (q.get('search') || '').trim()
    const min = Number(q.get('min_price') || '0')
    const max = Number(q.get('max_price') || '999999')
    const guests = Number(q.get('guests') || '0')
    const propertyTypes = q.getAll('property_type').filter(Boolean)
    const minRating = Number(q.get('min_rating') || '0')
    const minBed = Number(q.get('min_bedrooms') || '0')
    const maxBedRaw = q.get('max_bedrooms')
    const maxBed = maxBedRaw != null && maxBedRaw !== '' ? Number(maxBedRaw) : 0
    const petFriendly = q.get('pet_friendly') === 'true'
    const wantWifi = q.get('wifi') === 'true'
    const wantParking = q.get('parking') === 'true'
    const wantPool = q.get('pool') === 'true'
    const wantKitchen = q.get('kitchen') === 'true'
    const wantBreakfast = q.get('breakfast') === 'true'
    const ordering = (q.get('ordering') || '').trim()

    let list = mockStays
      .filter((s2) => (region ? textMatch(s2.region, region) || textMatch(s2.city, region) : true))
      .filter((s2) => (cityQ ? textMatch(s2.city, cityQ) : true))
      .filter((s2) =>
        search
          ? textMatch(s2.title, search) ||
            textMatch(s2.region, search) ||
            textMatch(s2.city, search) ||
            textMatch(s2.description, search)
          : true,
      )
      .filter((s2) => Number(s2.price_per_night) >= min && Number(s2.price_per_night) <= max)
      .filter((s2) => (guests > 0 ? s2.max_guests >= guests : true))
      .filter((s2) => (propertyTypes.length ? propertyTypes.includes(s2.property_type) : true))
      .filter((s2) => (minRating > 0 ? Number(s2.rating_avg) >= minRating : true))
      .filter((s2) => (minBed > 0 ? s2.bedrooms >= minBed : true))
      .filter((s2) => (maxBed > 0 ? s2.bedrooms <= maxBed : true))
      .filter((s2) => (petFriendly ? s2.pet_friendly : true))
      .filter((s2) => (wantWifi ? s2.wifi : true))
      .filter((s2) => (wantParking ? s2.parking : true))
      .filter((s2) => (wantPool ? s2.pool : true))
      .filter((s2) => (wantKitchen ? s2.kitchen : true))
      .filter((s2) => (wantBreakfast ? s2.breakfast : true))

    if (ordering === '-rating_avg') {
      list = [...list].sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg))
    } else if (ordering === 'rating_avg') {
      list = [...list].sort((a, b) => Number(a.rating_avg) - Number(b.rating_avg))
    } else if (ordering === 'price_per_night') {
      list = [...list].sort((a, b) => Number(a.price_per_night) - Number(b.price_per_night))
    } else if (ordering === '-price_per_night') {
      list = [...list].sort((a, b) => Number(b.price_per_night) - Number(a.price_per_night))
    }

    return list.map((row) => enrichAccommodationListingRow(s, row))
  }

  const staySubMatch = pathname.match(/^\/api\/accommodation\/listings\/(\d+)\/([^/]+)\/?$/)
  if (staySubMatch) {
    const id = Number(staySubMatch[1])
    const action = staySubMatch[2]
    const stay = mockStays.find((x) => x.id === id)
    if (!stay && action !== 'questions' && action !== 'moments' && action !== 'reviews' && action !== 'availability') {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (action === 'availability' && method === 'GET') {
      const checkIn = (q.get('check_in') || '').trim()
      const checkOut = (q.get('check_out') || '').trim()
      const roomType = (q.get('room') || q.get('room_type_name') || '').trim()
      const guests = Math.max(1, Number(q.get('guests') || 1) || 1)
      const blocked_ranges = mockAccBlockedRanges(id, roomType).map((b) => ({
        check_in: b.check_in,
        check_out: b.check_out,
        status: b.status,
        room_type_name: b.room_type_name || '',
      }))
      if (!checkIn || !checkOut) {
        return { available: false, reason: 'Select check-in and check-out dates.', blocked_ranges }
      }
      if (checkOut <= checkIn) {
        return { available: false, reason: 'Check-out must be after check-in.', blocked_ranges }
      }
      if (guests > (stay?.max_guests ?? 1)) {
        return {
          available: false,
          reason: `This room fits up to ${stay?.max_guests ?? 1} guests.`,
          blocked_ranges,
        }
      }
      if (mockAccHasOverlap(id, checkIn, checkOut, roomType)) {
        return {
          available: false,
          reason: 'This stay is already booked for part of those dates. Try different dates.',
          blocked_ranges,
        }
      }
      const t0 = new Date(`${checkIn}T12:00:00`).getTime()
      const t1 = new Date(`${checkOut}T12:00:00`).getTime()
      const nights = Math.max(1, Math.round((t1 - t0) / (1000 * 60 * 60 * 24)))
      let nightly = Number(stay?.price_per_night ?? 0)
      if (roomType && Array.isArray(stay?.room_types)) {
        const match = (stay!.room_types as { name?: string; price_per_night?: string | number }[]).find(
          (r) => r && typeof r.name === 'string' && r.name.trim() === roomType,
        )
        if (match?.price_per_night != null && String(match.price_per_night).trim() !== '') {
          nightly = Number(match.price_per_night)
        }
      }
      return {
        available: true,
        nights,
        estimated_total: (nightly * nights).toFixed(2),
        blocked_ranges,
      }
    }
    if (action === 'questions' && method === 'GET') {
      return mockAccQuestions
        .filter((q) => q.listing === id)
        .map(({ listing_title: _lt, ...q }) => q)
    }
    if (action === 'questions' && method === 'POST') {
      requireAuth(s)
      if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
      const body = JSON.parse(init.body) as { body?: string }
      const prof = s.profiles[s.currentUser as string]
      const row: MockAccQuestionRow = {
        id: mockAccNextQuestionId++,
        listing: id,
        listing_title: stay?.title || '',
        author: prof?.display_name || (s.currentUser as string),
        body: (body.body || '').trim(),
        ago: 'Just now',
        answers: [],
      }
      mockAccQuestions.unshift(row)
      const { listing_title: _lt, ...out } = row
      return out
    }
    if (action === 'moments' && method === 'GET') {
      return visiblePosts(s.posts)
        .filter(
          (p) =>
            p.is_delvers &&
            !p.is_accommodation_story &&
            p.listing?.id === id,
        )
        .slice(0, 24)
        .map((p) => ({
          id: p.id,
          body: p.body,
          image: p.image,
          video: p.video,
          author: { username: p.author.username, display_name: p.author.display_name },
          listing: p.listing,
        }))
    }
    if (action === 'reviews' && method === 'GET') {
      const traveler = mockAccReviews
        .filter((r) => r.listing === id)
        .map((r, i) => ({
          id: `traveler-${i}`,
          name: r.name,
          place: [stay?.city, stay?.region].filter(Boolean).join(', '),
          rating: r.rating,
          body: r.body,
          avatar: null,
          source: 'traveler',
        }))
      const seeded = (stay?.guest_reviews ?? []).map((r, i) => ({
        id: `seed-${i}`,
        name: r.name,
        place: r.place || stay?.region || '',
        rating: r.rating,
        body: r.body,
        avatar: r.avatar ?? null,
        source: 'host',
      }))
      const reviews = [...traveler, ...seeded]
      const rated = reviews.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n))
      const rating_avg = rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 100) / 100 : 0
      return { reviews, rating_avg, rating_count: rated.length || stay?.rating_count || 0 }
    }
    if (action === 'like' && method === 'POST') {
      requireAuth(s)
      return { liked: true, likes_count: 1 }
    }
    if (action === 'save' && method === 'POST') {
      requireAuth(s)
      return { saved: true, saves_count: 1 }
    }
  }

  if (pathname === '/api/accounts/provider/listing-questions/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const ownedIds = new Set(mockStays.filter((st) => st.owner_username === me).map((st) => st.id))
    return mockAccQuestions
      .filter((q) => ownedIds.has(q.listing))
      .map((q) => ({
        id: q.id,
        category: 'stay',
        listing_id: q.listing,
        listing: q.listing,
        listing_title: q.listing_title,
        author: q.author,
        body: q.body,
        ago: q.ago,
        answers: q.answers,
        created_at: new Date().toISOString(),
      }))
  }

  if (pathname === '/api/accommodation/provider-questions/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const ownedIds = new Set(mockStays.filter((st) => st.owner_username === me).map((st) => st.id))
    return mockAccQuestions
      .filter((q) => ownedIds.has(q.listing))
      .map((q) => ({
        id: q.id,
        listing: q.listing,
        listing_title: q.listing_title,
        author: q.author,
        body: q.body,
        ago: q.ago,
        answers: q.answers,
      }))
  }

  const stayQuestionAnswerMatch = pathname.match(/^\/api\/accommodation\/questions\/(\d+)\/answers\/?$/)
  if (stayQuestionAnswerMatch && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const qid = Number(stayQuestionAnswerMatch[1])
    const question = mockAccQuestions.find((q) => q.id === qid)
    if (!question) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(init.body) as { body?: string }
    const me = s.currentUser as string
    const prof = s.profiles[me]
    const stay = mockStays.find((st) => st.id === question.listing)
    const isOfficial = stay?.owner_username === me
    const answer = {
      id: mockAccNextAnswerId++,
      author: prof?.display_name || me,
      body: (body.body || '').trim(),
      ago: 'Just now',
      is_official: isOfficial,
    }
    question.answers.push(answer)
    return answer
  }

  const stayMatch = pathname.match(/^\/api\/accommodation\/listings\/(\d+)\/$/)
  if (stayMatch && method === 'GET') {
    const id = Number(stayMatch[1])
    const s2 = mockStays.find((x) => x.id === id)
    return s2 ? enrichAccommodationListingRow(s, s2) : { detail: 'Not found' }
  }

  if (pathname === '/api/accommodation/bookings/' && method === 'GET') {
    requireAuth(s)
    const sessionRows = [...mockAccBookings.values()].map((row) => {
      const listing = mockStays.find((st) => st.id === row.listing)
      return {
        id: row.id,
        listing: row.listing,
        listing_title: row.listing_title,
        listing_owner_username: listing?.owner_username ?? '',
        check_in: row.check_in,
        check_out: row.check_out,
        guests: row.guests,
        total_price: row.total_price,
        special_requests: row.special_requests,
        room_type_name: row.room_type_name,
        status: row.status,
        mock_payment_ref: row.mock_payment_ref,
        has_review: mockAccReviewedBookings.has(row.id),
      }
    })
    if (sessionRows.length > 0) return sessionRows
    // Seed demo bookings so dashboard / badges work out of the box
    return [
      {
        id: 9001,
        listing: 101,
        listing_title: 'Freesia Hotel',
        check_in: '2026-06-12',
        check_out: '2026-06-14',
        guests: 2,
        total_price: '1400',
        status: 'pending',
        mock_payment_ref: '',
        has_review: false,
      },
    ]
  }

  const stayBookingReviewMatch = pathname.match(/^\/api\/accommodation\/bookings\/(\d+)\/review\/?$/)
  if (stayBookingReviewMatch && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const bookingId = Number(stayBookingReviewMatch[1])
    if (mockAccReviewedBookings.has(bookingId)) {
      throw new ApiError('Already reviewed', 400, { detail: 'You already reviewed this stay.' })
    }
    const body = JSON.parse(init.body) as { rating?: number; body?: string }
    const prof = s.profiles[s.currentUser as string]
    const name = prof?.display_name || (s.currentUser as string)
    const rating = Math.min(5, Math.max(1, Number(body.rating ?? 5) || 5))
    const reviewBody = (body.body || '').trim()
    let listingId = 101
    const sessionRow = mockAccBookings.get(bookingId)
    if (sessionRow) {
      listingId = sessionRow.listing
    } else if (bookingId === 9001) {
      listingId = 101
    }
    mockAccReviews.unshift({
      listing: listingId,
      booking: bookingId,
      name,
      rating,
      body: reviewBody || 'Great stay.',
      created_at: new Date().toISOString(),
    })
    mockAccReviewedBookings.add(bookingId)
    return { id: Date.now(), name, rating, body: reviewBody, created_at: new Date().toISOString() }
  }

  if (pathname === '/api/accommodation/bookings/' && method === 'POST') {
    requireAuth(s)
    const prof = s.currentUser ? s.profiles[s.currentUser] : undefined
    if (!prof?.email_verified) {
      throw new ApiError('Verify your email before booking.', 400, { detail: 'Email not verified.' })
    }
    if (!isJsonBody(init.body)) {
      throw new ApiError('Invalid body', 400, null)
    }
    const body = JSON.parse(init.body) as {
      listing?: number
      check_in?: string
      check_out?: string
      guests?: number
      special_requests?: string
      room_type_name?: string
    }
    const listingId = Number(body.listing)
    const listing = mockStays.find((x) => x.id === listingId)
    if (!listing) {
      throw new ApiError('Not found', 404, { detail: 'Listing not found.' })
    }
    const checkIn = (body.check_in || '').trim()
    const checkOut = (body.check_out || '').trim()
    const guests = Math.max(1, Number(body.guests ?? 1) || 1)
    if (!checkIn || !checkOut) {
      throw new ApiError('Invalid dates', 400, { detail: 'check_in and check_out required.' })
    }
    const t0 = new Date(`${checkIn}T12:00:00`).getTime()
    const t1 = new Date(`${checkOut}T12:00:00`).getTime()
    if (!(t1 > t0)) {
      throw new ApiError('Invalid dates', 400, { detail: 'check_out must be after check_in.' })
    }
    const roomTypeName = typeof body.room_type_name === 'string' ? body.room_type_name.trim() : ''
    let maxGuests = listing.max_guests
    let nightly = Number(listing.price_per_night)
    if (roomTypeName && Array.isArray(listing.room_types)) {
      const match = (listing.room_types as { name?: string; max_guests?: number; price_per_night?: string | number }[]).find(
        (r) => r && typeof r.name === 'string' && r.name.trim() === roomTypeName,
      )
      if (!match) {
        throw new ApiError('Invalid room', 400, { detail: 'Unknown room type for this listing.' })
      }
      if (match.max_guests != null && Number.isFinite(Number(match.max_guests))) {
        maxGuests = Math.min(maxGuests, Number(match.max_guests))
      }
      if (match.price_per_night != null && String(match.price_per_night).trim() !== '') {
        nightly = Number(match.price_per_night)
      }
    }
    if (guests > maxGuests) {
      throw new ApiError('Too many guests', 400, { detail: 'Too many guests for this listing.' })
    }
    if (mockAccHasOverlap(listingId, checkIn, checkOut, roomTypeName)) {
      throw new ApiError('Unavailable', 400, {
        detail: 'Those dates are no longer available. Please choose different dates.',
      })
    }
    const nights = Math.max(1, Math.round((t1 - t0) / (1000 * 60 * 60 * 24)))
    const total = (nightly * nights).toFixed(2)
    const special_requests = typeof body.special_requests === 'string' ? body.special_requests.trim() : ''
    const id = mockAccNextBookingId++
    const row: MockAccBookingRow = {
      id,
      listing: listingId,
      listing_title: listing.title,
      guest: s.currentUser as string,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      total_price: total,
      special_requests,
      room_type_name: roomTypeName,
      status: 'pending',
      mock_payment_ref: '',
    }
    mockAccBookings.set(id, row)
    return {
      id: row.id,
      listing: row.listing,
      listing_title: row.listing_title,
      listing_owner_username: listing.owner_username,
      guest: s.currentUser,
      check_in: row.check_in,
      check_out: row.check_out,
      guests: row.guests,
      total_price: row.total_price,
      special_requests: row.special_requests,
      room_type_name: row.room_type_name,
      status: row.status,
      mock_payment_ref: row.mock_payment_ref,
      created_at: nowIso(),
    }
  }

  const accCancelMatch = pathname.match(/^\/api\/accommodation\/bookings\/(\d+)\/cancel\/?$/)
  if (accCancelMatch && method === 'POST') {
    requireAuth(s)
    const bid = Number(accCancelMatch[1])
    const b = mockAccBookings.get(bid)
    if (!b) {
      throw new ApiError('Not found', 404, { detail: 'Booking not found.' })
    }
    if (b.status === 'cancelled' || b.status === 'refunded' || b.status === 'checked_out') {
      throw new ApiError('Bad request', 400, { detail: 'Booking cannot be cancelled.' })
    }
    b.status = 'cancelled'
    mockAccBookings.set(bid, b)
    const listing = mockStays.find((st) => st.id === b.listing)
    return {
      id: b.id,
      listing: b.listing,
      listing_title: b.listing_title,
      listing_owner_username: listing?.owner_username ?? '',
      status: b.status,
    }
  }

  const accMockPay = pathname.match(/^\/api\/accommodation\/bookings\/(\d+)\/mock_pay\/$/)
  if (accMockPay && method === 'POST') {
    requireAuth(s)
    const bid = Number(accMockPay[1])
    const b = mockAccBookings.get(bid)
    if (!b) {
      throw new ApiError('Not found', 404, { detail: 'Booking not found.' })
    }
    if (b.status !== 'confirmed') {
      throw new ApiError('Bad request', 400, { detail: 'Payment is available after the host confirms your stay.' })
    }
    if (b.mock_payment_ref) {
      throw new ApiError('Bad request', 400, { detail: 'Payment already recorded.' })
    }
    b.mock_payment_ref = `mock_${Math.random().toString(36).slice(2, 18)}`
    mockAccBookings.set(bid, b)
    const listing = mockStays.find((st) => st.id === b.listing)
    return {
      detail: 'Payment successful (mock).',
      status: b.status,
      mock_payment_ref: b.mock_payment_ref,
      booking: {
        id: b.id,
        listing: b.listing,
        listing_title: b.listing_title,
        listing_owner_username: listing?.owner_username ?? '',
        status: b.status,
        mock_payment_ref: b.mock_payment_ref,
      },
    }
  }

  // ---- Transport ----
  if (pathname === '/api/transport/provider-vehicles/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    return mockVehicles
      .filter((v) => v.owner_username === me)
      .map((v) => ({
        id: v.id,
        title: v.title,
        make: v.make,
        model: v.model,
        year: v.year,
        transmission: v.transmission,
        seats: v.seats,
        vehicle_type: v.vehicle_type,
        price_per_day: v.price_per_day,
        region: v.region,
        city: v.city,
        cover_image: v.cover_image,
        description: v.description ?? '',
        pickup_location: v.pickup_location ?? '',
        included_features: v.included_features ?? [],
        gallery_images: v.gallery_images ?? [],
        required_renter_documents: v.required_renter_documents ?? [],
        is_active: (v as { is_active?: boolean }).is_active !== false,
      }))
  }

  if (pathname === '/api/transport/provider-vehicles/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    const id = Math.max(0, ...mockVehicles.map((v) => v.id)) + 1
    const row = {
      id,
      owner_username: me,
      owner_display_name: prof.display_name ?? me,
      owner_bio: prof.bio ?? '',
      owner_region: prof.region ?? '',
      owner_city: prof.city ?? '',
      owner_avatar: prof.avatar ?? null,
      ...data,
      included_features: data.included_features ?? [],
      gallery_images: data.gallery_images ?? [],
      required_renter_documents: data.required_renter_documents ?? [],
      is_active: data.is_active !== false,
    }
    mockVehicles.push(row as (typeof mockVehicles)[0])
    return row
  }

  const providerVehicleMatch = pathname.match(/^\/api\/transport\/provider-vehicles\/(\d+)\/?$/)
  if (providerVehicleMatch && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    const v = mockVehicles.find((x) => x.id === Number(providerVehicleMatch[1]) && x.owner_username === me)
    if (!v) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    Object.assign(v, data)
    return { ...v, ...data }
  }

  if (pathname === '/api/transport/provider-bus-trips/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return mockBusTrips
      .filter((t) => (t as { owner_username?: string }).owner_username === me)
      .map((t) => busTripDetailForApi(t))
  }

  if (pathname === '/api/transport/provider-bus-trips/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    const id = Math.max(0, ...mockBusTrips.map((t) => t.id)) + 1
    const row = {
      id,
      owner_username: me,
      route_detail: data.route_detail,
      departs_at: data.departs_at,
      arrives_at: data.arrives_at,
      price: data.price,
      total_seats: data.total_seats,
      occupied_seats: [],
      available_seats: Number(data.total_seats) || 32,
      amenities: data.amenities ?? [],
      is_active: data.is_active !== false,
    }
    mockBusTrips.push(row as (typeof mockBusTrips)[0])
    return busTripDetailForApi(row as (typeof mockBusTrips)[0])
  }

  const providerBusTripMatch = pathname.match(/^\/api\/transport\/provider-bus-trips\/(\d+)\/?$/)
  if (providerBusTripMatch && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    const t = mockBusTrips.find(
      (x) => x.id === Number(providerBusTripMatch[1]) && (x as { owner_username?: string }).owner_username === me,
    )
    if (!t) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    if (data.route_detail) Object.assign(t.route_detail, data.route_detail)
    Object.assign(t, { ...data, route_detail: t.route_detail })
    if (data.total_seats) {
      t.available_seats = Math.max(0, Number(data.total_seats) - (t.occupied_seats?.length ?? 0))
    }
    return busTripDetailForApi(t)
  }

  if (pathname === '/api/transport/provider-rental-bookings/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const myVehicles = mockVehicles.filter((v) => v.owner_username === me)
    const myIds = new Set(myVehicles.map((v) => v.id))
    const myTitles = new Set(myVehicles.map((v) => v.title))
    const staticRows = [
      {
        id: 1,
        vehicle_title: 'Toyota Hilux 4x4',
        guest_display_name: 'Chris D.',
        guest_username: 'demo_user',
        check_in: '2026-05-10',
        check_out: '2026-05-14',
        days: 4,
        total_price: '3120',
        status: 'confirmed',
        renter_document_count: 3,
      },
      {
        id: 2,
        vehicle_title: 'Mercedes V-Class People Mover',
        guest_display_name: 'Priya N.',
        guest_username: 'anna',
        check_in: '2026-05-18',
        check_out: '2026-05-20',
        days: 2,
        total_price: '2500',
        status: 'pending',
        renter_document_count: 0,
      },
    ]
    const sessionRows = [...mockVehicleBookings.values()]
      .filter((row) => myIds.has(row.listing))
      .map((row) => {
        const vehicle = myVehicles.find((v) => v.id === row.listing)
        const clientKey = String(row.client ?? '')
        const clientProf = s.profiles[clientKey]
        const days = rentalDaysInclusive(row.start_date, row.end_date) ?? 1
        return {
          id: row.id,
          vehicle_title: vehicle?.title ?? 'Vehicle rental',
          guest_display_name: clientProf?.display_name ?? (clientKey || 'Guest'),
          guest_username: clientKey,
          check_in: row.start_date,
          check_out: row.end_date,
          days,
          total_price: row.total_price,
          status: row.status,
          renter_document_count: row.renter_documents?.length ?? 0,
        }
      })
    return [...staticRows.filter((r) => myTitles.has(r.vehicle_title)), ...sessionRows]
  }

  if (pathname === '/api/transport/provider-seat-bookings/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const myRoutes = new Set(
      mockBusTrips
        .filter((t) => (t as { owner_username?: string }).owner_username === me)
        .map((t) => `${t.route_detail.origin} → ${t.route_detail.destination}`),
    )
    const rows = [
      { id: 1, route_label: 'Windhoek → Swakopmund', passenger_display_name: 'Lisa M.', passenger_username: 'demo_user', seat: 5, date: '2026-05-11', total_price: '180', status: 'confirmed' },
      { id: 2, route_label: 'Windhoek → Oshakati', passenger_display_name: 'David O.', passenger_username: 'anna', seat: 12, date: '2026-05-15', total_price: '240', status: 'confirmed' },
      { id: 3, route_label: 'Windhoek → Swakopmund', passenger_display_name: 'Anna F.', passenger_username: 'demo_user', seat: 18, date: '2026-05-21', total_price: '180', status: 'pending' },
    ]
    return rows.filter((r) => myRoutes.has(r.route_label))
  }

  const transportRentalBookingAction = pathname.match(
    /^\/api\/transport\/provider-rental-bookings\/(\d+)\/(confirm|cancel|check_in|check_out|refund)\/?$/,
  )
  if (transportRentalBookingAction && method === 'POST') {
    requireAuth(s)
    const statusMap: Record<string, string> = {
      confirm: 'confirmed',
      cancel: 'cancelled',
      check_in: 'checked_in',
      check_out: 'checked_out',
      refund: 'refunded',
    }
    const id = Number(transportRentalBookingAction[1])
    const session = [...mockVehicleBookings.values()].find((r) => r.id === id)
    if (session) {
      session.status = statusMap[transportRentalBookingAction[2]] ?? session.status
    }
    return {
      id,
      vehicle_title: 'Toyota Hilux 4x4',
      guest_display_name: 'Chris D.',
      guest_username: 'demo_user',
      check_in: session?.start_date ?? '2026-05-10',
      check_out: session?.end_date ?? '2026-05-14',
      days: 4,
      total_price: session?.total_price ?? '3120',
      status: statusMap[transportRentalBookingAction[2]] ?? 'confirmed',
      renter_document_count: session?.renter_documents?.length ?? 0,
    }
  }

  const transportSeatBookingAction = pathname.match(
    /^\/api\/transport\/provider-seat-bookings\/(\d+)\/(confirm|cancel|check_in|check_out|refund)\/?$/,
  )
  if (transportSeatBookingAction && method === 'POST') {
    requireAuth(s)
    const statusMap: Record<string, string> = {
      confirm: 'confirmed',
      cancel: 'cancelled',
      check_in: 'checked_in',
      check_out: 'checked_out',
      refund: 'refunded',
    }
    return {
      id: Number(transportSeatBookingAction[1]),
      route_label: 'Windhoek → Swakopmund',
      passenger_display_name: 'Anna F.',
      passenger_username: 'demo_user',
      seat: 18,
      date: '2026-05-21',
      total_price: '180',
      status: statusMap[transportSeatBookingAction[2]] ?? 'confirmed',
    }
  }

  if (pathname === '/api/transport/vehicles/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const min = Number(q.get('min_price') || '0')
    const max = Number(q.get('max_price') || '999999')
    const minSeats = Number(q.get('min_seats') || '0')
    const types = q.getAll('vehicle_type').filter(Boolean)
    return mockVehicles
      .filter((v) => (region ? textMatch(v.region, region) || textMatch(v.city, region) : true))
      .filter((v) => Number(v.price_per_day) >= min && Number(v.price_per_day) <= max)
      .filter((v) => (minSeats > 0 ? v.seats >= minSeats : true))
      .filter((v) => (types.length ? types.includes(v.vehicle_type) : true))
  }
  const vehMatch = pathname.match(/^\/api\/transport\/vehicles\/(\d+)\/$/)
  if (vehMatch && method === 'GET') {
    const id = Number(vehMatch[1])
    return mockVehicles.find((v) => v.id === id) || { detail: 'Not found' }
  }
  const vehMomentsMatch = pathname.match(/^\/api\/transport\/vehicles\/(\d+)\/moments\/$/)
  if (vehMomentsMatch && method === 'GET') {
    const id = Number(vehMomentsMatch[1])
    return s.posts.filter(
      (p) => p.is_delvers && !p.is_hidden && p.vehicle_listing?.id === id,
    )
  }
  const vehReviewsMatch = pathname.match(/^\/api\/transport\/vehicles\/(\d+)\/reviews\/$/)
  if (vehReviewsMatch && method === 'GET') {
    const id = Number(vehReviewsMatch[1])
    const vehicle = mockVehicles.find((v) => v.id === id)
    const staticReviews =
      (vehicle as { mock_reviews?: { name: string; place: string; rating: number; body: string; source?: string }[] } | undefined)
        ?.mock_reviews ?? []
    const sessionReviews = mockVehSessionReviews.filter((r) => r.listing === id)
    const reviews = [
      ...staticReviews.map((r) => ({
        name: r.name,
        place: r.place,
        rating: r.rating,
        body: r.body,
        source: r.source,
      })),
      ...sessionReviews.map((r) => ({
        name: r.name,
        place: vehicle?.title ?? 'Vehicle rental',
        rating: r.rating,
        body: r.body,
        source: 'delve',
      })),
    ]
    const count = reviews.length
    const avg = count ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(2) : null
    return { reviews, rating_avg: avg, rating_count: count }
  }
  if (pathname === '/api/transport/bus/trips/' && method === 'GET') {
    const o = (q.get('route_origin') || '').trim()
    const d = (q.get('route_destination') || '').trim()
    const travelDate = (q.get('travel_date') || '').trim()
    return mockBusTrips
      .filter((t) => (o ? textMatch(t.route_detail.origin, o) : true))
      .filter((t) => (d ? textMatch(t.route_detail.destination, d) : true))
      .filter((t) => {
        if (!travelDate) return true
        const dep = new Date(t.departs_at)
        const y = dep.getFullYear()
        const m = String(dep.getMonth() + 1).padStart(2, '0')
        const day = String(dep.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}` === travelDate
      })
      .map((t) => busTripDetailForApi(t))
  }
  const tripMatch = pathname.match(/^\/api\/transport\/bus\/trips\/(\d+)\/$/)
  if (tripMatch && method === 'GET') {
    const id = Number(tripMatch[1])
    const t = mockBusTrips.find((tr) => tr.id === id)
    return t ? busTripDetailForApi(t) : { detail: 'Not found' }
  }
  const tripMomentsMatch = pathname.match(/^\/api\/transport\/bus\/trips\/(\d+)\/moments\/$/)
  if (tripMomentsMatch && method === 'GET') {
    const id = Number(tripMomentsMatch[1])
    return s.posts.filter((p) => p.is_delvers && !p.is_hidden && p.bus_trip?.id === id)
  }
  const tripReviewsMatch = pathname.match(/^\/api\/transport\/bus\/trips\/(\d+)\/reviews\/$/)
  if (tripReviewsMatch && method === 'GET') {
    const id = Number(tripReviewsMatch[1])
    const trip = mockBusTrips.find((t) => t.id === id)
    const place = trip
      ? `${trip.route_detail.origin} → ${trip.route_detail.destination}`
      : 'Bus trip'
    const reviews = mockBusTripSessionReviews
      .filter((r) => r.listing === id)
      .map((r) => ({
        name: r.name,
        place,
        rating: r.rating,
        body: r.body,
        source: 'delve',
      }))
    const count = reviews.length
    const avg = count ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(2) : null
    return { reviews, rating_avg: avg, rating_count: count }
  }

  if (pathname === '/api/transport/bus/reservations/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) {
      throw new ApiError('Invalid body', 400, null)
    }
    const prof = s.currentUser ? s.profiles[s.currentUser] : undefined
    if (!prof?.email_verified) {
      throw new ApiError('Verify your email before booking.', 400, { detail: 'Email not verified.' })
    }
    const body = JSON.parse(init.body) as { trip?: number; seat_numbers?: unknown }
    const tripId = body.trip
    const rawSeats = body.seat_numbers
    if (tripId == null || !Array.isArray(rawSeats)) {
      throw new ApiError('Provide trip and seat_numbers.', 400, null)
    }
    const trip = mockBusTrips.find((x) => x.id === tripId)
    if (!trip) {
      throw new ApiError('Trip not found.', 404, { detail: 'Not found' })
    }
    let seats: number[]
    try {
      seats = rawSeats.map((n) => Number(n))
    } catch {
      throw new ApiError('Invalid seat numbers.', 400, null)
    }
    if (seats.some((n) => Number.isNaN(n))) {
      throw new ApiError('Invalid seat numbers.', 400, null)
    }
    seats = [...seats].sort((a, b) => a - b)
    if (seats.length < 1 || seats.length > 4) {
      throw new ApiError('Book 1 to 4 seats.', 400, null)
    }
    if (new Set(seats).size !== seats.length) {
      throw new ApiError('Duplicate seats.', 400, null)
    }
    for (let i = 0; i < seats.length - 1; i += 1) {
      if (seats[i + 1] !== seats[i] + 1) {
        throw new ApiError('Seats must be adjacent (one block).', 400, null)
      }
    }
    const occ = new Set(busTripOccupied(tripId))
    for (const n of seats) {
      if (n < 1 || n > trip.total_seats) {
        throw new ApiError('Invalid seat number.', 400, null)
      }
      if (occ.has(n)) {
        throw new ApiError('One or more seats are no longer available.', 400, null)
      }
    }
    if (!mockBusSessionTaken.has(tripId)) {
      mockBusSessionTaken.set(tripId, new Set())
    }
    const add = mockBusSessionTaken.get(tripId)!
    for (const n of seats) {
      add.add(n)
    }
    const reservations = seats.map((seat_number) => {
      const rid = nextBusReservationId++
      const row = {
        id: rid,
        trip: tripId,
        seat_number,
        status: 'pending' as const,
        mock_payment_ref: '',
        client: s.currentUser as string,
      }
      mockBusReservationRows.set(rid, row)
      return formatBusReservationRow(row)
    })
    const total_price = (Number(trip.price) * seats.length).toFixed(2)
    return { reservations, total_price, seat_count: seats.length }
  }

  if (pathname === '/api/transport/bus/reservations/bulk-mock-pay/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) {
      throw new ApiError('Invalid body', 400, null)
    }
    const body = JSON.parse(init.body) as { reservation_ids?: unknown }
    const ids = body.reservation_ids
    if (!Array.isArray(ids) || !ids.length) {
      throw new ApiError('reservation_ids required.', 400, null)
    }
    const ref = `mock_${Math.random().toString(36).slice(2, 18)}`
    const out: ReturnType<typeof formatBusReservationRow>[] = []
    let tripIdForBatch: number | null = null
    for (const raw of ids) {
      const id = Number(raw)
      const row = mockBusReservationRows.get(id)
      if (!row || row.status !== 'pending') {
        throw new ApiError('Invalid or non-pending reservation.', 400, null)
      }
      row.status = 'confirmed'
      row.mock_payment_ref = ref
      if (tripIdForBatch == null) {
        tripIdForBatch = row.trip
      } else if (tripIdForBatch !== row.trip) {
        throw new ApiError('All reservations must be for the same trip.', 400, null)
      }
      out.push(formatBusReservationRow(row))
    }
    return {
      detail: 'Payment successful (mock).',
      status: 'confirmed',
      mock_payment_ref: ref,
      reservations: out,
    }
  }

  const busResCancel = pathname.match(/^\/api\/transport\/bus\/reservations\/(\d+)\/cancel\/$/)
  if (busResCancel && method === 'POST') {
    requireAuth(s)
    const rid = Number(busResCancel[1])
    const row = mockBusReservationRows.get(rid)
    if (!row || row.client !== s.currentUser) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    row.status = 'cancelled'
    const trip = mockBusTrips.find((t) => t.id === row.trip)
    const route = trip?.route_detail
    return {
      id: row.id,
      trip: row.trip,
      trip_departs_at: trip?.departs_at ?? nowIso(),
      route_label: route ? `${route.origin} → ${route.destination}` : 'Bus trip',
      seat_number: row.seat_number,
      seat_price: trip?.price ?? '0',
      status: row.status,
      mock_payment_ref: row.mock_payment_ref,
    }
  }

  const busResMockPay = pathname.match(/^\/api\/transport\/bus\/reservations\/(\d+)\/mock_pay\/$/)
  if (busResMockPay && method === 'POST') {
    requireAuth(s)
    const rid = Number(busResMockPay[1])
    const row = mockBusReservationRows.get(rid)
    if (!row || row.status !== 'pending') {
      throw new ApiError('Not payable.', 400, null)
    }
    const ref = `mock_${Math.random().toString(36).slice(2, 18)}`
    row.status = 'confirmed'
    row.mock_payment_ref = ref
    return {
      detail: 'Payment successful (mock).',
      status: 'confirmed',
      mock_payment_ref: ref,
    }
  }

  if (pathname === '/api/transport/vehicle-bookings/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const rows = [...mockVehicleBookings.values()].filter((row) => row.client === me)
    return rows.map((row) => {
      const vehicle = mockVehicles.find((v) => v.id === row.listing)
      return {
        id: row.id,
        listing: row.listing,
        listing_title: vehicle?.title ?? 'Vehicle rental',
        listing_owner_username: vehicle?.owner_username ?? '',
        owner_display_name: vehicle?.owner_username ?? '',
        listing_region: vehicle?.region ?? '',
        listing_city: vehicle?.city ?? '',
        renter: 1,
        start_date: row.start_date,
        end_date: row.end_date,
        total_price: row.total_price,
        status: row.status,
        mock_payment_ref: row.mock_payment_ref,
        created_at: nowIso(),
        has_review: mockVehReviewedBookings.has(row.id),
      }
    })
  }

  if (pathname === '/api/transport/bus/reservations/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return [...mockBusReservationRows.values()]
      .filter((row) => row.client === me)
      .map((row) => {
        const trip = mockBusTrips.find((t) => t.id === row.trip)
        const route = trip?.route_detail
        return {
          id: row.id,
          trip: row.trip,
          trip_departs_at: trip?.departs_at ?? nowIso(),
          route_label: route ? `${route.origin} → ${route.destination}` : 'Bus trip',
          operator_name: route?.operator_name ?? 'Operator',
          operator_owner_username: (trip as { owner_username?: string })?.owner_username ?? '',
          passenger: 1,
          seat_number: row.seat_number,
          seat_price: trip?.price ?? '0',
          status: row.status,
          mock_payment_ref: row.mock_payment_ref,
          created_at: nowIso(),
          has_review: mockBusReviewedReservations.has(row.id),
        }
      })
  }

  if (pathname === '/api/transport/vehicle-bookings/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) {
      throw new ApiError('Invalid body', 400, null)
    }
    const prof = s.currentUser ? s.profiles[s.currentUser] : undefined
    if (!prof?.email_verified) {
      throw new ApiError('Verify your email before booking.', 400, { detail: 'Email not verified.' })
    }
    const body = JSON.parse(init.body) as {
      listing?: number
      start_date?: string
      end_date?: string
      pickup_area?: string
      renter_documents?: { doc_type: string; file_name: string; image_data: string }[]
    }
    const listingId = Number(body.listing)
    const vehicle = mockVehicles.find((v) => v.id === listingId)
    if (!vehicle) {
      throw new ApiError('Vehicle not found.', 404, { detail: 'Not found' })
    }
    const required = vehicle.required_renter_documents ?? []
    const docs = Array.isArray(body.renter_documents) ? body.renter_documents : []
    const missingDocs = required.filter((id) => !docs.some((d) => d.doc_type === id && d.image_data))
    if (missingDocs.length > 0) {
      throw new ApiError('Upload all required documents.', 400, { detail: 'Missing renter documents.' })
    }
    const start = String(body.start_date || '').trim()
    const end = String(body.end_date || '').trim()
    if (!start || !end) {
      throw new ApiError('Dates required.', 400, null)
    }
    const days = rentalDaysInclusive(start, end)
    if (!days) {
      throw new ApiError('Invalid dates.', 400, { detail: 'Return date must be on or after pick-up.' })
    }
    const total = (Number(vehicle.price_per_day) * days).toFixed(2)
    const id = mockVehicleBookingNextId++
    const row: MockVehicleBookingRow = {
      id,
      listing: listingId,
      client: s.currentUser as string,
      start_date: start,
      end_date: end,
      pickup_area: body.pickup_area || '',
      total_price: total,
      status: 'pending',
      mock_payment_ref: '',
      renter_documents: docs,
    }
    mockVehicleBookings.set(id, row)
    return {
      id: row.id,
      status: row.status,
      total_price: row.total_price,
      mock_payment_ref: row.mock_payment_ref,
    }
  }

  const vehBookCancel = pathname.match(/^\/api\/transport\/vehicle-bookings\/(\d+)\/cancel\/$/)
  if (vehBookCancel && method === 'POST') {
    requireAuth(s)
    const bid = Number(vehBookCancel[1])
    const row = mockVehicleBookings.get(bid)
    if (!row || row.client !== s.currentUser) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    row.status = 'cancelled' as const
    const vehicle = mockVehicles.find((v) => v.id === row.listing)
    return {
      id: row.id,
      listing: row.listing,
      listing_title: vehicle?.title ?? 'Vehicle rental',
      listing_owner_username: vehicle?.owner_username ?? '',
      start_date: row.start_date,
      end_date: row.end_date,
      total_price: row.total_price,
      status: row.status,
      mock_payment_ref: row.mock_payment_ref,
    }
  }

  const vehBookMockPay = pathname.match(/^\/api\/transport\/vehicle-bookings\/(\d+)\/mock_pay\/$/)
  if (vehBookMockPay && method === 'POST') {
    requireAuth(s)
    const bid = Number(vehBookMockPay[1])
    const row = mockVehicleBookings.get(bid)
    if (!row || row.status !== 'pending') {
      throw new ApiError('Not payable.', 400, null)
    }
    const ref = `mock_${Math.random().toString(36).slice(2, 18)}`
    row.status = 'confirmed'
    row.mock_payment_ref = ref
    return {
      detail: 'Payment successful (mock).',
      status: 'confirmed',
      mock_payment_ref: ref,
    }
  }

  const vehBookReview = pathname.match(/^\/api\/transport\/vehicle-bookings\/(\d+)\/review\/?$/)
  if (vehBookReview && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const bookingId = Number(vehBookReview[1])
    const row = mockVehicleBookings.get(bookingId)
    if (!row || row.client !== s.currentUser) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (row.status !== 'confirmed') {
      throw new ApiError('Booking not eligible for review.', 400, { detail: 'Confirm your booking first.' })
    }
    if (mockVehReviewedBookings.has(bookingId)) {
      throw new ApiError('Already reviewed', 400, { detail: 'You already reviewed this rental.' })
    }
    const body = JSON.parse(init.body) as { rating?: number; body?: string }
    const prof = s.profiles[s.currentUser as string]
    const name = prof?.display_name || (s.currentUser as string)
    const rating = Math.min(5, Math.max(1, Number(body.rating ?? 5) || 5))
    const reviewBody = (body.body || '').trim()
    mockVehSessionReviews.unshift({
      listing: row.listing,
      name,
      rating,
      body: reviewBody || 'Great rental.',
      created_at: new Date().toISOString(),
    })
    mockVehReviewedBookings.add(bookingId)
    return { id: Date.now(), name, rating, body: reviewBody, created_at: new Date().toISOString() }
  }

  const busResReview = pathname.match(/^\/api\/transport\/bus\/reservations\/(\d+)\/review\/?$/)
  if (busResReview && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const reservationId = Number(busResReview[1])
    const row = mockBusReservationRows.get(reservationId)
    if (!row || row.client !== s.currentUser) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (row.status !== 'confirmed') {
      throw new ApiError('Reservation not eligible for review.', 400, { detail: 'Confirm your trip first.' })
    }
    if (mockBusReviewedReservations.has(reservationId)) {
      throw new ApiError('Already reviewed', 400, { detail: 'You already reviewed this trip.' })
    }
    const body = JSON.parse(init.body) as { rating?: number; body?: string }
    const prof = s.profiles[s.currentUser as string]
    const name = prof?.display_name || (s.currentUser as string)
    const rating = Math.min(5, Math.max(1, Number(body.rating ?? 5) || 5))
    const reviewBody = (body.body || '').trim()
    mockBusTripSessionReviews.unshift({
      listing: row.trip,
      name,
      rating,
      body: reviewBody || 'Smooth ride.',
      created_at: new Date().toISOString(),
    })
    mockBusReviewedReservations.add(reservationId)
    return { id: Date.now(), name, rating, body: reviewBody, created_at: new Date().toISOString() }
  }

  // ---- Public announcement (home banner) ----
  if (pathname === '/api/accounts/announcement/' && method === 'GET') {
    return { active: false, title: '', body: '' }
  }

  // ---- Home stories (highlights row) ----
  if (pathname === '/api/home/stories/' && method === 'GET') {
    const { buildSlidesForChannel, STORY_CHANNELS } = await import('../data/homeStories')
    const region = (q.get('region') || '').trim().toLowerCase()
    const hostStories = postsForViewer(s, s.posts)
      .filter((p) => p.is_accommodation_story && (p.image || p.video))
      .filter((p) => (region ? p.region.toLowerCase().includes(region) : true))
      .slice(0, 6)
    const delversPins = postsForViewer(s, s.posts)
      .filter((p) => p.is_delvers && !p.is_accommodation_story && (p.image || p.video))
      .filter((p) => (region ? p.region.toLowerCase().includes(region) : true))
      .slice(0, 6)

    const staysSlides =
      hostStories.length > 0
        ? hostStories.map((p) => ({
            id: `host-story-${p.id}`,
            kind: p.video ? 'video' : 'image',
            src: p.video || p.image || '',
            headline: (p.body || 'Host story').slice(0, 100),
            sub: p.region || 'Host update',
            duration_ms: p.video ? 15000 : 5200,
            cta_path: p.listing?.id ? `/accommodation/${p.listing.id}` : `/u/${p.author.username}`,
            cta_label: p.listing?.id ? 'View stay' : 'View host',
            source: 'host_story',
          }))
        : buildSlidesForChannel('stays', {}).map((slide) => ({
            id: slide.id,
            kind: slide.kind,
            src: slide.src,
            headline: slide.headline,
            sub: slide.sub ?? '',
            duration_ms: slide.durationMs ?? 5200,
            cta_path: slide.ctaPath ?? '/accommodation',
            cta_label: slide.ctaLabel ?? 'Explore',
            source: 'fallback',
          }))

    const pinsSlides =
      delversPins.length > 0
        ? delversPins.map((p) => ({
            id: `post-${p.id}`,
            kind: p.video ? 'video' : 'image',
            src: p.video || p.image || '',
            headline: (p.body || 'Delvers pin').slice(0, 100),
            sub: p.region || '',
            duration_ms: p.video ? 15000 : 5200,
            cta_path: `/delvers/posts/${p.id}`,
            cta_label: 'View pin',
            source: 'post',
          }))
        : buildSlidesForChannel('pins', {}).map((slide) => ({
            id: slide.id,
            kind: slide.kind,
            src: slide.src,
            headline: slide.headline,
            sub: slide.sub ?? '',
            duration_ms: slide.durationMs ?? 5200,
            cta_path: slide.ctaPath ?? '/delvers',
            cta_label: slide.ctaLabel ?? 'Explore',
            source: 'fallback',
          }))

    const channelSlides: Record<string, typeof staysSlides> = {
      stays: staysSlides,
      pins: pinsSlides,
    }

    return {
      channels: STORY_CHANNELS.map((c) => {
        const slides =
          channelSlides[c.id] ??
          buildSlidesForChannel(c.id, {}).map((slide) => ({
            id: slide.id,
            kind: slide.kind,
            src: slide.src,
            headline: slide.headline,
            sub: slide.sub ?? '',
            duration_ms: slide.durationMs ?? 5200,
            cta_path: slide.ctaPath ?? c.explorePath,
            cta_label: slide.ctaLabel ?? 'Explore',
            source: 'fallback',
          }))
        return {
          id: c.id,
          label: c.label,
          explore_path: c.explorePath,
          ring_initial: c.label.slice(0, 1).toUpperCase(),
          ring_image: slides[0]?.src ?? null,
          slides,
        }
      }),
    }
  }

  // ---- Journeys ----
  if (pathname === '/api/journeys/' && method === 'GET') {
    const author = (q.get('author') || '').trim()
    const featuredRaw = (q.get('featured') || '').trim().toLowerCase()
    const featuredFirstRaw = (q.get('featured_first') || '').trim().toLowerCase()
    const limitRaw = Number(q.get('limit') || '0')
    let rows = mockVisibleJourneys(s)
    if (author) {
      rows = rows.filter((j) => textMatch(j.author.username, author))
    }
    if (featuredRaw === '1' || featuredRaw === 'true' || featuredRaw === 'yes') {
      rows = rows.filter((j) => j.is_featured)
      rows = [...rows].sort((a, b) => (b.saves_count || 0) - (a.saves_count || 0) || b.id - a.id)
    } else if (featuredFirstRaw === '1' || featuredFirstRaw === 'true' || featuredFirstRaw === 'yes') {
      rows = [...rows].sort(
        (a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || b.id - a.id,
      )
    } else {
      rows = [...rows].sort((a, b) => b.id - a.id)
    }
    if (limitRaw > 0) rows = rows.slice(0, limitRaw)
    return rows.map((j) => mockSerializeJourney(s, j))
  }

  const journeyDetailMatch = pathname.match(/^\/api\/journeys\/(\d+)\/?$/)
  if (journeyDetailMatch && method === 'GET') {
    const id = Number(journeyDetailMatch[1])
    const j = s.journeys.find((row) => row.id === id)
    if (!j || j.is_hidden || (j.visibility ?? 'public') !== 'public') {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    return mockSerializeJourney(s, j)
  }

  if (journeyDetailMatch && method === 'PATCH') {
    requireAuth(s)
    const id = Number(journeyDetailMatch[1])
    const idx = s.journeys.findIndex((row) => row.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const j = s.journeys[idx]
    const me = s.currentUser as string
    if (j.author.username.toLowerCase() !== me.toLowerCase()) {
      throw new ApiError('Forbidden', 403, { detail: 'Only the author can edit this journey.' })
    }
    if (!isJsonBody(init.body)) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    }
    const body = JSON.parse(init.body) as Partial<MockJourney>
    const updated: MockJourney = {
      ...j,
      ...body,
      id: j.id,
      author: j.author,
      starts_at: body.starts_on || body.starts_at || j.starts_at || j.starts_on,
    }
    s.journeys[idx] = updated
    saveState(s)
    return mockSerializeJourney(s, updated)
  }

  if (journeyDetailMatch && method === 'DELETE') {
    requireAuth(s)
    const id = Number(journeyDetailMatch[1])
    const idx = s.journeys.findIndex((row) => row.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const j = s.journeys[idx]
    const me = s.currentUser as string
    if (j.author.username.toLowerCase() !== me.toLowerCase()) {
      throw new ApiError('Forbidden', 403, { detail: 'Only the author can delete this journey.' })
    }
    s.journeys.splice(idx, 1)
    saveState(s)
    return { ok: true }
  }

  const journeyEntryShareMatch = pathname.match(/^\/api\/journeys\/entries\/(\d+)\/share\/?$/)
  if (journeyEntryShareMatch && method === 'POST') {
    requireAuth(s)
    const entryId = Number(journeyEntryShareMatch[1])
    const me = s.currentUser as string
    let foundEntry: { body?: string; image?: string | null; video?: string | null } | null = null
    let journey: MockJourney | null = null
    let placeName = ''
    let region = ''
    for (const j of s.journeys) {
      if (j.is_hidden) continue
      for (const stop of j.stops || []) {
        const entry = (stop.entries || []).find((e) => e.id === entryId)
        if (entry) {
          foundEntry = entry
          journey = j
          placeName = stop.place_name
          region = stop.region || ''
          break
        }
      }
      if (foundEntry) break
    }
    if (!foundEntry || !journey) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (journey.author.username.toLowerCase() !== me.toLowerCase()) {
      throw new ApiError('Forbidden', 403, { detail: 'Only the journey author can share this moment.' })
    }
    const note = (foundEntry.body || '').trim()
    const hasMedia = Boolean((foundEntry.image || '').trim() || (foundEntry.video || '').trim())
    if (!note && !hasMedia) {
      throw new ApiError('Bad request', 400, { detail: 'This moment has nothing to share yet.' })
    }
    const profile = s.profiles[me]
    const lines = note ? [note] : []
    lines.push(`From my journey: ${journey.title} · ${placeName}`)
    lines.push(`/journeys/${journey.id}`)
    const delversPost: MockPost = {
      id: s.nextPostId++,
      author: { username: me, display_name: profile?.display_name?.trim() || me, avatar: profile?.avatar ?? null },
      body: lines.join('\n\n'),
      region,
      place_label: placeName,
      image: null,
      video: null,
      is_delvers: true,
      delvers_board: 'Journeys',
      post_kind: 'tip',
      likes_count: 0,
      saves_count: 0,
      comments_count: 0,
      liked_by_me: false,
      saved_by_me: false,
    }
    s.posts.unshift(delversPost)
    saveState(s)
    return withMeFlags(s, [delversPost])[0]
  }

  if (pathname === '/api/journeys/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const profile = s.profiles[me]
    if (!isJsonBody(init.body)) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    }
    const body = JSON.parse(init.body) as Partial<MockJourney>
    const id = s.nextJourneyId++
    const startsOn = body.starts_on || ''
    const j: MockJourney = {
      id,
      author: {
        username: me,
        display_name: profile?.display_name?.trim() || me,
        avatar: profile?.avatar ?? null,
      },
      title: (body.title || '').trim() || 'Untitled journey',
      summary: (body.summary || '').trim(),
      cover_image: body.cover_image?.trim() || null,
      starts_on: startsOn,
      starts_at: startsOn,
      ends_on: body.ends_on || '',
      countries: body.countries || [],
      transport_modes: body.transport_modes || [],
      party: body.party || 'solo',
      tags: body.tags || [],
      total_cost: Number(body.total_cost) || 0,
      currency: body.currency || 'NAD',
      days: Number(body.days) || 0,
      stops: body.stops || [],
      costs: body.costs || [],
      journey_stories: body.journey_stories || [],
      gallery_images: body.gallery_images || [],
      likes_count: 0,
      saves_count: 0,
      comments_count: 0,
      liked_by_me: false,
      saved_by_me: false,
      visibility: 'public',
    }
    s.journeys.push(j)
    saveState(s)
    return mockSerializeJourney(s, j)
  }

  const journeyLikeMatch = pathname.match(/^\/api\/journeys\/(\d+)\/like\/?$/)
  if (journeyLikeMatch && method === 'POST') {
    requireAuth(s)
    const id = Number(journeyLikeMatch[1])
    const j = s.journeys.find((row) => row.id === id)
    if (!j) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const me = s.currentUser as string
    const likedBy = s.journeyLikes[id] ?? []
    const idx = likedBy.indexOf(me)
    if (idx >= 0) {
      likedBy.splice(idx, 1)
      s.journeyLikes[id] = likedBy
    } else {
      s.journeyLikes[id] = [...likedBy, me]
    }
    saveState(s)
    return { liked: idx < 0, likes_count: (s.journeyLikes[id] ?? []).length }
  }

  const journeySaveMatch = pathname.match(/^\/api\/journeys\/(\d+)\/save\/?$/)
  if (journeySaveMatch && method === 'POST') {
    requireAuth(s)
    const id = Number(journeySaveMatch[1])
    const j = s.journeys.find((row) => row.id === id)
    if (!j) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const me = s.currentUser as string
    const savedBy = s.journeySaves[id] ?? []
    const idx = savedBy.indexOf(me)
    if (idx >= 0) {
      savedBy.splice(idx, 1)
      s.journeySaves[id] = savedBy
    } else {
      s.journeySaves[id] = [...savedBy, me]
    }
    saveState(s)
    return { saved: idx < 0, saves_count: (s.journeySaves[id] ?? []).length }
  }

  const journeySimilarMatch = pathname.match(/^\/api\/journeys\/(\d+)\/similar\/?$/)
  if (journeySimilarMatch && method === 'GET') {
    const id = Number(journeySimilarMatch[1])
    const j = s.journeys.find((row) => row.id === id)
    if (!j) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const countries = new Set(j.countries || [])
    const tags = new Set(j.tags || [])
    const rows = mockVisibleJourneys(s)
      .filter((row) => row.id !== id)
      .filter(
        (row) =>
          (row.countries || []).some((c) => countries.has(c)) ||
          (row.tags || []).some((t) => tags.has(t)),
      )
      .slice(0, 3)
    return rows.map((row) => mockSerializeJourney(s, row))
  }

  const journeyQuestionsMatch = pathname.match(/^\/api\/journeys\/(\d+)\/questions\/?$/)
  if (journeyQuestionsMatch) {
    const journeyId = Number(journeyQuestionsMatch[1])
    const journey = s.journeys.find((row) => row.id === journeyId)
    if (!journey || journey.is_hidden) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (method === 'GET') {
      return mockJourneyQuestionsFor(s, journeyId)
    }
    if (method === 'POST') {
      requireAuth(s)
      const me = s.currentUser as string
      const profile = s.profiles[me]
      if (!isJsonBody(init.body)) {
        throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
      }
      const body = JSON.parse(init.body) as { body?: string }
      const row: MockJourneyQuestionRow = {
        id: s.nextJourneyQuestionId++,
        journey_id: journeyId,
        author: profile?.display_name?.trim() || me,
        body: (body.body || '').trim(),
        created_at: new Date().toISOString(),
        answers: [],
      }
      s.journeyQuestions.push(row)
      journey.comments_count = s.journeyQuestions.filter(
        (q) => q.journey_id === journeyId && !q.is_hidden,
      ).length
      saveState(s)
      return mockJourneyQuestionsFor(s, journeyId).find((q) => q.id === row.id)
    }
  }

  const journeyAnswerMatch = pathname.match(/^\/api\/journeys\/questions\/(\d+)\/answers\/?$/)
  if (journeyAnswerMatch && method === 'POST') {
    requireAuth(s)
    const questionId = Number(journeyAnswerMatch[1])
    const question = s.journeyQuestions.find((q) => q.id === questionId && !q.is_hidden)
    if (!question) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const journey = s.journeys.find((row) => row.id === question.journey_id)
    if (!journey || journey.is_hidden) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const me = s.currentUser as string
    const profile = s.profiles[me]
    if (!isJsonBody(init.body)) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    }
    const body = JSON.parse(init.body) as { body?: string }
    const answer = {
      id: s.nextJourneyAnswerId++,
      author: profile?.display_name?.trim() || me,
      body: (body.body || '').trim(),
      is_official: me === journey.author.username,
      created_at: new Date().toISOString(),
    }
    question.answers.push(answer)
    saveState(s)
    return {
      id: answer.id,
      author: answer.author,
      body: answer.body,
      is_official: answer.is_official,
      ago: 'Just now',
      created_at: answer.created_at,
    }
  }

  if (pathname === '/api/accounts/me/journey-questions/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const rows: ReturnType<typeof mockJourneyQuestionsFor> = []
    for (const journey of s.journeys.filter((j) => j.author.username === me)) {
      rows.push(...mockJourneyQuestionsFor(s, journey.id))
    }
    return rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  }

  // ---- Events ----
  if (pathname === '/api/events/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const category = (q.get('category') || '').trim()
    const organizer = (q.get('organizer') || '').trim()
    const mine = (q.get('mine') || '').trim().toLowerCase()
    let rows = mockEvents
    if (mine === '1' || mine === 'true' || mine === 'yes') {
      requireAuth(s)
      rows = rows.filter((e) => e.organizer_username === s.currentUser)
    } else if (organizer) {
      rows = rows.filter((e) => textMatch(e.organizer_username, organizer))
    }
    return rows
      .filter((e) => (region ? textMatch(e.region, region) || textMatch(e.city, region) : true))
      .filter((e) => (category ? e.category === category : true))
  }
  if (pathname === '/api/events/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const profile = s.profiles[me]
    const fd = init.body instanceof FormData ? init.body : null
    const get = (key: string) => (fd ? String(fd.get(key) || '').trim() : '')
    const nextId = mockEvents.reduce((max, e) => Math.max(max, e.id), 0) + 1
    const isFree = get('is_free') === 'true'
    const capRaw = get('capacity')
    const capNum = capRaw ? Number.parseInt(capRaw, 10) : NaN
    const created = {
      id: nextId,
      title: get('title'),
      description: get('description'),
      category: get('category') || 'other',
      starts_at: get('starts_at') || new Date().toISOString(),
      ends_at: get('ends_at') || null,
      venue: get('venue'),
      region: get('region'),
      city: get('city'),
      cover_image: null as string | null,
      gallery_images: [] as string[],
      organizer_username: me,
      organizer_display_name: profile?.display_name || me,
      is_free: isFree,
      price: isFree ? undefined : get('price') || undefined,
      ticket_url: get('ticket_url') || undefined,
      capacity: Number.isFinite(capNum) && capNum > 0 ? capNum : undefined,
      is_published: true,
    }
    if (fd?.has('gallery_images')) {
      const raw = get('gallery_images')
      try {
        created.gallery_images = raw ? JSON.parse(raw) : []
      } catch {
        created.gallery_images = []
      }
    }
    const coverFile = fd?.get('cover_image')
    if (coverFile instanceof File) {
      const buf = await coverFile.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      created.cover_image = `data:${coverFile.type || 'image/jpeg'};base64,${b64}`
    }
    mockEvents.push(created as (typeof mockEvents)[0])
    return { id: created.id }
  }
  const eventMatch = pathname.match(/^\/api\/events\/(\d+)\/$/)
  if (eventMatch && method === 'GET') {
    const id = Number(eventMatch[1])
    return mockEvents.find((e) => e.id === id) || { detail: 'Not found' }
  }
  if (eventMatch && (method === 'PATCH' || method === 'PUT')) {
    requireAuth(s)
    const id = Number(eventMatch[1])
    const ev = mockEvents.find((e) => e.id === id)
    if (!ev) return { detail: 'Not found' }
    const me = s.currentUser as string
    if (ev.organizer_username !== me) throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const fd = init.body instanceof FormData ? init.body : null
    const get = (key: string) => (fd ? String(fd.get(key) || '').trim() : '')
    if (get('title')) ev.title = get('title')
    if (fd?.has('description')) ev.description = get('description')
    if (get('category')) ev.category = get('category')
    if (get('starts_at')) ev.starts_at = get('starts_at')
    if (fd?.has('ends_at')) ev.ends_at = get('ends_at') || null
    if (fd?.has('venue')) ev.venue = get('venue')
    if (fd?.has('city')) ev.city = get('city')
    if (fd?.has('region')) ev.region = get('region')
    if (fd?.has('is_free')) {
      ev.is_free = get('is_free') === 'true'
      if (ev.is_free) ev.price = undefined
    }
    if (fd?.has('price') && !ev.is_free) ev.price = get('price') || undefined
    if (fd?.has('ticket_url')) ev.ticket_url = get('ticket_url') || undefined
    if (fd?.has('capacity')) {
      const capNum = Number.parseInt(get('capacity'), 10)
      ev.capacity = Number.isFinite(capNum) && capNum > 0 ? capNum : undefined
    }
    if (fd?.has('event_stories')) {
      const raw = get('event_stories')
      try {
        ;(ev as { event_stories?: unknown }).event_stories = raw ? JSON.parse(raw) : []
      } catch {
        /* keep existing */
      }
    }
    if (fd?.has('gallery_images')) {
      const raw = get('gallery_images')
      try {
        ;(ev as { gallery_images?: string[] }).gallery_images = raw ? JSON.parse(raw) : []
      } catch {
        /* keep existing */
      }
    }
    const coverFile = fd?.get('cover_image')
    if (coverFile instanceof File) {
      const buf = await coverFile.arrayBuffer()
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
      ev.cover_image = `data:${coverFile.type || 'image/jpeg'};base64,${b64}`
    }
    return { ...ev }
  }

  const eventSubMatch = pathname.match(/^\/api\/events\/(\d+)\/([^/]+)\/?$/)
  if (eventSubMatch) {
    const id = Number(eventSubMatch[1])
    const action = eventSubMatch[2]
    const ev = mockEvents.find((e) => e.id === id)
    if (!ev && action !== 'questions' && action !== 'moments' && action !== 'reviews') {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (action === 'questions' && method === 'GET') return []
    if (action === 'questions' && method === 'POST') {
      requireAuth(s)
      if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
      const body = JSON.parse(init.body) as { body?: string }
      return {
        id: Date.now(),
        author: s.profiles[s.currentUser as string]?.display_name || s.currentUser,
        body: body.body || '',
        ago: 'Just now',
        answers: [],
      }
    }
    if (action === 'moments' && method === 'GET') {
      return visiblePosts(s.posts)
        .filter((p) => p.is_delvers && !p.is_accommodation_story && p.event?.id === id)
        .slice(0, 24)
        .map((p) => ({
          id: p.id,
          body: p.body,
          image: p.image,
          video: p.video,
          author: { username: p.author.username, display_name: p.author.display_name },
          event: p.event,
        }))
    }
    if (action === 'reviews' && method === 'GET') {
      return { reviews: [], rating_avg: 0, rating_count: 0 }
    }
    if (action === 'like' && method === 'POST') {
      requireAuth(s)
      return { liked: true, likes_count: 1 }
    }
    if (action === 'save' && method === 'POST') {
      requireAuth(s)
      return { saved: true, saves_count: 1 }
    }
    if (action === 'rsvp' && method === 'POST') {
      requireAuth(s)
      return {
        id: Date.now(),
        event: id,
        tickets: 1,
        status: ev?.is_free ? 'confirmed' : 'pending',
        total_price: ev?.is_free ? null : ev?.price ? String(Number(ev.price) * 1) : null,
        booking_ref: `EVT-MOCK${id}`,
      }
    }
    if (action === 'track_ticket_click' && method === 'POST') {
      return { clicks: 1 }
    }
    if (action === 'ticket_redirect' && method === 'GET') {
      return { detail: 'Redirect handled by real API in production.' }
    }
  }

  if (pathname === '/api/events/provider-bookings/' && method === 'GET') {
    requireAuth(s)
    return []
  }

  const providerBookingAction = pathname.match(/^\/api\/events\/provider-bookings\/(\d+)\/(confirm|check_in|cancel|refund)\/?$/)
  if (providerBookingAction && method === 'POST') {
    requireAuth(s)
    const action = providerBookingAction[2]
    return { id: Number(providerBookingAction[1]), status: action === 'check_in' ? 'checked_in' : action === 'confirm' ? 'confirmed' : action }
  }

  if (pathname === '/api/events/bookings/' && method === 'GET') {
    requireAuth(s)
    return []
  }

  if (pathname === '/api/events/templates/' && method === 'GET') {
    requireAuth(s)
    return []
  }

  if (pathname === '/api/events/templates/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const body = JSON.parse(init.body) as { title?: string }
    return { id: Date.now(), title: body.title || 'Template', spawned_count: 0, is_active: true }
  }

  if (pathname === '/api/events/provider_analytics/' && method === 'GET') {
    requireAuth(s)
    return {
      days: 30,
      on_platform_revenue: 0,
      external_ticket_clicks: 0,
      total_bookings: 0,
      confirmed_bookings: 0,
      pending_payment: 0,
      events: [],
    }
  }

  // ---- Food ----
  const foodSaveMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/save\/$/)
  if (foodSaveMatch && method === 'POST') {
    requireAuth(s)
    const vid = Number(foodSaveMatch[1])
    if (!mockFood.some((x) => x.id === vid)) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const me = s.currentUser as string
    let savers = mockFoodVenueSaves.get(vid)
    if (!savers) {
      savers = new Set<string>()
      mockFoodVenueSaves.set(vid, savers)
    }
    if (savers.has(me)) {
      savers.delete(me)
      return { saved: false, saves_count: savers.size }
    }
    savers.add(me)
    return { saved: true, saves_count: savers.size }
  }

  if (pathname === '/api/food/venues/saved/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return mockFood
      .filter((row) => mockFoodVenueSaves.get(row.id)?.has(me))
      .map((row) => enrichFoodVenueRow(s, row))
  }

  if (pathname === '/api/food/provider-analytics/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const owned = mockFood.filter((f) => f.owner_username === me)
    const ownedIds = new Set(owned.map((f) => f.id))
    const rows = [...mockFoodReservationRows.values()].filter((r) => ownedIds.has(r.venue))
    const listingRows = owned.map((f) => {
      const venueReservations = rows.filter((r) => r.venue === f.id)
      const confirmed = venueReservations.filter((r) =>
        ['confirmed', 'checked_in', 'checked_out'].includes(r.status),
      )
      const seated = venueReservations.filter((r) => ['checked_in', 'checked_out'].includes(r.status))
      return {
        id: f.id,
        name: f.name,
        reservations: venueReservations.length,
        confirmed_reservations: confirmed.length,
        seated_visits: seated.length,
        saves_count: mockFoodVenueSaves.get(f.id)?.size ?? 0,
        reviews_count: f.rating_count ?? 0,
        rating_avg: Number(f.rating_avg ?? 0),
      }
    })
    listingRows.sort((a, b) => b.reservations - a.reservations || b.saves_count - a.saves_count)
    return {
      days: 30,
      total_reservations: rows.length,
      confirmed_reservations: rows.filter((r) =>
        ['confirmed', 'checked_in', 'checked_out'].includes(r.status),
      ).length,
      pending_requests: rows.filter((r) => r.status === 'pending').length,
      seated_visits: rows.filter((r) => ['checked_in', 'checked_out'].includes(r.status)).length,
      total_saves: owned.reduce((sum, f) => sum + (mockFoodVenueSaves.get(f.id)?.size ?? 0), 0),
      total_reviews: owned.reduce((sum, f) => sum + (f.rating_count ?? 0), 0),
      promotion_impressions: 0,
      promotion_clicks: 0,
      promotion_listing_opens: 0,
      venues: listingRows.slice(0, 12),
    }
  }

  if (pathname === '/api/food/venues/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const cuisine = (q.get('cuisine') || '').trim()
    const searchQ = (q.get('search') || '').trim()
    return mockFood
      .filter((f) => (region ? textMatch(f.region, region) || textMatch(f.city, region) : true))
      .filter((f) => (cuisine ? textMatch(f.cuisine, cuisine) : true))
      .filter((f) =>
        searchQ
          ? textMatch(f.name, searchQ) ||
            textMatch(f.city, searchQ) ||
            textMatch(f.region, searchQ) ||
            textMatch(f.cuisine, searchQ) ||
            textMatch(f.tagline ?? '', searchQ) ||
            textMatch(f.popular_dish ?? '', searchQ) ||
            textMatch(f.description, searchQ)
          : true,
      )
      .map((row) => enrichFoodVenueRow(s, row))
  }
  const foodMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/$/)
  if (foodMatch && method === 'GET') {
    const id = Number(foodMatch[1])
    const venue = mockFood.find((f) => f.id === id)
    if (!venue) return { detail: 'Not found' }
    const detail = enrichFoodVenueDetail(venue)
    const me = s.currentUser as string | undefined
    const reviewedKey = me ? `${me}:${id}` : ''
    const hasReviewed = reviewedKey ? mockFoodReviewedVenues.has(reviewedKey) : false
    const reservationsEnabled = Boolean((venue as { reservations?: boolean }).reservations)
    const seatedVisit =
      me &&
      [...mockFoodReservationRows.values()].some(
        (r) =>
          r.client === me &&
          r.venue === id &&
          (r.status === 'checked_in' || r.status === 'checked_out'),
      )
    const canReview = Boolean(
      me &&
        !hasReviewed &&
        venue.owner_username !== me &&
        (!reservationsEnabled || seatedVisit),
    )
    const savers = mockFoodVenueSaves.get(id)
    return {
      ...detail,
      has_reviewed: hasReviewed,
      can_review: canReview,
      saves_count: savers?.size ?? 0,
      saved_by_me: Boolean(me && savers?.has(me)),
    }
  }

  const foodReviewsMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/reviews\/$/)
  if (foodReviewsMatch && method === 'GET') {
    const id = Number(foodReviewsMatch[1])
    const venue = mockFood.find((f) => f.id === id)
    if (!venue) return { detail: 'Not found' }
    const seeded = (
      (venue as { guest_reviews?: { name: string; place?: string; rating: number; body: string }[] }).guest_reviews ?? []
    ).map((r, i) => ({
      id: `seed-${i}`,
      source: 'host',
      name: r.name,
      place: r.place || venue.name,
      rating: r.rating,
      body: r.body,
    }))
    const session = mockFoodSessionReviews
      .filter((r) => r.listing === id)
      .map((r, i) => ({
        id: `traveler-${i}`,
        source: 'traveler',
        name: r.name,
        place: [venue.city, venue.region].filter(Boolean).join(', ') || venue.name,
        rating: r.rating,
        body: r.body,
      }))
    const reviews = [...session, ...seeded]
    const rated = reviews.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n))
    const count = rated.length || venue.rating_count || 0
    const avg = rated.length
      ? (rated.reduce((sum, n) => sum + n, 0) / rated.length).toFixed(2)
      : venue.rating_avg ?? null
    return { reviews, rating_avg: avg, rating_count: count }
  }

  const foodReviewPostMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/review\/?$/)
  if (foodReviewPostMatch && method === 'POST') {
    requireAuth(s)
    const prof = s.profiles[s.currentUser as string]
    if (!prof?.email_verified) throw new ApiError('Forbidden', 403, { detail: 'Verify your email to complete this action.' })
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const id = Number(foodReviewPostMatch[1])
    const venue = mockFood.find((f) => f.id === id)
    if (!venue) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const me = s.currentUser as string
    const reviewedKey = `${me}:${id}`
    if (mockFoodReviewedVenues.has(reviewedKey)) {
      throw new ApiError('Already reviewed', 400, { detail: 'You already reviewed this venue.' })
    }
    const reservationsEnabled = Boolean((venue as { reservations?: boolean }).reservations)
    if (reservationsEnabled) {
      const seated = [...mockFoodReservationRows.values()].some(
        (r) =>
          r.client === me &&
          r.venue === id &&
          (r.status === 'checked_in' || r.status === 'checked_out'),
      )
      if (!seated) {
        throw new ApiError('Bad request', 400, {
          detail: 'You can review after your table reservation is marked seated or completed.',
        })
      }
    }
    const body = JSON.parse(init.body) as { rating?: number; body?: string }
    const name = prof?.display_name || me
    const rating = Math.min(5, Math.max(1, Number(body.rating ?? 5) || 5))
    const reviewBody = (body.body || '').trim()
    mockFoodSessionReviews.unshift({
      listing: id,
      name,
      rating,
      body: reviewBody || 'Great visit.',
      created_at: new Date().toISOString(),
    })
    mockFoodReviewedVenues.add(reviewedKey)
    return { id: Date.now(), name, rating, body: reviewBody, source: 'traveler', created_at: new Date().toISOString() }
  }

  const foodMomentsMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/moments\/$/)
  if (foodMomentsMatch && method === 'GET') {
    const id = Number(foodMomentsMatch[1])
    return s.posts.filter(
      (p) => p.is_delvers && !p.is_hidden && p.food_venue?.id === id,
    )
  }

  const foodQuestionsMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/questions\/$/)
  if (foodQuestionsMatch && method === 'GET') {
    const id = Number(foodQuestionsMatch[1])
    return mockFoodQuestions
      .filter((q) => q.listing === id)
      .map(({ listing_title: _lt, ...q }) => q)
  }
  if (foodQuestionsMatch && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const id = Number(foodQuestionsMatch[1])
    const venue = mockFood.find((f) => f.id === id)
    if (!venue) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(init.body) as { body?: string }
    const prof = s.profiles[s.currentUser as string]
    const row: MockFoodQuestionRow = {
      id: mockFoodNextQuestionId++,
      listing: id,
      listing_title: venue.name,
      author: prof?.display_name || (s.currentUser as string),
      body: (body.body || '').trim(),
      ago: 'Just now',
      answers: [],
    }
    mockFoodQuestions.unshift(row)
    const { listing_title: _lt, ...out } = row
    return out
  }

  const foodAnswerMatch = pathname.match(/^\/api\/food\/questions\/(\d+)\/answers\/$/)
  if (foodAnswerMatch && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const qid = Number(foodAnswerMatch[1])
    const question = mockFoodQuestions.find((q) => q.id === qid)
    if (!question) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const venue = mockFood.find((f) => f.id === question.listing)
    const body = JSON.parse(init.body) as { body?: string }
    const prof = s.profiles[s.currentUser as string]
    const me = s.currentUser as string
    const answer = {
      id: mockFoodNextAnswerId++,
      author: prof?.display_name || me,
      body: (body.body || '').trim(),
      ago: 'Just now',
      is_official: Boolean(venue && venue.owner_username === me),
    }
    question.answers.push(answer)
    return answer
  }

  function serializeProviderFoodVenue(row: (typeof mockFood)[number]) {
    return {
      id: row.id,
      owner_username: row.owner_username,
      name: row.name,
      description: row.description ?? '',
      tagline: row.tagline ?? '',
      popular_dish: row.popular_dish ?? '',
      cuisine: row.cuisine,
      region: row.region,
      city: row.city ?? '',
      address: (row as { address?: string }).address ?? '',
      latitude: (row as { latitude?: string | number | null }).latitude ?? null,
      longitude: (row as { longitude?: string | number | null }).longitude ?? null,
      google_place_id: (row as { google_place_id?: string }).google_place_id ?? '',
      formatted_address: (row as { formatted_address?: string }).formatted_address ?? '',
      phone: (row as { phone?: string }).phone ?? '',
      website: (row as { website?: string }).website ?? '',
      opening_hours: (row as { opening_hours?: string }).opening_hours ?? '',
      opening_hours_json: (row as { opening_hours_json?: unknown[] }).opening_hours_json ?? [],
      closes_at: row.closes_at ?? '',
      price_level: row.price_level,
      dine_in: (row as { dine_in?: boolean }).dine_in !== false,
      takeaway: Boolean((row as { takeaway?: boolean }).takeaway),
      delivery: Boolean((row as { delivery?: boolean }).delivery),
      reservations: Boolean((row as { reservations?: boolean }).reservations),
      is_open: row.is_open ?? null,
      amenities: (row as { amenities?: string[] }).amenities ?? [],
      photos: (row as { photos?: unknown[] }).photos ?? [],
      venue_stories: row.venue_stories ?? [],
      cover_image: row.cover_image,
      rating_avg: row.rating_avg,
      rating_count: row.rating_count,
      is_active: (row as { is_active?: boolean }).is_active === true,
      created_at: new Date().toISOString(),
    }
  }

  if (pathname === '/api/food/provider-venues/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return mockFood.filter((f) => f.owner_username === me).map(serializeProviderFoodVenue)
  }

  async function parseProviderFoodVenueBody(body: BodyInit | null | undefined) {
    if (body instanceof FormData) {
      const get = (key: string) => String(body.get(key) ?? '').trim()
      const parseJsonField = (key: string) => {
        const raw = get(key)
        if (!raw) return undefined
        try {
          return JSON.parse(raw) as unknown
        } catch {
          return undefined
        }
      }
      let coverUrl = get('cover_image_url')
      const coverFile = body.get('cover_image')
      if (coverFile instanceof File) {
        const buf = await coverFile.arrayBuffer()
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
        coverUrl = `data:${coverFile.type || 'image/jpeg'};base64,${b64}`
      }
      const photosRaw = parseJsonField('photos')
      const photos = Array.isArray(photosRaw) ? [...photosRaw] : []
      const galleryFiles = body.getAll('gallery_images').filter((v): v is File => v instanceof File)
      for (const file of galleryFiles) {
        const buf = await file.arrayBuffer()
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
        photos.push({
          id: Date.now() + photos.length,
          image: `data:${file.type || 'image/jpeg'};base64,${b64}`,
          caption: '',
          category: 'food',
          is_cover: false,
        })
      }
      const isOpenRaw = get('is_open')
      const is_open =
        isOpenRaw === '' ? null : isOpenRaw === 'true' ? true : isOpenRaw === 'false' ? false : null
      return {
        name: get('name'),
        description: get('description'),
        tagline: get('tagline'),
        popular_dish: get('popular_dish'),
        cuisine: get('cuisine'),
        region: get('region'),
        city: get('city'),
        address: get('address'),
        phone: get('phone'),
        website: get('website'),
        opening_hours: get('opening_hours'),
        opening_hours_json: parseJsonField('opening_hours_json'),
        closes_at: get('closes_at'),
        price_level: Number.parseInt(get('price_level') || '2', 10) || 2,
        dine_in: get('dine_in') !== 'false',
        takeaway: get('takeaway') === 'true',
        delivery: get('delivery') === 'true',
        reservations: get('reservations') === 'true',
        is_open,
        is_active: get('is_active') === 'true',
        amenities: parseJsonField('amenities') ?? [],
        photos,
        venue_stories: parseJsonField('venue_stories') ?? [],
        cover_image_url: coverUrl,
      }
    }
    if (isJsonBody(body)) return JSON.parse(body) as Record<string, unknown>
    return {}
  }

  if (pathname === '/api/food/provider-venues/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const data = await parseProviderFoodVenueBody(init.body)
    const id = Math.max(0, ...mockFood.map((f) => f.id)) + 1
    const coverUrl = String(data.cover_image_url || data.cover_image || '').trim()
    const photos = Array.isArray(data.photos) ? data.photos : []
    if (coverUrl) {
      photos.unshift({
        id: id * 100 + 1,
        image: coverUrl,
        caption: `${data.name || 'Venue'} cover`,
        category: 'food',
        is_cover: true,
      })
    }
    const row = {
      id,
      owner_username: me,
      name: data.name || 'New venue',
      description: data.description ?? '',
      tagline: data.tagline ?? '',
      popular_dish: data.popular_dish ?? '',
      cuisine: data.cuisine ?? 'other',
      region: data.region ?? '',
      city: data.city ?? '',
      address: data.address ?? '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      google_place_id: data.google_place_id ?? '',
      formatted_address: data.formatted_address ?? '',
      phone: data.phone ?? '',
      website: data.website ?? '',
      opening_hours: data.opening_hours ?? '',
      opening_hours_json: Array.isArray(data.opening_hours_json) ? data.opening_hours_json : [],
      closes_at: data.closes_at ?? '',
      price_level: data.price_level ?? 2,
      dine_in: data.dine_in !== false,
      takeaway: Boolean(data.takeaway),
      delivery: Boolean(data.delivery),
      reservations: Boolean(data.reservations),
      is_open: data.is_open ?? null,
      amenities: data.amenities ?? [],
      photos,
      venue_stories: data.venue_stories ?? [],
      cover_image: coverUrl || null,
      rating_avg: '0',
      rating_count: 0,
      is_active: data.is_active === true,
    }
    mockFood.push(row as (typeof mockFood)[0])
    return serializeProviderFoodVenue(row as (typeof mockFood)[0])
  }

  const providerFoodMatch = pathname.match(/^\/api\/food\/provider-venues\/(\d+)\/?$/)
  if (providerFoodMatch && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const venue = mockFood.find((f) => f.id === Number(providerFoodMatch[1]) && f.owner_username === me)
    if (!venue) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return serializeProviderFoodVenue(venue)
  }

  if (providerFoodMatch && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    const data = await parseProviderFoodVenueBody(init.body)
    const venue = mockFood.find((f) => f.id === Number(providerFoodMatch[1]) && f.owner_username === me)
    if (!venue) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const coverUrl = data.cover_image_url ?? data.cover_image
    if (coverUrl !== undefined) {
      const url = String(coverUrl || '').trim()
      ;(venue as { cover_image?: string | null }).cover_image = url || null
      if (url) {
        const photos = Array.isArray((venue as { photos?: unknown[] }).photos)
          ? [...((venue as { photos?: unknown[] }).photos as unknown[])]
          : []
        const rest = photos.filter((p) => !(p as { is_cover?: boolean }).is_cover)
        ;(venue as { photos?: unknown[] }).photos = [
          { id: venue.id * 100 + 1, image: url, caption: `${venue.name} cover`, category: 'food', is_cover: true },
          ...rest,
        ]
      }
      delete data.cover_image_url
      delete data.cover_image
    }
    if (Array.isArray(data.opening_hours_json)) {
      const schedule = data.opening_hours_json as { day?: string; open?: boolean; opens?: string; closes?: string }[]
      const lines: string[] = []
      for (const entry of schedule) {
        if (entry?.open && entry.day && entry.opens && entry.closes) {
          lines.push(`${String(entry.day).slice(0, 3)} ${entry.opens}–${entry.closes}`)
        }
      }
      ;(venue as { opening_hours_json?: unknown[] }).opening_hours_json = schedule
      ;(venue as { opening_hours?: string }).opening_hours = lines.join('\n')
      delete data.opening_hours_json
    }
    Object.assign(venue, data)
    return serializeProviderFoodVenue(venue)
  }

  function serializeFoodReservation(row: MockFoodReservationRow, s: MockSession) {
    const venue = mockFood.find((f) => f.id === row.venue)
    const ownerProf = venue ? s.profiles[venue.owner_username] : undefined
    return {
      id: row.id,
      venue: row.venue,
      venue_name: venue?.name ?? 'Venue',
      venue_city: venue?.city ?? '',
      venue_region: venue?.region ?? '',
      owner_username: venue?.owner_username ?? '',
      owner_display_name: ownerProf?.display_name ?? venue?.owner_username ?? '',
      reserved_for: row.reserved_for,
      party_size: row.party_size,
      special_requests: row.special_requests,
      status: row.status,
      created_at: new Date().toISOString(),
    }
  }

  function serializeProviderFoodReservation(row: MockFoodReservationRow, s: MockSession) {
    const venue = mockFood.find((f) => f.id === row.venue)
    const guestProf = s.profiles[row.client]
    return {
      id: row.id,
      venue: row.venue,
      venue_name: venue?.name ?? 'Venue',
      guest: 0,
      guest_username: row.client,
      guest_display_name: guestProf?.display_name ?? row.client,
      reserved_for: row.reserved_for,
      party_size: row.party_size,
      special_requests: row.special_requests,
      status: row.status,
      created_at: new Date().toISOString(),
    }
  }

  if (pathname === '/api/food/reservations/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return [...mockFoodReservationRows.values()]
      .filter((r) => r.client === me)
      .map((r) => serializeFoodReservation(r, s))
  }

  if (pathname === '/api/food/reservations/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const prof = s.profiles[s.currentUser as string]
    if (!prof?.email_verified) {
      throw new ApiError('Verify your email before booking.', 403, { detail: 'Email not verified.' })
    }
    const body = JSON.parse(init.body) as {
      venue?: number
      reserved_for?: string
      party_size?: number
      special_requests?: string
    }
    const venue = mockFood.find((f) => f.id === Number(body.venue))
    if (!venue) throw new ApiError('Not found', 404, { detail: 'Venue not found.' })
    if (!(venue as { reservations?: boolean }).reservations) {
      throw new ApiError('Bad request', 400, { detail: 'This venue does not take table reservations on DELVE.' })
    }
    const reservedFor = new Date(String(body.reserved_for || ''))
    if (Number.isNaN(reservedFor.getTime()) || reservedFor <= new Date()) {
      throw new ApiError('Bad request', 400, { detail: 'Choose a date and time in the future.' })
    }
    const me = s.currentUser as string
    const active = [...mockFoodReservationRows.values()].some(
      (r) =>
        r.client === me &&
        r.venue === venue.id &&
        !['cancelled', 'refunded', 'checked_out'].includes(r.status),
    )
    if (active) {
      throw new ApiError('Bad request', 400, { detail: 'You already have an active reservation for this venue.' })
    }
    const row: MockFoodReservationRow = {
      id: nextFoodReservationId++,
      venue: venue.id,
      client: me,
      reserved_for: reservedFor.toISOString(),
      party_size: Math.max(1, Math.min(20, Number(body.party_size) || 2)),
      special_requests: String(body.special_requests || '').trim(),
      status: 'pending',
    }
    mockFoodReservationRows.set(row.id, row)
    return serializeFoodReservation(row, s)
  }

  const foodReservationCancelMatch = pathname.match(/^\/api\/food\/reservations\/(\d+)\/cancel\/?$/)
  if (foodReservationCancelMatch && method === 'POST') {
    requireAuth(s)
    const id = Number(foodReservationCancelMatch[1])
    const row = mockFoodReservationRows.get(id)
    if (!row || row.client !== (s.currentUser as string)) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    if (['cancelled', 'refunded', 'checked_in', 'checked_out'].includes(row.status)) {
      throw new ApiError('Bad request', 400, { detail: 'Reservation cannot be cancelled.' })
    }
    row.status = 'cancelled'
    return serializeFoodReservation(row, s)
  }

  if (pathname === '/api/food/provider-reservations/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const statusQ = (q.get('status') || '').trim()
    const ownedVenueIds = new Set(mockFood.filter((f) => f.owner_username === me).map((f) => f.id))
    return [...mockFoodReservationRows.values()]
      .filter((r) => ownedVenueIds.has(r.venue) && (!statusQ || r.status === statusQ))
      .map((r) => serializeProviderFoodReservation(r, s))
  }

  const providerFoodReservationAction = pathname.match(
    /^\/api\/food\/provider-reservations\/(\d+)\/(confirm|cancel|check_in|check_out|refund)\/?$/,
  )
  if (providerFoodReservationAction && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const id = Number(providerFoodReservationAction[1])
    const action = providerFoodReservationAction[2]
    const row = mockFoodReservationRows.get(id)
    const venue = row ? mockFood.find((f) => f.id === row.venue) : undefined
    if (!row || !venue || venue.owner_username !== me) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const transitions: Record<string, Record<string, string>> = {
      pending: { confirm: 'confirmed', cancel: 'cancelled' },
      confirmed: { check_in: 'checked_in', cancel: 'cancelled', refund: 'refunded' },
      checked_in: { check_out: 'checked_out' },
      cancelled: { refund: 'refunded' },
    }
    const next = transitions[row.status]?.[action]
    if (!next) throw new ApiError('Bad request', 400, { detail: 'Invalid status transition.' })
    row.status = next as MockFoodReservationRow['status']
    return serializeProviderFoodReservation(row, s)
  }

  // ---- Guides ----
  function providerGuideForUser(username: string) {
    return mockGuides.find((g) => g.username === username)
  }

  function serializeProviderGuide(g: (typeof mockGuides)[0]) {
    return {
      id: g.id,
      user: g.user,
      username: g.username,
      display_name: g.display_name ?? null,
      headline: g.headline,
      bio: g.bio,
      languages: g.languages ?? [],
      regions: g.regions ?? [],
      hourly_rate: g.hourly_rate ?? null,
      photo: g.photo ?? null,
      rating_avg: g.rating_avg ?? '0',
      rating_count: g.rating_count ?? 0,
      guest_reviews: g.guest_reviews ?? [],
      response_hours_typical: g.response_hours_typical,
      tour_packages: g.tour_packages ?? [],
      years_guiding: g.years_guiding,
      certifications: g.certifications ?? [],
      licensed_guide: g.licensed_guide ?? false,
      languages_detail: g.languages_detail ?? [],
      portfolio_gallery: g.portfolio_gallery ?? [],
      guide_stories: (g as { guide_stories?: unknown[] }).guide_stories ?? [],
      default_meeting_point: g.default_meeting_point ?? '',
      specialities: g.specialities ?? [],
      is_active: (g as { is_active?: boolean }).is_active !== false,
    }
  }

  if (pathname === '/api/guides/provider-profile/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const guide = providerGuideForUser(me)
    if (!guide) return null
    return serializeProviderGuide(guide)
  }

  async function fileToDataUrl(file: File) {
    const buf = await file.arrayBuffer()
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    return `data:${file.type || 'image/jpeg'};base64,${b64}`
  }

  async function parseProviderGuideBody(body: BodyInit | null | undefined) {
    if (body instanceof FormData) {
      const get = (key: string) => String(body.get(key) ?? '').trim()
      const parseJsonField = (key: string) => {
        const raw = get(key)
        if (!raw) return undefined
        try {
          return JSON.parse(raw) as unknown
        } catch {
          return undefined
        }
      }
      let photoUrl = get('photo_url')
      const photoFile = body.get('photo')
      if (photoFile instanceof File) {
        photoUrl = await fileToDataUrl(photoFile)
      }
      const portfolio = Array.isArray(parseJsonField('portfolio_gallery'))
        ? [...(parseJsonField('portfolio_gallery') as { src: string; caption?: string }[])]
        : []
      for (const file of body.getAll('portfolio_images').filter((v): v is File => v instanceof File)) {
        portfolio.push({ src: await fileToDataUrl(file), caption: '' })
      }
      let tourPackages = Array.isArray(parseJsonField('tour_packages'))
        ? [...(parseJsonField('tour_packages') as Record<string, unknown>[])]
        : []
      const packageId = get('package_id')
      const packagePhoto = body.get('package_photo')
      const packageGallery = body.getAll('package_gallery_images').filter((v): v is File => v instanceof File)
      if (packageId && (packagePhoto instanceof File || packageGallery.length)) {
        for (let i = 0; i < tourPackages.length; i++) {
          if (String(tourPackages[i].id) !== packageId) continue
          const next = { ...tourPackages[i] }
          if (packagePhoto instanceof File) {
            next.photo = await fileToDataUrl(packagePhoto)
          }
          const photos = Array.isArray(next.photos) ? [...(next.photos as string[])] : []
          for (const file of packageGallery) {
            photos.push(await fileToDataUrl(file))
          }
          next.photos = photos
          tourPackages[i] = next
        }
      }
      return {
        headline: get('headline'),
        bio: get('bio'),
        hourly_rate: get('hourly_rate') || null,
        default_meeting_point: get('default_meeting_point'),
        years_guiding: Number.parseInt(get('years_guiding') || '0', 10) || 0,
        response_hours_typical: Number.parseInt(get('response_hours_typical') || '4', 10) || 4,
        licensed_guide: get('licensed_guide') === 'true',
        is_active: get('is_active') !== 'false',
        specialities: parseJsonField('specialities') ?? [],
        regions: parseJsonField('regions') ?? [],
        languages: parseJsonField('languages') ?? [],
        certifications: parseJsonField('certifications') ?? [],
        languages_detail: parseJsonField('languages_detail') ?? [],
        portfolio_gallery: portfolio,
        guide_stories: parseJsonField('guide_stories') ?? [],
        tour_packages: tourPackages,
        photo_url: photoUrl,
      }
    }
    if (isJsonBody(body)) return JSON.parse(body) as Record<string, unknown>
    return {}
  }

  if (pathname === '/api/guides/provider-profile/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    if (providerGuideForUser(me)) {
      throw new ApiError('Bad request', 400, { detail: 'Guide profile already exists.' })
    }
    const data = await parseProviderGuideBody(init.body)
    const photoUrl = String(data.photo_url ?? data.photo ?? '').trim()
    const id = Math.max(0, ...mockGuides.map((g) => g.id)) + 1
    const row = {
      id,
      user: messagingNumericIdForUsername(me),
      username: me,
      display_name: prof.display_name ?? me,
      rating_avg: '0',
      rating_count: 0,
      guest_reviews: [],
      ...data,
      photo: photoUrl || null,
      tour_packages: data.tour_packages ?? [],
      is_active: data.is_active !== false,
    }
    delete (row as { photo_url?: string }).photo_url
    mockGuides.push(row as (typeof mockGuides)[0])
    return serializeProviderGuide(row as (typeof mockGuides)[0])
  }

  if (pathname === '/api/guides/provider-profile/' && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    const guide = providerGuideForUser(me)
    if (!guide) throw new ApiError('Not found', 404, { detail: 'Guide profile not found.' })
    const data = await parseProviderGuideBody(init.body)
    if (data.photo_url !== undefined || data.photo !== undefined) {
      const photoUrl = String(data.photo_url ?? data.photo ?? '').trim()
      ;(guide as { photo?: string | null }).photo = photoUrl || null
      delete data.photo_url
      delete data.photo
    }
    Object.assign(guide, data)
    return serializeProviderGuide(guide)
  }

  if (pathname === '/api/guides/provider-bookings/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const guide = providerGuideForUser(me)
    if (!guide) return []
    const status = (q.get('status') || '').trim()
    const staticRows = [
      {
        id: 9001,
        package_title: 'Dunes & deadvlei half-day',
        guest_display_name: 'Sarah M.',
        guest_username: 'demo_user',
        date: '2026-05-12',
        guests: 2,
        duration_hours: 4,
        total_price: '3600.00',
        status: 'confirmed',
      },
      {
        id: 9002,
        package_title: 'Full Namib loop & picnic',
        guest_display_name: 'Jonas K.',
        guest_username: 'anna',
        date: '2026-05-18',
        guests: 4,
        duration_hours: 8,
        total_price: '12800.00',
        status: 'pending',
      },
      {
        id: 9003,
        package_title: 'Dunes & deadvlei half-day',
        guest_display_name: 'Marta V.',
        guest_username: 'demo_user',
        date: '2026-06-02',
        guests: 3,
        duration_hours: 4,
        total_price: '5400.00',
        status: 'confirmed',
      },
    ]
    const sessionRows = [...mockGuideBookings.values()]
      .filter((row) => row.guide === guide.id)
      .map((row) => {
        const pkg = (guide.tour_packages ?? []).find((p) => String(p.id) === String(row.package_id))
        const clientKey = String(row.client ?? '')
        const clientProf = s.profiles[clientKey]
        return {
          id: row.id,
          package_title: pkg?.title ?? (row.package_id ? String(row.package_id) : 'Custom tour'),
          guest_display_name: clientProf?.display_name ?? (clientKey || 'Guest'),
          guest_username: clientKey,
          date: String(row.date ?? ''),
          guests: Number(row.group_size ?? 1),
          duration_hours: Number(row.duration_hours ?? 4),
          total_price: String(row.total_price ?? '0'),
          status: String(row.status ?? 'pending'),
        }
      })
    const all = guide.username === 'guide_pro' ? [...staticRows, ...sessionRows] : sessionRows
    return all.filter((b) => !status || b.status === status)
  }

  const providerGuideBookingActionMatch = pathname.match(
    /^\/api\/guides\/provider-bookings\/(\d+)\/(confirm|cancel|complete|refund)\/?$/,
  )
  if (providerGuideBookingActionMatch && method === 'POST') {
    requireAuth(s)
    const bid = Number(providerGuideBookingActionMatch[1])
    const action = providerGuideBookingActionMatch[2]
    const statusMap: Record<string, string> = {
      confirm: 'confirmed',
      cancel: 'cancelled',
      complete: 'completed',
      refund: 'refunded',
    }
    const session = mockGuideBookings.get(bid)
    if (session) {
      session.status = statusMap[action] ?? session.status
      mockGuideBookings.set(bid, session)
    }
    return {
      id: bid,
      package_title: 'Dunes & deadvlei half-day',
      guest_display_name: 'Sarah M.',
      guest_username: 'demo_user',
      date: '2026-05-12',
      guests: 2,
      duration_hours: 4,
      total_price: '3600.00',
      status: statusMap[action] ?? 'confirmed',
    }
  }

  if (pathname === '/api/guides/provider-analytics/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const guide = providerGuideForUser(me)
    if (!guide) {
      return {
        days: 30,
        total_bookings: 0,
        confirmed_bookings: 0,
        completed_tours: 0,
        pending_requests: 0,
        revenue: '0',
        total_saves: 0,
        rating_avg: 0,
        rating_count: 0,
        promotion_impressions: 0,
        promotion_clicks: 0,
        promotion_listing_opens: 0,
        profiles: [],
      }
    }
    const sessionRows = [...mockGuideBookings.values()].filter((row) => row.guide === guide.id)
    const active = sessionRows.filter((r) => !['cancelled', 'refunded'].includes(String(r.status)))
    const revenueRows = active.filter((r) => ['confirmed', 'completed'].includes(String(r.status)))
    const revenue = revenueRows.reduce((sum, r) => sum + Number(r.total_price || 0), 0)
    const saves = mockGuideSaves.get(guide.id)?.size ?? 0
    return {
      days: 30,
      total_bookings: active.length,
      confirmed_bookings: revenueRows.length,
      completed_tours: active.filter((r) => r.status === 'completed').length,
      pending_requests: active.filter((r) => r.status === 'pending').length,
      revenue: revenue.toFixed(2),
      total_saves: saves,
      rating_avg: Number(guide.rating_avg ?? 0),
      rating_count: Number(guide.rating_count ?? 0),
      promotion_impressions: 0,
      promotion_clicks: 0,
      promotion_listing_opens: 0,
      profiles: [
        {
          id: guide.id,
          headline: guide.headline,
          bookings: active.length,
          confirmed_bookings: revenueRows.length,
          completed_tours: active.filter((r) => r.status === 'completed').length,
          saves_count: saves,
          revenue: revenue.toFixed(2),
          rating_avg: Number(guide.rating_avg ?? 0),
          rating_count: Number(guide.rating_count ?? 0),
          packages_count: (guide.tour_packages ?? []).length,
          is_active: (guide as { is_active?: boolean }).is_active !== false,
        },
      ],
    }
  }

  if (pathname === '/api/guides/profiles/saved/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    return mockGuides
      .filter((row) => mockGuideSaves.get(row.id)?.has(me))
      .map((row) => enrichGuideRow(s, row))
  }

  if (pathname === '/api/guides/profiles/' && method === 'GET') {
    const langQ = (q.get('language') || '').trim()
    const regionQ = (q.get('region') || '').trim()
    const searchQ = (q.get('search') || '').trim()
    let list = [...mockGuides]
    if (langQ) {
      list = list.filter((g) => (g.languages || []).some((l) => textMatch(l, langQ)))
    }
    if (regionQ) {
      list = list.filter((g) => (g.regions || []).some((r) => textMatch(r, regionQ)))
    }
    if (searchQ) {
      list = list.filter(
        (g) =>
          textMatch(g.headline, searchQ) ||
          textMatch(g.bio, searchQ) ||
          textMatch(g.username, searchQ) ||
          (g.languages || []).some((l) => textMatch(l, searchQ)) ||
          (g.regions || []).some((r) => textMatch(r, searchQ)),
      )
    }
    return list.map((row) => enrichGuideRow(s, row))
  }
  const guideMatch = pathname.match(/^\/api\/guides\/profiles\/(\d+)\/$/)
  if (guideMatch && method === 'GET') {
    const id = Number(guideMatch[1])
    const guide = mockGuides.find((g) => g.id === id)
    if (!guide) return { detail: 'Not found' }
    return enrichGuideRow(s, guide)
  }

  const guideSaveMatch = pathname.match(/^\/api\/guides\/profiles\/(\d+)\/save\/$/)
  if (guideSaveMatch && method === 'POST') {
    requireAuth(s)
    const gid = Number(guideSaveMatch[1])
    if (!mockGuides.some((x) => x.id === gid)) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    const me = s.currentUser as string
    let savers = mockGuideSaves.get(gid)
    if (!savers) {
      savers = new Set<string>()
      mockGuideSaves.set(gid, savers)
    }
    if (savers.has(me)) {
      savers.delete(me)
      return { saved: false, saves_count: savers.size }
    }
    savers.add(me)
    return { saved: true, saves_count: savers.size }
  }

  const guideQuestionsMatch = pathname.match(/^\/api\/guides\/profiles\/(\d+)\/questions\/?$/)
  if (guideQuestionsMatch && method === 'GET') {
    const gid = Number(guideQuestionsMatch[1])
    return mockGuideQuestions.get(gid) ?? []
  }
  if (guideQuestionsMatch && method === 'POST') {
    requireAuth(s)
    const gid = Number(guideQuestionsMatch[1])
    const guide = mockGuides.find((g) => g.id === gid)
    if (!guide) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const body = JSON.parse(init.body) as { body?: string }
    const me = s.currentUser as string
    const prof = s.profiles[me]
    const row = {
      id: mockGuideQuestionNextId++,
      author: prof?.display_name || me,
      body: (body.body || '').trim(),
      ago: 'Just now',
      answers: [] as { id: number; author: string; body: string; ago: string; is_official?: boolean }[],
      listing: gid,
      listing_title: guide.headline,
    }
    const rows = mockGuideQuestions.get(gid) ?? []
    rows.unshift(row)
    mockGuideQuestions.set(gid, rows)
    return row
  }

  const guideReviewsMatch = pathname.match(/^\/api\/guides\/profiles\/(\d+)\/reviews\/?$/)
  if (guideReviewsMatch && method === 'GET') {
    const gid = Number(guideReviewsMatch[1])
    const guide = mockGuides.find((g) => g.id === gid)
    const traveler = mockGuideReviews.get(gid) ?? []
    const seeded = (guide?.guest_reviews ?? []).map((r, i) => ({
      id: `seed-${i}`,
      source: 'host',
      name: r.name,
      place: r.place,
      rating: r.rating,
      body: r.body,
    }))
    const reviews = [...traveler, ...seeded]
    const rated = reviews.map((r) => Number(r.rating)).filter((n) => Number.isFinite(n))
    return {
      reviews,
      rating_avg: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : Number(guide?.rating_avg ?? 0),
      rating_count: rated.length || Number(guide?.rating_count ?? 0),
    }
  }

  const guideReviewPostMatch = pathname.match(/^\/api\/guides\/profiles\/(\d+)\/review\/?$/)
  if (guideReviewPostMatch && method === 'POST') {
    requireAuth(s)
    const gid = Number(guideReviewPostMatch[1])
    const guide = mockGuides.find((g) => g.id === gid)
    if (!guide) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const body = JSON.parse(init.body) as { rating?: number; body?: string }
    const me = s.currentUser as string
    const prof = s.profiles[me]
    const completed = [...mockGuideBookings.values()].some(
      (b) => b.guide === gid && b.client === me && b.status === 'completed',
    )
    if (!completed) {
      throw new ApiError('Bad request', 400, {
        detail: 'You can review after a completed tour booking with this guide.',
      })
    }
    const rows = mockGuideReviews.get(gid) ?? []
    if (rows.some((r) => r.name === (prof?.display_name || me))) {
      throw new ApiError('Bad request', 400, { detail: 'You already reviewed this guide.' })
    }
    const review = {
      id: mockGuideReviewNextId++,
      name: prof?.display_name || me,
      place: (guide.regions ?? []).slice(0, 2).join(', ') || guide.headline,
      rating: Number(body.rating ?? 5),
      body: (body.body || '').trim(),
      source: 'traveler',
    }
    rows.unshift(review)
    mockGuideReviews.set(gid, rows)
    return review
  }

  const guideAnswerMatch = pathname.match(/^\/api\/guides\/questions\/(\d+)\/answers\/?$/)
  if (guideAnswerMatch && method === 'POST') {
    requireAuth(s)
    const qid = Number(guideAnswerMatch[1])
    if (!isJsonBody(init.body)) throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const body = JSON.parse(init.body) as { body?: string }
    const me = s.currentUser as string
    const prof = s.profiles[me]
    for (const [gid, rows] of mockGuideQuestions.entries()) {
      const question = rows.find((q) => q.id === qid)
      if (!question) continue
      const guide = mockGuides.find((g) => g.id === gid)
      const answer = {
        id: Date.now(),
        author: prof?.display_name || me,
        body: (body.body || '').trim(),
        ago: 'Just now',
        is_official: guide?.username === me,
      }
      question.answers.push(answer)
      return answer
    }
    throw new ApiError('Not found', 404, { detail: 'Not found.' })
  }

  if (pathname === '/api/guides/bookings/' && method === 'POST') {
    requireAuth(s)
    const prof = s.currentUser ? s.profiles[s.currentUser] : undefined
    if (!prof?.email_verified) {
      throw new ApiError('Verify your email before booking.', 400, { detail: 'Email not verified.' })
    }
    if (!isJsonBody(init.body)) {
      throw new ApiError('Invalid body', 400, null)
    }
    const body = JSON.parse(init.body) as {
      guide?: number
      date?: string
      group_size?: number
      duration_hours?: number
      package_id?: string
      start_time?: string | null
      meeting_point?: string
      notes?: string
    }
    const gid = Number(body.guide)
    const guide = mockGuides.find((x) => x.id === gid)
    if (!guide) {
      throw new ApiError('Not found', 404, { detail: 'Guide not found.' })
    }
    const groupSize = Math.max(1, Number(body.group_size ?? 1))
    let durationHours = Math.max(1, Number(body.duration_hours ?? 4))
    const packageId = (body.package_id || '').trim()
    const pkgs = guide.tour_packages || []
    let matched: (typeof pkgs)[0] | undefined
    if (packageId) {
      matched = pkgs.find((p) => String(p.id) === packageId)
    }
    let total: number
    if (matched) {
      total = Number(matched.price)
      durationHours = Math.max(1, Number(matched.hours))
    } else {
      const rate = Number(guide.hourly_rate || 0)
      total = rate * durationHours * groupSize
    }
    const id = mockGuideBookingNextId++
    const row = {
      id,
      guide: gid,
      guide_headline: guide.headline,
      client: s.currentUser,
      date: body.date || new Date().toISOString().slice(0, 10),
      start_time: body.start_time || null,
      duration_hours: durationHours,
      group_size: groupSize,
      meeting_point: body.meeting_point || '',
      package_id: packageId,
      notes: body.notes || '',
      total_price: total.toFixed(2),
      status: 'pending',
      mock_payment_ref: '',
      created_at: nowIso(),
    }
    mockGuideBookings.set(id, row)
    return serializeTravellerGuideBooking(row)
  }

  function serializeTravellerGuideBooking(row: {
    id: number
    guide: number
    guide_headline?: string
    date: string
    start_time?: string | null
    duration_hours?: number
    group_size: number
    meeting_point?: string
    package_id?: string
    notes?: string
    total_price?: string
    mock_payment_ref?: string
    status: string
    created_at?: string
  }) {
    const guide = mockGuides.find((g) => g.id === row.guide)
    const pkg = (guide?.tour_packages ?? []).find((p) => String(p.id) === String(row.package_id))
    return {
      id: row.id,
      guide: row.guide,
      guide_headline: row.guide_headline || guide?.headline || 'Guide',
      guide_username: guide?.username || '',
      date: row.date,
      start_time: row.start_time ?? null,
      duration_hours: row.duration_hours,
      group_size: row.group_size,
      meeting_point: row.meeting_point || '',
      package_id: row.package_id,
      package_title: pkg?.title || (row.package_id ? String(row.package_id) : 'Custom tour'),
      notes: row.notes,
      total_price: row.total_price,
      mock_payment_ref: row.mock_payment_ref || '',
      status: row.status,
      created_at: row.created_at,
    }
  }

  if (pathname === '/api/guides/bookings/' && method === 'GET') {
    requireAuth(s)
    const sessionRows = [...mockGuideBookings.values()].filter(
      (row) => !s.currentUser || row.client === s.currentUser,
    )
    return sessionRows.map((row) => serializeTravellerGuideBooking(row))
  }

  const guideMockPay = pathname.match(/^\/api\/guides\/bookings\/(\d+)\/mock_pay\/$/)
  if (guideMockPay && method === 'POST') {
    requireAuth(s)
    const bid = Number(guideMockPay[1])
    const b = mockGuideBookings.get(bid)
    if (!b) {
      throw new ApiError('Not found', 404, { detail: 'Booking not found.' })
    }
    if (b.status !== 'pending') {
      throw new ApiError('Bad request', 400, { detail: 'Booking not payable.' })
    }
    b.status = 'confirmed'
    b.mock_payment_ref = `mock_${Math.random().toString(36).slice(2, 18)}`
    mockGuideBookings.set(bid, b)
    return serializeTravellerGuideBooking(b)
  }

  const guideCancel = pathname.match(/^\/api\/guides\/bookings\/(\d+)\/cancel\/$/)
  if (guideCancel && method === 'POST') {
    requireAuth(s)
    const bid = Number(guideCancel[1])
    const b = mockGuideBookings.get(bid)
    if (!b || b.client !== s.currentUser) {
      throw new ApiError('Not found', 404, { detail: 'Booking not found.' })
    }
    if (!['pending', 'confirmed'].includes(String(b.status))) {
      throw new ApiError('Bad request', 400, { detail: 'This booking cannot be cancelled.' })
    }
    b.status = 'cancelled'
    mockGuideBookings.set(bid, b)
    return serializeTravellerGuideBooking(b)
  }

  // ---- Messaging ----
  if (pathname.startsWith('/api/messaging/')) {
    messagingEnsureSeed()
  }

  if (pathname === '/api/messaging/people/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const qq = (q.get('q') || '').trim().toLowerCase()
    const providerContext = (q.get('context') || '').trim().toLowerCase() === 'provider'
    let pool = Object.values(s.profiles).filter((p) => p.username !== me && p.allow_messages !== false)
    if (providerContext) {
      const allowed = mockProviderGuestUsernames(s, me)
      const myId = messagingNumericIdForUsername(me)
      for (const conv of mockMessagingConversations.values()) {
        if (!conv.participantIds.includes(myId)) continue
        for (const pid of conv.participantIds) {
          if (pid === myId) continue
          allowed.add(messagingUsernameForId(s, pid))
        }
      }
      pool = pool.filter((p) => allowed.has(p.username))
    } else {
      pool = pool.filter((p) => p.show_in_search !== false)
    }
    const results = pool
      .filter((p) => {
        if (!qq) return true
        return (
          textMatch(p.username, qq) ||
          textMatch(p.display_name, qq) ||
          textMatch(p.city ?? '', qq) ||
          textMatch(p.region ?? '', qq)
        )
      })
      .slice(0, qq ? 20 : 12)
      .map((p) => ({
        id: messagingNumericIdForUsername(p.username),
        username: p.username,
        display_name: p.display_name,
        avatar: p.avatar ?? null,
        city: p.city ?? '',
        region: p.region ?? '',
      }))
    return { results }
  }

  if (pathname === '/api/messaging/unread-count/' && method === 'GET') {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    let unread = 0
    for (const conv of mockMessagingConversations.values()) {
      if (!conv.participantIds.includes(me)) continue
      unread += messagingUnreadCount(conv.id, me)
    }
    return { unread }
  }

  if (pathname === '/api/messaging/blocks/' && method === 'GET') {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const rows = []
    for (const key of mockMessagingBlocks) {
      const [blocker, blocked] = key.split('->').map(Number)
      if (blocker !== me) continue
      const detail = messagingParticipantDetail(s, blocked)
      rows.push({
        id: blocked,
        username: detail.username,
        display_name: detail.display_name,
        created_at: nowIso(),
      })
    }
    return rows
  }

  if (pathname === '/api/messaging/blocks/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) throw new ApiError('Invalid body', 400, null)
    const payload = JSON.parse(init.body) as { user_id?: unknown; username?: unknown }
    const me = messagingNumericIdForUsername(s.currentUser as string)
    let otherId: number | null = null
    const username = typeof payload.username === 'string' ? payload.username.trim() : ''
    if (username) otherId = messagingFindUserIdByUsername(s, username)
    else otherId = Number(payload.user_id)
    if (otherId == null || !Number.isFinite(otherId) || otherId === me) {
      throw new ApiError('Bad request', 400, { detail: 'invalid user_id' })
    }
    const key = messagingBlockKey(me, otherId)
    const created = !mockMessagingBlocks.has(key)
    mockMessagingBlocks.add(key)
    const detail = messagingParticipantDetail(s, otherId)
    return {
      id: otherId,
      username: detail.username,
      display_name: detail.display_name,
      created_at: nowIso(),
      created,
    }
  }

  const blockDetail = pathname.match(/^\/api\/messaging\/blocks\/(\d+)\/$/)
  if (blockDetail && method === 'DELETE') {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const otherId = Number(blockDetail[1])
    const key = messagingBlockKey(me, otherId)
    if (!mockMessagingBlocks.has(key)) {
      throw new ApiError('Not found', 404, { detail: 'Not found' })
    }
    mockMessagingBlocks.delete(key)
    return null
  }

  if (pathname === '/api/messaging/conversations/' && method === 'GET') {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const list = [...mockMessagingConversations.values()]
      .filter((c) => c.participantIds.includes(me))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map((c) => messagingSerializeConversation(s, c, me))
    return list
  }

  const convDetail = pathname.match(/^\/api\/messaging\/conversations\/(\d+)\/$/)
  if (convDetail && method === 'GET') {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const cid = Number(convDetail[1])
    const conv = mockMessagingConversations.get(cid)
    if (!conv || !conv.participantIds.includes(me)) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    return messagingSerializeConversation(s, conv, me)
  }

  const convTyping = pathname.match(/^\/api\/messaging\/conversations\/(\d+)\/typing\/$/)
  if (convTyping) {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const cid = Number(convTyping[1])
    const conv = mockMessagingConversations.get(cid)
    if (!conv || !conv.participantIds.includes(me)) {
      throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    }
    if (method === 'POST') {
      mockMessagingTyping.set(`${cid}:${me}`, {
        username: s.currentUser as string,
        until: Date.now() + 4000,
      })
      return { ok: true }
    }
    if (method === 'GET') {
      const now = Date.now()
      const typing = []
      for (const pid of conv.participantIds) {
        if (pid === me) continue
        const row = mockMessagingTyping.get(`${cid}:${pid}`)
        if (row && row.until > now) typing.push({ id: pid, username: row.username })
      }
      return { typing }
    }
  }

  const convRead = pathname.match(/^\/api\/messaging\/conversations\/(\d+)\/read\/$/)
  if (convRead && method === 'POST') {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const cid = Number(convRead[1])
    const conv = mockMessagingConversations.get(cid)
    if (!conv || !conv.participantIds.includes(me)) {
      throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    }
    const list = mockMessagingMessages.get(cid) ?? []
    let marked = 0
    for (const m of list) {
      if (!m.read && m.senderId !== me) {
        m.read = true
        marked += 1
      }
    }
    mockMessagingMessages.set(cid, list)
    return { marked_read: marked }
  }

  if (pathname === '/api/messaging/provider-settings/' && (method === 'GET' || method === 'PATCH')) {
    requireAuth(s)
    const me = s.currentUser as string
    const businessIdRaw = q.get('business_id')
    let ownerUsername = me
    let businessId: number | null = null
    let businessName: string | null = null

    if (businessIdRaw) {
      const businessIdNum = Number(businessIdRaw)
      const seeded = mockBusinessProfiles.find((b) => b.id === businessIdNum)
      const created = [...mockUserBusinesses.values()]
        .flat()
        .find((b) => b.id === businessIdNum)
      const business = seeded ?? created
      if (!business) {
        throw new ApiError('Not found', 404, { detail: 'Business not found.' })
      }
      ownerUsername = business.owner_username
      businessId = business.id
      businessName = business.business_name
      const ownerProfile = s.profiles[ownerUsername]
      if (!ownerProfile || ownerProfile.user_type !== 'service_provider') {
        throw new ApiError('Bad request', 400, { detail: 'Business owner is not a service provider.' })
      }
      if (me !== ownerUsername) {
        throw new ApiError('Forbidden', 403, {
          detail: 'You do not have permission to manage messaging settings for this business.',
        })
      }
    } else {
      const profile = s.profiles[me]
      if (!profile || profile.user_type !== 'service_provider') {
        throw new ApiError('Forbidden', 403, { detail: 'Service providers only.' })
      }
    }

    const { row, inherits } =
      method === 'PATCH'
        ? { row: mockProviderMessagingSettingsFor(ownerUsername, businessId), inherits: false }
        : mockResolveProviderSettingsForRead(ownerUsername, businessId)
    if (method === 'PATCH') {
      if (!isJsonBody(init.body)) throw new ApiError('Invalid body', 400, null)
      const payload = JSON.parse(init.body) as Record<string, unknown>
      if ('auto_welcome_enabled' in payload) row.auto_welcome_enabled = Boolean(payload.auto_welcome_enabled)
      if ('auto_welcome_body' in payload) {
        row.auto_welcome_body = String(payload.auto_welcome_body ?? '').trim().slice(0, 1000)
      }
      if ('booking_confirmed_enabled' in payload) {
        row.booking_confirmed_enabled = Boolean(payload.booking_confirmed_enabled)
      }
      if ('booking_confirmed_body' in payload) {
        row.booking_confirmed_body = String(payload.booking_confirmed_body ?? '').trim().slice(0, 1000)
      }
      if ('quick_replies_enabled' in payload) row.quick_replies_enabled = Boolean(payload.quick_replies_enabled)
      if ('quick_replies' in payload && Array.isArray(payload.quick_replies)) {
        row.quick_replies = payload.quick_replies
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 6)
          .map((item) => item.slice(0, 120))
      }
      row.updated_at = nowIso()
      mockProviderMessagingSettings.set(mockProviderSettingsKey(ownerUsername, businessId), row)
    }
    const validationError = mockValidateProviderMessagingSettings(row)
    if (validationError) {
      throw new ApiError('Bad request', 400, { detail: validationError })
    }
    return {
      auto_welcome_enabled: row.auto_welcome_enabled,
      auto_welcome_body: row.auto_welcome_body,
      booking_confirmed_enabled: row.booking_confirmed_enabled,
      booking_confirmed_body: row.booking_confirmed_body,
      quick_replies_enabled: row.quick_replies_enabled,
      quick_replies: row.quick_replies,
      updated_at: row.updated_at,
      business_id: businessId,
      business_name: businessName,
      owner_username: ownerUsername,
      managed_for_owner: ownerUsername !== me,
      inherits_account_default: method === 'GET' ? inherits : false,
      scope: businessId != null ? 'business' : 'account',
    }
  }

  if (pathname === '/api/messaging/start/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) {
      throw new ApiError('Invalid body', 400, null)
    }
    const payload = JSON.parse(init.body) as {
      user_id?: unknown
      username?: unknown
      context_type?: unknown
      context_id?: unknown
      context_label?: unknown
      business_id?: unknown
    }
    const me = messagingNumericIdForUsername(s.currentUser as string)
    let otherId: number | null = null
    const username = typeof payload.username === 'string' ? payload.username.trim() : ''
    if (username) {
      otherId = messagingFindUserIdByUsername(s, username)
      if (otherId == null) {
        throw new ApiError('Not found', 404, { detail: 'user not found' })
      }
    } else {
      otherId = Number(payload.user_id)
      if (!Number.isFinite(otherId)) {
        throw new ApiError('Bad request', 400, { detail: 'user_id or username required' })
      }
    }
    if (otherId === me) {
      throw new ApiError('Bad request', 400, { detail: 'invalid user_id' })
    }
    if (!messagingUserExists(s, otherId)) {
      throw new ApiError('Not found', 404, { detail: 'user not found' })
    }
    if (messagingIsBlockedEitherWay(me, otherId)) {
      throw new ApiError('Forbidden', 403, { detail: 'You cannot message this user.' })
    }
    const existing = messagingFindConvBetween(me, otherId)
    if (existing) {
      messagingApplyContext(existing, payload)
      mockMessagingConversations.set(existing.id, existing)
      return messagingSerializeConversation(s, existing, me)
    }
    const t = nowIso()
    const id = mockMessagingConvSeq++
    const a = Math.min(me, otherId)
    const b = Math.max(me, otherId)
    const conv: MockMessagingConv = {
      id,
      participantIds: [a, b],
      pair_key: messagingPairKey(me, otherId),
      created_at: t,
      updated_at: t,
    }
    messagingApplyContext(conv, payload)
    mockMessagingConversations.set(id, conv)
    mockMessagingMessages.set(id, [])
    mockMaybeSendProviderAutoWelcome(s, id, me, otherId, payload)
    return messagingSerializeConversation(s, conv, me)
  }

  const convMsgs = pathname.match(/^\/api\/messaging\/conversations\/(\d+)\/messages\/$/)
  if (convMsgs) {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const cid = Number(convMsgs[1])
    const conv = mockMessagingConversations.get(cid)
    if (!conv || !conv.participantIds.includes(me)) {
      throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    }
    if (method === 'GET') {
      let limit = Number(q.get('limit') || 50)
      if (!Number.isFinite(limit) || limit < 1) limit = 50
      limit = Math.min(100, limit)
      const beforeRaw = q.get('before_id')
      const beforeId = beforeRaw ? Number(beforeRaw) : null
      let arr = [...(mockMessagingMessages.get(cid) ?? [])].sort((a, b) => b.id - a.id)
      if (beforeId != null && Number.isFinite(beforeId)) {
        arr = arr.filter((m) => m.id < beforeId)
      }
      const hasMore = arr.length > limit
      const page = arr.slice(0, limit).reverse()
      return {
        results: page.map((m) => messagingSerializeMessage(s, m)),
        has_more: hasMore,
        next_before_id: hasMore && page.length ? page[0].id : null,
      }
    }
    if (method === 'POST') {
      if (!isJsonBody(init.body)) {
        throw new ApiError('Invalid body', 400, null)
      }
      const otherId = conv.participantIds.find((pid) => pid !== me)
      if (otherId != null && messagingIsBlockedEitherWay(me, otherId)) {
        throw new ApiError('Forbidden', 403, { detail: 'You cannot message this user.' })
      }
      const payload = JSON.parse(init.body) as { body?: string }
      const text = (payload.body ?? '').trim()
      if (!text) {
        throw new ApiError('Bad request', 400, { detail: 'body required' })
      }
      const msg: MockMessagingMsg = {
        id: mockMessagingMsgSeq++,
        senderId: me,
        body: text,
        created_at: nowIso(),
        read: false,
      }
      const list = mockMessagingMessages.get(cid) ?? []
      list.push(msg)
      mockMessagingMessages.set(cid, list)
      const c = mockMessagingConversations.get(cid)
      if (c) {
        c.updated_at = msg.created_at
        mockMessagingConversations.set(cid, c)
      }
      return messagingSerializeMessage(s, msg)
    }
  }

  // ---- Search ----
  if (pathname === '/api/search/' && method === 'GET') {
    const qq = (q.get('q') || '').trim()
    const emptySearch = {
      users: [],
      accommodation: [],
      vehicles: [],
      bus_trips: [],
      events: [],
      food: [],
      guides: [],
      posts: [],
      questions: [],
      journeys: [],
    }
    if (qq.length < 2) return emptySearch

    const typeTokens = (q.get('types') || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const typeToBuckets: Record<string, string[]> = {
      profile: ['users'],
      stay: ['accommodation'],
      food: ['food'],
      events: ['events'],
      guides: ['guides'],
      transport: ['vehicles', 'bus_trips'],
      delvers: ['posts'],
      ask_locals: ['questions'],
      journeys: ['journeys'],
    }
    let buckets: Set<string> | null = null
    if (typeTokens.length > 0) {
      buckets = new Set<string>()
      for (const token of typeTokens) {
        for (const b of typeToBuckets[token] ?? []) buckets.add(b)
      }
      if (buckets.size === 0) buckets = null
    }
    const wants = (name: string) => buckets == null || buckets.has(name)
    const limit = buckets != null && buckets.size <= 2 ? 20 : 8
    const delversOnly = buckets != null && buckets.size === 1 && buckets.has('posts')

    const users = wants('users')
      ? Object.entries(s.profiles)
          .filter(([, p]) => p.show_in_search !== false)
          .filter(
            ([username, p]) =>
              textMatch(username, qq) ||
              textMatch(p.display_name ?? '', qq) ||
              textMatch(p.bio ?? '', qq) ||
              textMatch(p.region ?? '', qq) ||
              textMatch(p.city ?? '', qq),
          )
          .slice(0, limit)
          .map(([username, p], i) => {
            const row: Record<string, unknown> = {
              id: i + 1,
              username,
              display_name: p.display_name ?? username,
              avatar: p.avatar ?? null,
              user_type: p.user_type,
              city: p.city ?? '',
              region: p.region ?? '',
              bio: (p.bio ?? '').slice(0, 160),
            }
            if (s.currentUser) {
              row.can_message = mockProfileRelationship(s, s.currentUser as string, username).can_message
            }
            return row
          })
      : []

    return {
      users,
      accommodation: wants('accommodation')
        ? mockStays.filter((s2) => textMatch(s2.title, qq) || textMatch(s2.region, qq)).slice(0, limit)
        : [],
      vehicles: wants('vehicles')
        ? mockVehicles.filter((v) => textMatch(v.title, qq) || textMatch(v.region, qq)).slice(0, limit)
        : [],
      bus_trips: wants('bus_trips')
        ? mockBusTrips
            .filter((t) => textMatch(t.route_detail.origin, qq) || textMatch(t.route_detail.destination, qq))
            .slice(0, limit)
            .map((t) => busTripDetailForApi(t))
        : [],
      events: wants('events')
        ? mockEvents.filter((e) => textMatch(e.title, qq) || textMatch(e.region, qq)).slice(0, limit)
        : [],
      food: wants('food')
        ? mockFood.filter((f) => textMatch(f.name, qq) || textMatch(f.region, qq)).slice(0, limit)
        : [],
      guides: wants('guides')
        ? mockGuides.filter((g) => textMatch(g.headline, qq) || textMatch(g.username, qq)).slice(0, limit)
        : [],
      posts: wants('posts')
        ? withMeFlags(s, visiblePosts(s.posts))
            .filter((p) => textMatch(p.body, qq) || textMatch(p.region, qq))
            .filter((p) => (delversOnly ? p.is_delvers : true))
            .slice(0, limit)
        : [],
      questions: wants('questions')
        ? withMeFlags(
            s,
            visiblePosts(s.posts).filter((p) => p.post_kind === 'question' && !p.is_delvers),
          )
            .filter((p) => textMatch(p.body, qq) || textMatch(p.region, qq) || textMatch(p.place_label ?? '', qq))
            .slice(0, limit)
        : [],
      journeys: wants('journeys')
        ? mockVisibleJourneys(s)
            .filter(
              (j) =>
                textMatch(j.title, qq) ||
                textMatch(j.summary, qq) ||
                (j.tags || []).some((tag) => textMatch(tag, qq)) ||
                (j.stops || []).some(
                  (stop) => textMatch(stop.place_name, qq) || textMatch(stop.region ?? '', qq),
                ),
            )
            .slice(0, limit)
            .map((j) => mockSerializeJourney(s, j))
        : [],
    }
  }

  if (pathname === '/api/reports/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init?.body)) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    }
    const body = JSON.parse(init.body) as {
      target_type?: string
      target_id?: string
      target_label?: string
      reason?: string
      description?: string
    }
    if (!body.target_type || !body.target_id || !body.reason) {
      throw new ApiError('Bad request', 400, { detail: 'target_type, target_id, and reason are required.' })
    }
    return {
      id: Date.now(),
      reporter_username: s.currentUser,
      target_type: body.target_type,
      target_id: body.target_id,
      target_label: body.target_label || '',
      reason: body.reason,
      description: body.description || '',
      status: 'new',
      severity: 'medium',
      created_at: nowIso(),
    }
  }

  // Default: return something safe to keep UI from exploding in mock mode
  return { detail: `Mock: unhandled ${method} ${pathname}` }
}

