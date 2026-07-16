import { mockStays, mockGuides, mockVehicles, mockFood } from '../mocks/mockData'
import type { ProviderFoodVenue } from '../components/provider/food/foodVenueTypes'
import type { ProviderBusTripListing } from '../components/provider/transport/busTripListingTypes'
import type { ProviderVehicleListing } from '../components/provider/transport/vehicleListingTypes'
import type { TourPackage } from '../components/guide/types'
import { mocksEnabled } from '../utils/useMocks'
import type { EventListing } from '../utils/eventDisplay'

export type ListingCategory = 'Stay' | 'Guide' | 'Transport' | 'Food' | 'Event' | 'Shop'
export type ListingStatus = 'published' | 'draft' | 'needs_update' | 'pending_review' | 'suspended'

export type ProviderListing = {
  id: string
  title: string
  category: ListingCategory
  status: ListingStatus
  city: string
  region: string
  price: string
  rating: string
  ratingCount: number
  bookings: number
  views: number
  updated: string
  healthIssue?: string
  image: string | null
  publicPath: string
  editPath: string
}

export type ProviderBooking = {
  id: number
  guest: string
  guestUsername: string
  guestInitial: string
  service: string
  category: ListingCategory
  date: string
  guests?: number
  status: string
  total: number
  paymentStatus?: string
  requestedAt?: string
  source?: string
}

export type AttentionHints = {
  unreadMessages?: number
  unansweredQuestions?: number
}

export type AttentionItem = {
  id: string
  label: string
  count?: number
  priority: 'high' | 'medium' | 'low'
  actionLabel: string
  actionTo: string
}

export type HealthItem = {
  id: string
  listing: string
  issue: string
  priority: 'high' | 'medium' | 'low'
  actionLabel: string
  actionTo: string
}

