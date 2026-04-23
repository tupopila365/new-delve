import { ApiError } from '../api/client'
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

const KEY = 'delve_mock_state_v4'

function nowIso() {
  return new Date().toISOString()
}

function loadState(): MockState {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as MockState
    } catch {
      // fallthrough
    }
  }
  const seed: MockState = {
    currentUser: null,
    profiles: mockProfiles,
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
        avatar: null,
        email_verified: true,
      }
    }
    s.currentUser = username
    saveState(s)
    return { access: `mock_access_${username}`, refresh: `mock_refresh_${username}` }
  }

  if (pathname === '/api/accounts/me/' && method === 'GET') {
    requireAuth(s)
    return s.profiles[s.currentUser as string]
  }

  if (pathname === '/api/accounts/me/update/' && method === 'PATCH') {
    requireAuth(s)
    const me = s.currentUser as string
    const data = isJsonBody(init.body) ? (JSON.parse(init.body) as Partial<MockProfile>) : {}
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
      avatar: null,
      email_verified: true,
    }
    saveState(s)
    return { detail: 'Account created (mock).' }
  }

  if (pathname === '/api/accounts/verify-email/' && method === 'POST') {
    return { detail: 'Email verified (mock).' }
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

    return list
  }
  const stayMatch = pathname.match(/^\/api\/accommodation\/listings\/(\d+)\/$/)
  if (stayMatch && method === 'GET') {
    const id = Number(stayMatch[1])
    const s2 = mockStays.find((x) => x.id === id)
    return s2 || { detail: 'Not found' }
  }

  // ---- Transport ----
  if (pathname === '/api/transport/vehicles/' && method === 'GET') {
    const region = (q.get('region') || '').trim()
    const min = Number(q.get('min_price') || '0')
    const max = Number(q.get('max_price') || '999999')
    return mockVehicles
      .filter((v) => (region ? textMatch(v.region, region) || textMatch(v.city, region) : true))
      .filter((v) => Number(v.price_per_day) >= min && Number(v.price_per_day) <= max)
  }
  const vehMatch = pathname.match(/^\/api\/transport\/vehicles\/(\d+)\/$/)
  if (vehMatch && method === 'GET') {
    const id = Number(vehMatch[1])
    return mockVehicles.find((v) => v.id === id) || { detail: 'Not found' }
  }
  if (pathname === '/api/transport/bus/trips/' && method === 'GET') {
    const o = (q.get('route_origin') || '').trim()
    const d = (q.get('route_destination') || '').trim()
    return mockBusTrips.filter((t) => (o ? textMatch(t.route_detail.origin, o) : true)).filter((t) => (d ? textMatch(t.route_detail.destination, d) : true))
  }
  const tripMatch = pathname.match(/^\/api\/transport\/bus\/trips\/(\d+)\/$/)
  if (tripMatch && method === 'GET') {
    const id = Number(tripMatch[1])
    return mockBusTrips.find((t) => t.id === id) || { detail: 'Not found' }
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
    return mockFood
      .filter((f) => (region ? textMatch(f.region, region) || textMatch(f.city, region) : true))
      .filter((f) => (cuisine ? textMatch(f.cuisine, cuisine) : true))
  }
  const foodMatch = pathname.match(/^\/api\/food\/venues\/(\d+)\/$/)
  if (foodMatch && method === 'GET') {
    const id = Number(foodMatch[1])
    return mockFood.find((f) => f.id === id) || { detail: 'Not found' }
  }

  // ---- Guides ----
  if (pathname === '/api/guides/profiles/' && method === 'GET') {
    return mockGuides
  }
  const guideMatch = pathname.match(/^\/api\/guides\/profiles\/(\d+)\/$/)
  if (guideMatch && method === 'GET') {
    const id = Number(guideMatch[1])
    return mockGuides.find((g) => g.id === id) || { detail: 'Not found' }
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
      bus_trips: mockBusTrips.filter((t) => textMatch(t.route_detail.origin, qq) || textMatch(t.route_detail.destination, qq)).slice(0, 8),
      events: mockEvents.filter((e) => textMatch(e.title, qq) || textMatch(e.region, qq)).slice(0, 8),
      food: mockFood.filter((f) => textMatch(f.name, qq) || textMatch(f.region, qq)).slice(0, 8),
      guides: mockGuides.filter((g) => textMatch(g.headline, qq)).slice(0, 8),
      posts: withMeFlags(s, s.posts).filter((p) => textMatch(p.body, qq) || textMatch(p.region, qq)).slice(0, 8),
    }
  }

  // Default: return something safe to keep UI from exploding in mock mode
  return { detail: `Mock: unhandled ${method} ${pathname}` }
}

