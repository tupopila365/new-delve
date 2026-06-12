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
  start_date: string
  end_date: string
  total_price: string
  status: 'pending' | 'confirmed'
  mock_payment_ref: string
}
const mockVehicleBookings = new Map<number, MockVehicleBookingRow>()
let mockVehicleBookingNextId = 8000

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
      const data = JSON.parse(init.body) as { username?: string }
      username = (data.username || '').trim() || 'demo_user'
    }
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
      ? mockBusinessProfiles.filter((b) => b.owner_username.toLowerCase() === owner.toLowerCase())
      : mockBusinessProfiles
    return list.map((b) => ({
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

  const businessDetailMatch = pathname.match(/^\/api\/accounts\/businesses\/(\d+)\/?$/)
  if (businessDetailMatch && method === 'GET') {
    const b = mockBusinessProfiles.find((x) => x.id === Number(businessDetailMatch[1]))
    if (!b) throw new ApiError('Not found', 404, { detail: 'Not found.' })
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

  if (pathname === '/api/accounts/me/businesses/' && method === 'GET') {
    requireAuth(s)
    const me = s.currentUser as string
    const owned = mockBusinessProfiles.filter((b) => b.owner_username === me)
    return owned.map((b) => ({
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
      role: 'owner',
      permissions: {
        view_dashboard: true,
        manage_bookings: true,
        manage_listings: true,
        manage_team: true,
        manage_payouts: true,
        manage_settings: true,
      },
    }))
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
        property_type: 'guesthouse',
        amenities: st.amenities,
        cover_image: st.cover_image,
        rating_avg: st.rating_avg,
        rating_count: st.rating_count,
        is_active: true,
        guest_reviews: [],
      }))
  }

  if (pathname === '/api/accommodation/provider-listings/' && method === 'POST') {
    requireAuth(s)
    const me = s.currentUser as string
    const prof = s.profiles[me]
    if (prof?.user_type !== 'service_provider') throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    return {
      id: Date.now(),
      ...data,
      rating_avg: '4.5',
      rating_count: 0,
      cover_image: null,
      amenities: data.amenities ?? [],
    }
  }

  const providerListingMatch = pathname.match(/^\/api\/accommodation\/provider-listings\/(\d+)\/?$/)
  if (providerListingMatch && method === 'PATCH') {
    requireAuth(s)
    const data = isJsonBody(init.body) ? JSON.parse(init.body) : {}
    const st = mockStays.find((x) => x.id === Number(providerListingMatch[1]))
    if (st) Object.assign(st, data)
    return { id: Number(providerListingMatch[1]), ...data, rating_avg: st?.rating_avg ?? '4.5', rating_count: st?.rating_count ?? 0 }
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
    const posts = s.posts
      .filter((p) => !p.is_delvers && !p.is_accommodation_story)
      .filter((p) => (region ? p.region.toLowerCase().includes(region.toLowerCase()) : true))
    const ranked = [...posts].sort((a, b) => b.likes_count + b.saves_count - (a.likes_count + a.saves_count))
    return withMeFlags(s, ranked).slice(0, 50)
  }

  if (pathname === '/api/social/accommodation-stories/' && method === 'GET') {
    const list = s.posts
      .filter((p) => Boolean(p.is_accommodation_story) && (p.image || p.video))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return withMeFlags(s, list).slice(0, 120)
  }

  if (pathname === '/api/social/delvers/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const posts = s.posts.filter((p) => p.is_delvers && !p.is_accommodation_story).filter((p) => (region ? p.region.toLowerCase().includes(region.toLowerCase()) : true))
    const ranked = [...posts].sort((a, b) => b.saves_count - a.saves_count)
    return withMeFlags(s, ranked).slice(0, 80)
  }

  const userPostsMatch = pathname.match(/^\/api\/social\/users\/([^/]+)\/posts\/$/)
  if (userPostsMatch && method === 'GET') {
    const slug = decodeURIComponent(userPostsMatch[1])
    const unLower = slug.toLowerCase()
    const list = s.posts.filter((p) => p.author.username.toLowerCase() === unLower)
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
    const board = (post.delvers_board || '').trim().toLowerCase()
    const regionLower = (post.region || '').trim().toLowerCase()
    const authorU = post.author.username.toLowerCase()
    const others = s.posts.filter((p) => p.id !== id && !p.is_accommodation_story)
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
    if (!post) {
      throw new ApiError('Not found', 404, { detail: 'Not found.' })
    }
    return withMeFlags(s, [post])[0]
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
    const body = JSON.parse(init.body) as { listing?: number; start_date?: string; end_date?: string }
    const listingId = Number(body.listing)
    const vehicle = mockVehicles.find((v) => v.id === listingId)
    if (!vehicle) {
      throw new ApiError('Vehicle not found.', 404, { detail: 'Not found' })
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
      start_date: start,
      end_date: end,
      total_price: total,
      status: 'pending',
      mock_payment_ref: '',
    }
    mockVehicleBookings.set(id, row)
    return row
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
    return mockEvents
      .filter((e) => (region ? textMatch(e.region, region) || textMatch(e.city, region) : true))
      .filter((e) => (category ? e.category === category : true))
  }
  const eventMatch = pathname.match(/^\/api\/events\/(\d+)\/$/)
  if (eventMatch && method === 'GET') {
    const id = Number(eventMatch[1])
    return mockEvents.find((e) => e.id === id) || { detail: 'Not found' }
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
      posts: withMeFlags(s, s.posts).filter((p) => textMatch(p.body, qq) || textMatch(p.region, qq)).slice(0, 8),
    }
  }

  // Default: return something safe to keep UI from exploding in mock mode
  return { detail: `Mock: unhandled ${method} ${pathname}` }
}