function demoSeed(id: number | string): number {
  if (typeof id === 'number') return id
  return id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

function demoViews(seed: number | string) {
  const n = demoSeed(seed)
  return 40 + (n % 120)
}

function demoBookings(seed: number | string) {
  const n = demoSeed(seed)
  return n % 8
}

export type StayListingApi = {
  id: number
  title: string
  city?: string
  region: string
  price_per_night: string
  cover_image: string | null
  rating_avg?: string
  rating_count?: number
  is_active?: boolean
  likes_count?: number
  saves_count?: number
  description?: string
}

export function stayToProviderListing(s: StayListingApi, bookingCount = 0): ProviderListing {
  const likes = s.likes_count ?? 0
  const saves = s.saves_count ?? 0
  const engagement = bookingCount + likes + saves
  return {
    id: `stay-${s.id}`,
    title: s.title,
    category: 'Stay',
    status: s.is_active === false ? 'draft' : s.cover_image ? 'published' : 'needs_update',
    city: s.city ?? '',
    region: s.region,
    price: `N$${s.price_per_night}/night`,
    rating: s.rating_avg ?? '—',
    ratingCount: s.rating_count ?? 0,
    bookings: bookingCount,
    views: engagement > 0 ? engagement * 3 : mocksEnabled() ? demoViews(s.id) : 0,
    updated: 'Recently',
    healthIssue: !s.cover_image
      ? 'Missing cover photo'
      : (s.description?.length ?? 0) < 40
        ? 'Description too short'
        : undefined,
    image: s.cover_image,
    publicPath: `/accommodation/${s.id}`,
    editPath: '/provider/stays',
  }
}

export function eventToProviderListing(
  e: EventListing & { is_published?: boolean; external_ticket_clicks?: number },
): ProviderListing {
  const engagement =
    (e.rsvp_count ?? 0) + (e.likes_count ?? 0) + (e.saves_count ?? 0) + (e.external_ticket_clicks ?? 0)
  return {
    id: `event-${e.id}`,
    title: e.title,
    category: 'Event',
    status: e.is_published === false ? 'draft' : e.cover_image ? 'published' : 'needs_update',
    city: e.city ?? e.venue ?? '',
    region: e.region ?? '',
    price: e.is_free ? 'Free' : e.price ? `N$${e.price}` : 'Paid',
    rating: '—',
    ratingCount: 0,
    bookings: e.rsvp_count ?? 0,
    views: engagement > 0 ? engagement : mocksEnabled() ? demoViews(e.id) : 0,
    updated: 'Recently',
    healthIssue: !e.cover_image ? 'Add event poster' : undefined,
    image: e.cover_image,
    publicPath: `/events/${e.id}`,
    editPath: `/events/${e.id}/edit`,
  }
}

export function foodVenueToProviderListing(v: ProviderFoodVenue, bookingCount = 0): ProviderListing {
  const cover = v.cover_image ?? v.photos?.find((p) => p.is_cover)?.image ?? v.photos?.[0]?.image ?? null
  const engagement = bookingCount + (v.rating_count ?? 0)
  return {
    id: `food-${v.id}`,
    title: v.name,
    category: 'Food',
    status: v.is_active === false ? 'draft' : cover ? 'published' : 'needs_update',
    city: v.city,
    region: v.region,
    price: 'Reservations',
    rating: v.rating_avg ?? '—',
    ratingCount: v.rating_count ?? 0,
    bookings: bookingCount,
    views: engagement > 0 ? engagement * 2 : mocksEnabled() ? demoViews(v.id) : 0,
    updated: 'Recently',
    healthIssue: !cover ? 'Venue missing photos' : undefined,
    image: cover,
    publicPath: `/food/${v.id}`,
    editPath: `/provider/food/${v.id}`,
  }
}

export function vehicleToProviderListing(v: ProviderVehicleListing, bookingCount = 0): ProviderListing {
  const engagement = bookingCount
  return {
    id: `vehicle-${v.id}`,
    title: v.title,
    category: 'Transport',
    status: v.is_active === false ? 'draft' : v.cover_image ? 'published' : 'needs_update',
    city: v.city,
    region: v.region,
    price: `N$${v.price_per_day}/day`,
    rating: '—',
    ratingCount: 0,
    bookings: bookingCount,
    views: engagement > 0 ? engagement * 3 : mocksEnabled() ? demoViews(v.id) : 0,
    updated: 'Recently',
    healthIssue: !v.cover_image ? 'Vehicle missing photos' : undefined,
    image: v.cover_image,
    publicPath: `/transport/vehicle/${v.id}`,
    editPath: '/provider/transport',
  }
}

export function busTripToProviderListing(t: ProviderBusTripListing): ProviderListing {
  const route = t.route_detail
  const title = `${route.origin} → ${route.destination}`
  const cover = route.cover_image ?? route.gallery_images?.[0] ?? null
  return {
    id: `bus-${t.id}`,
    title,
    category: 'Transport',
    status: t.is_active === false ? 'draft' : cover ? 'published' : 'needs_update',
    city: route.origin,
    region: route.origin,
    price: t.price ? `N$${t.price}` : 'Per seat',
    rating: '—',
    ratingCount: 0,
    bookings: 0,
    views: mocksEnabled() ? demoViews(t.id) : 0,
    updated: 'Recently',
    healthIssue: !cover ? 'Trip missing cover image' : undefined,
    image: cover,
    publicPath: `/transport/bus/${t.id}`,
    editPath: '/provider/transport',
  }
}

export function guidePackageToProviderListing(
  guideId: number,
  pkg: TourPackage,
  opts: { regions?: string[]; guidePhoto?: string | null; rating?: string; ratingCount?: number; isActive?: boolean },
  bookingCount = 0,
): ProviderListing {
  const region = opts.regions?.[0] ?? 'Namibia'
  const city = opts.regions?.[1] ?? region
  const photo = pkg.photo ?? opts.guidePhoto ?? null
  return {
    id: `guide-${guideId}-${pkg.id}`,
    title: pkg.title,
    category: 'Guide',
    status: opts.isActive === false ? 'draft' : photo ? 'published' : 'needs_update',
    city,
    region,
    price: pkg.price ? `N$${pkg.price}/person` : 'On request',
    rating: opts.rating ?? '—',
    ratingCount: opts.ratingCount ?? 0,
    bookings: bookingCount,
    views: bookingCount > 0 ? bookingCount * 4 : mocksEnabled() ? demoViews(pkg.id) : 0,
    updated: 'Recently',
    healthIssue: !photo ? 'Add package photo' : undefined,
    image: photo,
    publicPath: `/guides/${guideId}`,
    editPath: '/provider/guides',
  }
}

export function getProviderMockListings(owner?: string): ProviderListing[] {
  if (!owner) return []

  const stays = mockStays
    .filter((s) => s.owner_username === owner)
    .map((s) => ({
      id: `stay-${s.id}`,
      title: s.title,
      category: 'Stay' as const,
      status: s.cover_image ? ('published' as const) : ('needs_update' as const),
      city: s.city,
      region: s.region,
      price: `N$${s.price_per_night}/night`,
      rating: s.rating_avg,
      ratingCount: s.rating_count,
      bookings: demoBookings(s.id),
      views: demoViews(s.id),
      updated: '2 days ago',
      healthIssue: !s.cover_image
        ? 'Missing cover photo'
        : (s.description?.length ?? 0) < 40
          ? 'Description too short'
          : undefined,
      image: s.cover_image,
      publicPath: `/accommodation/${s.id}`,
      editPath: '/provider/stays',
    }))

  const guides = mockGuides
    .filter((g) => g.username === owner)
    .flatMap((g) =>
      (g.tour_packages ?? []).map((pkg) => ({
        id: `guide-${g.id}-${pkg.id}`,
        title: pkg.title,
        category: 'Guide' as const,
        status: pkg.photo ? ('published' as const) : ('needs_update' as const),
        city: g.regions?.[0] ?? 'Namibia',
        region: g.regions?.[1] ?? '',
        price: `N$${pkg.price}/person`,
        rating: String(g.rating_avg),
        ratingCount: g.rating_count,
        bookings: demoBookings(pkg.id),
        views: demoViews(pkg.id),
        updated: '4 days ago',
        healthIssue: !pkg.photo ? 'Add package photo' : undefined,
        image: pkg.photo ?? g.photo ?? null,
        publicPath: `/guides/${g.id}`,
        editPath: '/provider/guides',
      })),
    )

  const vehicles = mockVehicles
    .filter((v) => v.owner_username === owner)
    .map((v) => ({
      id: `vehicle-${v.id}`,
      title: v.title,
      category: 'Transport' as const,
      status: v.cover_image ? ('published' as const) : ('needs_update' as const),
      city: v.city,
      region: v.region,
      price: `N$${v.price_per_day}/day`,
      rating: '—',
      ratingCount: 0,
      bookings: demoBookings(v.id),
      views: demoViews(v.id),
      updated: '1 week ago',
      healthIssue: !v.cover_image ? 'Vehicle missing photos' : undefined,
      image: v.cover_image,
      publicPath: `/transport/vehicle/${v.id}`,
      editPath: '/provider/transport',
    }))

  const food = mockFood
    .filter((f) => f.owner_username === owner)
    .map((f) => ({
      id: `food-${f.id}`,
      title: f.name,
      category: 'Food' as const,
      status: f.cover_image ? ('published' as const) : ('needs_update' as const),
      city: f.city,
      region: f.region,
      price: 'Reservations',
      rating: f.rating_avg,
      ratingCount: f.rating_count,
      bookings: demoBookings(f.id),
      views: demoViews(f.id),
      updated: '3 days ago',
      healthIssue: !f.cover_image ? 'Venue missing photos' : undefined,
      image: f.cover_image,
      publicPath: `/food/${f.id}`,
      editPath: `/provider/food/${v.id}`,
    }))

  return [...stays, ...guides, ...vehicles, ...food]
}

export function getProviderListings(
  owner?: string,
  apiEvents: EventListing[] = [],
  apiStays: StayListingApi[] = [],
  stayBookingCounts?: Map<string, number>,
  extraListings: ProviderListing[] = [],
): ProviderListing[] {
  const fromApi = [
    ...apiStays.map((s) => stayToProviderListing(s, stayBookingCounts?.get(s.title) ?? 0)),
    ...apiEvents.map((e) => eventToProviderListing(e)),
    ...extraListings,
  ]
  if (!mocksEnabled()) {
    return fromApi
  }
  let mock = getProviderMockListings(owner)
  if (apiEvents.length > 0) {
    mock = mock.filter((l) => l.category !== 'Event')
  }
  if (apiStays.length > 0) {
    mock = mock.filter((l) => l.category !== 'Stay')
  }
  if (extraListings.some((l) => l.category === 'Guide')) {
    mock = mock.filter((l) => l.category !== 'Guide')
  }
  if (extraListings.some((l) => l.category === 'Transport')) {
    mock = mock.filter((l) => l.category !== 'Transport')
  }
  if (extraListings.some((l) => l.category === 'Food')) {
    mock = mock.filter((l) => l.category === 'Food')
  }
  if (!owner) return [...mock, ...fromApi]
  return [...mock, ...fromApi]
}

const DEMO_BOOKINGS: ProviderBooking[] = [
  { id: 1, guest: 'Anna K.', guestUsername: 'anna', guestInitial: 'A', service: 'Freesia Hotel', category: 'Stay', date: '2026-05-10', guests: 2, status: 'confirmed', total: 1050, paymentStatus: 'paid', requestedAt: '2026-04-28' },
  { id: 2, guest: 'James O.', guestUsername: 'james', guestInitial: 'J', service: 'Desert sunrise tour', category: 'Guide', date: '2026-05-14', guests: 4, status: 'requested', total: 340, paymentStatus: 'pending', requestedAt: '2026-05-01' },
  { id: 3, guest: 'Maria S.', guestUsername: 'maria', guestInitial: 'M', service: 'Toyota Hilux 4×4', category: 'Transport', date: '2026-05-20', guests: 2, status: 'reserved', total: 1800, paymentStatus: 'pending', requestedAt: '2026-04-30' },
  { id: 4, guest: 'Tobias L.', guestUsername: 'tobias', guestInitial: 'T', service: 'Oryx Grill House', category: 'Food', date: '2026-06-01', guests: 6, status: 'confirmed', total: 0, paymentStatus: 'n/a', requestedAt: '2026-05-10' },
  { id: 5, guest: 'Priya N.', guestUsername: 'priya', guestInitial: 'P', service: 'Coastal Guesthouse', category: 'Stay', date: '2026-05-22', guests: 3, status: 'pending', total: 720, paymentStatus: 'pending', requestedAt: '2026-05-05' },
]

export function getProviderBookings(): ProviderBooking[] {
  return mocksEnabled() ? DEMO_BOOKINGS : []
}

export function getAttentionItems(
  listings: ProviderListing[],
  bookings: ProviderBooking[],
  hints: AttentionHints = {},
): AttentionItem[] {
  const pending = bookings.filter((b) =>
    ['requested', 'pending', 'reserved'].includes(b.status),
  ).length
  const needsUpdate = listings.filter((l) => l.status === 'needs_update' || l.healthIssue).length
  const noAvailability = listings.filter((l) => l.category === 'Stay').length > 0 ? 1 : 0

  const items: AttentionItem[] = []
  if (pending > 0) {
    items.push({
      id: 'pending-bookings',
      label: `${pending} booking${pending === 1 ? '' : 's'} waiting for confirmation`,
      count: pending,
      priority: 'high',
      actionLabel: 'Manage bookings',
      actionTo: '/provider/bookings',
    })
  }
  const unread = hints.unreadMessages ?? 0
  if (unread > 0) {
    items.push({
      id: 'messages',
      label: `${unread} message${unread === 1 ? '' : 's'} need${unread === 1 ? 's' : ''} replies`,
      count: unread,
      priority: 'high',
      actionLabel: 'Open inbox',
      actionTo: '/provider/messages',
    })
  } else if (mocksEnabled()) {
    items.push({
      id: 'messages',
      label: '2 messages need replies',
      count: 2,
      priority: 'high',
      actionLabel: 'Open inbox',
      actionTo: '/provider/messages',
    })
  }
  if (needsUpdate > 0) {
    items.push({
      id: 'listings-update',
      label: `${needsUpdate} listing${needsUpdate === 1 ? '' : 's'} need updates`,
      count: needsUpdate,
      priority: 'medium',
      actionLabel: 'Review listings',
      actionTo: '/provider/listings',
    })
  }
  const unanswered = hints.unansweredQuestions ?? 0
  if (unanswered > 0) {
    items.push({
      id: 'questions',
      label: `${unanswered} listing question${unanswered === 1 ? '' : 's'} unanswered`,
      count: unanswered,
      priority: 'medium',
      actionLabel: 'Answer questions',
      actionTo: '/provider/questions',
    })
  } else if (mocksEnabled()) {
    items.push({
      id: 'reviews',
      label: '2 reviews need responses',
      count: 2,
      priority: 'medium',
      actionLabel: 'View reviews',
      actionTo: '/provider/reviews',
    })
  }
  if (noAvailability > 0) {
    items.push({
      id: 'availability',
      label: 'Update availability for this weekend',
      priority: 'medium',
      actionLabel: 'Update availability',
      actionTo: '/provider/stays',
    })
  }
  return items
}

export function getHealthItems(listings: ProviderListing[]): HealthItem[] {
  return listings
    .filter((l) => l.healthIssue)
    .map((l) => ({
      id: l.id,
      listing: l.title,
      issue: l.healthIssue!,
      priority: l.status === 'needs_update' ? ('high' as const) : ('medium' as const),
      actionLabel: 'Fix issue',
      actionTo: l.editPath,
    }))
}

export function getListingStats(listings: ProviderListing[]) {
  return {
    total: listings.length,
    published: listings.filter((l) => l.status === 'published').length,
    needsUpdate: listings.filter((l) => l.status === 'needs_update' || l.healthIssue).length,
    drafts: listings.filter((l) => l.status === 'draft').length,
  }
}

export function getBookingStats(bookings: ProviderBooking[]) {
  const pending = bookings.filter((b) => ['requested', 'pending', 'reserved'].includes(b.status)).length
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const completed = bookings.filter((b) => b.status === 'completed' || b.status === 'checked_out').length
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length
  const revenue = bookings
    .filter((b) => !['cancelled', 'refunded'].includes(b.status))
    .reduce((s, b) => s + b.total, 0)
  return { pending, confirmed, completed, cancelled, revenue, total: bookings.length }
}
