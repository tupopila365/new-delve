import { ApiError } from '../api/client'
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

type MockState = {
  currentUser: string | null
  profiles: Record<string, MockProfile>
  posts: MockPost[]
  nextPostId: number
  likes: Record<string, number[]>
  saves: Record<string, number[]>
  comments: Record<string, MockComment[]>
  nextCommentId: number
}

type MockComment = {
  id: number
  author: { username: string; display_name: string; avatar: string | null }
  body: string
  created_at: string
  is_hidden?: boolean
}

const KEY = 'delve_mock_state_v7'

/** In-memory accommodation bookings for mock API (session only). */
type MockAccBookingRow = {
  id: number
  listing: number
  listing_title: string
  check_in: string
  check_out: string
  guests: number
  total_price: string
  special_requests: string
  room_type_name: string
  status: 'pending' | 'confirmed'
  mock_payment_ref: string
}
const mockAccBookings = new Map<number, MockAccBookingRow>()
let mockAccNextBookingId = 1

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
    status: 'pending' | 'confirmed'
    mock_payment_ref: string
  }
>()

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
  }
  const targetType = targetMap[category.toLowerCase()]
  if (!targetType) return []
  const campaigns = activeFeaturedCampaigns('category_spotlight', region, targetType).slice(0, 1)
  for (const campaign of campaigns) {
    if (targetType === 'food') {
      const row = mockFood.find((x) => x.id === campaign.target_id)
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
  return {
    ...row,
    likes_count: likers?.size ?? 0,
    liked_by_me: Boolean(s.currentUser && likers?.has(s.currentUser as string)),
  }
}

// ---- Mock messaging (session; mirrors backend ConversationSerializer / MessageSerializer) ----

type MockMessagingConv = {
  id: number
  participantIds: number[]
  created_at: string
  updated_at: string
}

type MockMessagingMsg = {
  id: number
  senderId: number
  body: string
  created_at: string
}

const mockMessagingConversations = new Map<number, MockMessagingConv>()
const mockMessagingMessages = new Map<number, MockMessagingMsg[]>()
let mockMessagingConvSeq = 1
let mockMessagingMsgSeq = 1

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

function messagingEnsureSeed() {
  if (mockMessagingConversations.size > 0) return
  const id = mockMessagingConvSeq++
  const t = nowIso()
  mockMessagingConversations.set(id, {
    id,
    participantIds: [1, 2].sort((a, b) => a - b),
    created_at: t,
    updated_at: t,
  })
  mockMessagingMessages.set(id, [
    {
      id: mockMessagingMsgSeq++,
      senderId: 2,
      body: 'Hi! Thanks for your interest in a desert tour — let me know your dates.',
      created_at: t,
    },
  ])
}

function messagingFindConvBetween(a: number, b: number): MockMessagingConv | undefined {
  const x = Math.min(a, b)
  const y = Math.max(a, b)
  for (const c of mockMessagingConversations.values()) {
    if (c.participantIds.length === 2 && c.participantIds[0] === x && c.participantIds[1] === y) {
      return c
    }
  }
  return undefined
}

function messagingLastMessage(convId: number): MockMessagingMsg | null {
  const arr = mockMessagingMessages.get(convId) ?? []
  if (!arr.length) return null
  return [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

function messagingSerializeConversation(s: MockState, conv: MockMessagingConv) {
  const last = messagingLastMessage(conv.id)
  return {
    id: conv.id,
    participants_detail: conv.participantIds.map((pid) => messagingParticipantDetail(s, pid)),
    created_at: conv.created_at,
    updated_at: conv.updated_at,
    last_message: last
      ? {
          id: last.id,
          sender: last.senderId,
          sender_username: messagingUsernameForId(s, last.senderId),
          body: last.body,
          read: false,
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
    read: false,
    created_at: m.created_at,
  }
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
      return stored
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
  }
  localStorage.setItem(KEY, JSON.stringify(seed))
  return seed
}

function saveState(s: MockState) {
  localStorage.setItem(KEY, JSON.stringify(s))
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
  return posts.map((p) => ({
    ...p,
    liked_by_me: liked.has(p.id),
    saved_by_me: saved.has(p.id),
  }))
}

function visiblePosts(posts: MockPost[]) {
  return posts.filter((p) => !p.is_hidden)
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
      data = raw as Partial<MockProfile>
    }
    s.profiles[me] = { ...s.profiles[me], ...data, username: me, email: s.profiles[me].email }
    saveState(s)
    return s.profiles[me]
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
      email_verified: true,
      is_private: false,
      posts_visibility: 'public',
      allow_messages: true,
      show_in_search: true,
    }
    saveState(s)
    return { detail: 'Account created (mock).' }
  }

  if (pathname === '/api/accounts/verify-email/' && method === 'POST') {
    return { detail: 'Email verified (mock).' }
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
      }))
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
      { id: 1, listing_title: 'Coastal guesthouse', guest_display_name: 'Demo Explorer', guest_username: 'demo_user', check_in: '2026-05-10', check_out: '2026-05-13', guests: 2, total_price: '2850', status: 'confirmed' },
      { id: 2, listing_title: 'Independence Ave Hotel', guest_display_name: 'Demo Explorer', guest_username: 'demo_user', check_in: '2026-05-20', check_out: '2026-05-22', guests: 1, total_price: '1240', status: 'pending' },
      { id: 3, listing_title: 'Freesia Hotel', guest_display_name: 'Anna K.', guest_username: 'anna', check_in: '2026-05-14', check_out: '2026-05-16', guests: 2, total_price: '700', status: 'confirmed' },
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
    }
  }

  // ---- Social feeds ----
  if (pathname === '/api/social/feed/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const posts = visiblePosts(s.posts)
      .filter((p) => !p.is_delvers && !p.is_accommodation_story)
      .filter((p) => (region ? p.region.toLowerCase().includes(region.toLowerCase()) : true))
    const ranked = [...posts].sort((a, b) => b.likes_count + b.saves_count - (a.likes_count + a.saves_count))
    const organic = withMeFlags(s, ranked).slice(0, 50) as Record<string, unknown>[]
    return injectMockFeedPromotions(s, organic, 'community_feed', region, false)
  }

  if (pathname === '/api/social/accommodation-stories/' && method === 'GET') {
    const list = visiblePosts(s.posts)
      .filter((p) => Boolean(p.is_accommodation_story) && (p.image || p.video))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return withMeFlags(s, list).slice(0, 120)
  }

  if (pathname === '/api/social/delvers/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const posts = visiblePosts(s.posts).filter((p) => p.is_delvers && !p.is_accommodation_story).filter((p) => (region ? p.region.toLowerCase().includes(region.toLowerCase()) : true))
    const ranked = [...posts].sort((a, b) => b.saves_count - a.saves_count)
    const organic = withMeFlags(s, ranked).slice(0, 80) as Record<string, unknown>[]
    return injectMockFeedPromotions(s, organic, 'delvers_feed', region, true)
  }

  const userPostsMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/posts\/$/)
  if (userPostsMatch && method === 'GET') {
    const slug = decodeURIComponent(userPostsMatch[1])
    const unLower = slug.toLowerCase()
    const list = visiblePosts(s.posts).filter((p) => p.author.username.toLowerCase() === unLower)
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
    const others = visiblePosts(s.posts).filter((p) => p.id !== id && !p.is_accommodation_story)
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
      return s.comments[key].filter((c) => !c.is_hidden)
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

  if (pathname === '/api/social/posts/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const profile = s.profiles[me]
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
      listing: null,
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
      const board = String(init.body.get('delvers_board') || '')
      const hasVideo = Boolean(init.body.get('video'))
      const hasImage = Boolean(init.body.get('image'))
      const listingRaw = String(init.body.get('listing') || '').trim()
      base.body = body
      base.region = region
      base.is_delvers = is_delvers
      base.is_accommodation_story = is_accommodation_story
      base.delvers_board = board
      if (hasVideo) base.video = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
      if (hasImage) base.image = 'https://images.unsplash.com/photo-1543248939-ff40856f65d2?auto=format&fit=crop&w=1200&q=70'
      if (is_accommodation_story) {
        base.is_delvers = false
      }
      if (listingRaw) {
        const lid = Number(listingRaw)
        const stay = mockStays.find((st) => st.id === lid)
        base.listing = stay ? { id: stay.id, title: stay.title } : { id: lid, title: 'Listing' }
      }
      if (is_accommodation_story && profile.user_type !== 'service_provider') {
        throw new ApiError('Forbidden', 403, { detail: 'Only hosts can post accommodation stories.' })
      }
    } else if (isJsonBody(init.body)) {
      const data = JSON.parse(init.body) as Partial<MockPost> & { is_delvers?: boolean; is_accommodation_story?: boolean }
      base.body = data.body || ''
      base.region = data.region || base.region
      base.is_delvers = Boolean(data.is_delvers)
      base.is_accommodation_story = Boolean(data.is_accommodation_story)
      base.delvers_board = data.delvers_board || ''
      if (data.listing) base.listing = data.listing
      if (base.is_accommodation_story) base.is_delvers = false
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
    return mergeFeaturedRail(s, 'homepage_transport', (q.get('region') || '').trim(), mockVehicles, (row) => ({ ...row }))
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
  const stayMatch = pathname.match(/^\/api\/accommodation\/listings\/(\d+)\/$/)
  if (stayMatch && method === 'GET') {
    const id = Number(stayMatch[1])
    const s2 = mockStays.find((x) => x.id === id)
    return s2 ? enrichAccommodationListingRow(s, s2) : { detail: 'Not found' }
  }

  if (pathname === '/api/accommodation/bookings/' && method === 'GET') {
    requireAuth(s)
    const sessionRows = [...mockAccBookings.values()].map((row) => ({
      id: row.id,
      listing: row.listing,
      listing_title: row.listing_title,
      check_in: row.check_in,
      check_out: row.check_out,
      guests: row.guests,
      total_price: row.total_price,
      special_requests: row.special_requests,
      room_type_name: row.room_type_name,
      status: row.status,
      mock_payment_ref: row.mock_payment_ref,
    }))
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
      },
    ]
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
    const nights = Math.max(1, Math.round((t1 - t0) / (1000 * 60 * 60 * 24)))
    const total = (nightly * nights).toFixed(2)
    const special_requests = typeof body.special_requests === 'string' ? body.special_requests.trim() : ''
    const id = mockAccNextBookingId++
    const row: MockAccBookingRow = {
      id,
      listing: listingId,
      listing_title: listing.title,
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

  const accMockPay = pathname.match(/^\/api\/accommodation\/bookings\/(\d+)\/mock_pay\/$/)
  if (accMockPay && method === 'POST') {
    requireAuth(s)
    const bid = Number(accMockPay[1])
    const b = mockAccBookings.get(bid)
    if (!b) {
      throw new ApiError('Not found', 404, { detail: 'Booking not found.' })
    }
    if (b.status !== 'pending') {
      throw new ApiError('Bad request', 400, { detail: 'Booking not payable.' })
    }
    b.status = 'confirmed'
    b.mock_payment_ref = `mock_${Math.random().toString(36).slice(2, 18)}`
    mockAccBookings.set(bid, b)
    return {
      detail: 'Payment successful (mock).',
      status: b.status,
      mock_payment_ref: b.mock_payment_ref,
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
      organizer_username: me,
      organizer_display_name: profile?.display_name || me,
      is_free: isFree,
      price: isFree ? undefined : get('price') || undefined,
      ticket_url: get('ticket_url') || undefined,
      capacity: Number.isFinite(capNum) && capNum > 0 ? capNum : undefined,
      is_published: true,
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
    return { ...ev }
  }

  // ---- Food ----
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
  }
  const foodMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/$/)
  if (foodMatch && method === 'GET') {
    const id = Number(foodMatch[1])
    const venue = mockFood.find((f) => f.id === id)
    if (!venue) return { detail: 'Not found' }
    return enrichFoodVenueDetail(venue)
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

  if (pathname === '/api/guides/provider-profile/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    if (providerGuideForUser(me)) {
      throw new ApiError('Bad request', 400, { detail: 'Guide profile already exists.' })
    }
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
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
      tour_packages: data.tour_packages ?? [],
      is_active: data.is_active !== false,
    }
    mockGuides.push(row as (typeof mockGuides)[0])
    return serializeProviderGuide(row as (typeof mockGuides)[0])
  }

  if (pathname === '/api/guides/provider-profile/' && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    const guide = providerGuideForUser(me)
    if (!guide) throw new ApiError('Not found', 404, { detail: 'Guide profile not found.' })
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
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
    return list
  }
  const guideMatch = pathname.match(/^\/api\/guides\/profiles\/(\d+)\/$/)
  if (guideMatch && method === 'GET') {
    const id = Number(guideMatch[1])
    return mockGuides.find((g) => g.id === id) || { detail: 'Not found' }
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
    return row
  }

  if (pathname === '/api/guides/bookings/' && method === 'GET') {
    requireAuth(s)
    const sessionRows = [...mockGuideBookings.values()].filter(
      (row) => !s.currentUser || row.client === s.currentUser,
    )
    return sessionRows.map((row) => ({
      id: row.id,
      guide: row.guide,
      guide_headline: row.guide_headline,
      date: row.date,
      group_size: row.group_size,
      package_id: row.package_id,
      notes: row.notes,
      total_price: row.total_price,
      status: row.status,
      created_at: row.created_at,
    }))
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
    return {
      detail: 'Payment successful (mock).',
      status: b.status,
      mock_payment_ref: b.mock_payment_ref,
    }
  }

  // ---- Messaging ----
  if (pathname.startsWith('/api/messaging/')) {
    messagingEnsureSeed()
  }

  if (pathname === '/api/messaging/people/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const qq = (q.get('q') || '').trim().toLowerCase()
    const results = Object.values(s.profiles)
      .filter((p) => p.username !== me && p.allow_messages !== false)
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

  if (pathname === '/api/messaging/conversations/' && method === 'GET') {
    requireAuth(s)
    const me = messagingNumericIdForUsername(s.currentUser as string)
    const list = [...mockMessagingConversations.values()]
      .filter((c) => c.participantIds.includes(me))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .map((c) => messagingSerializeConversation(s, c))
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
    return messagingSerializeConversation(s, conv)
  }

  if (pathname === '/api/messaging/start/' && method === 'POST') {
    requireAuth(s)
    if (!isJsonBody(init.body)) {
      throw new ApiError('Invalid body', 400, null)
    }
    const payload = JSON.parse(init.body) as { user_id?: unknown }
    let otherId: number
    try {
      otherId = Number(payload.user_id)
    } catch {
      throw new ApiError('Bad request', 400, { detail: 'invalid user_id' })
    }
    if (!Number.isFinite(otherId)) {
      throw new ApiError('Bad request', 400, { detail: 'invalid user_id' })
    }
    const me = messagingNumericIdForUsername(s.currentUser as string)
    if (otherId === me) {
      throw new ApiError('Bad request', 400, { detail: 'invalid user_id' })
    }
    if (!messagingUserExists(s, otherId)) {
      throw new ApiError('Not found', 404, { detail: 'user not found' })
    }
    const existing = messagingFindConvBetween(me, otherId)
    if (existing) {
      return messagingSerializeConversation(s, existing)
    }
    const t = nowIso()
    const id = mockMessagingConvSeq++
    const a = Math.min(me, otherId)
    const b = Math.max(me, otherId)
    const conv: MockMessagingConv = {
      id,
      participantIds: [a, b],
      created_at: t,
      updated_at: t,
    }
    mockMessagingConversations.set(id, conv)
    mockMessagingMessages.set(id, [])
    return messagingSerializeConversation(s, conv)
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
      const arr = [...(mockMessagingMessages.get(cid) ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      return arr.map((m) => messagingSerializeMessage(s, m))
    }
    if (method === 'POST') {
      if (!isJsonBody(init.body)) {
        throw new ApiError('Invalid body', 400, null)
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
      }
      const list = mockMessagingMessages.get(cid) ?? []
      list.push(msg)
      mockMessagingMessages.set(cid, list)
      const c = mockMessagingConversations.get(cid)
      if (c) {
        c.updated_at = msg.created_at
        mockMessagingConversations.set(cid, c)
      }
      return { detail: 'sent' }
    }
  }

  // ---- Search ----
  if (pathname === '/api/search/' && method === 'GET') {
    const qq = (q.get('q') || '').trim()
    if (qq.length < 2) {
      return { accommodation: [], vehicles: [], bus_trips: [], events: [], food: [], guides: [], posts: [] }
    }
    return {
      accommodation: mockStays.filter((s2) => textMatch(s2.title, qq) || textMatch(s2.region, qq)).slice(0, 8),
      vehicles: mockVehicles.filter((v) => textMatch(v.title, qq) || textMatch(v.region, qq)).slice(0, 8),
      bus_trips: mockBusTrips
        .filter((t) => textMatch(t.route_detail.origin, qq) || textMatch(t.route_detail.destination, qq))
        .slice(0, 8)
        .map((t) => busTripDetailForApi(t)),
      events: mockEvents.filter((e) => textMatch(e.title, qq) || textMatch(e.region, qq)).slice(0, 8),
      food: mockFood.filter((f) => textMatch(f.name, qq) || textMatch(f.region, qq)).slice(0, 8),
      guides: mockGuides.filter((g) => textMatch(g.headline, qq)).slice(0, 8),
      posts: withMeFlags(s, visiblePosts(s.posts)).filter((p) => textMatch(p.body, qq) || textMatch(p.region, qq)).slice(0, 8),
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

