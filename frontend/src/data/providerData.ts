import { mockStays, mockGuides, mockVehicles, mockFood, mockEvents } from '../mocks/mockData'

export type ListingCategory = 'Stay' | 'Guide' | 'Transport' | 'Food' | 'Event'
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
  guestInitial: string
  service: string
  category: ListingCategory
  date: string
  status: string
  total: number
  paymentStatus?: string
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

export function getProviderListings(owner?: string): ProviderListing[] {
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
      editPath: '/provider/food',
    }))

  const events = mockEvents
    .filter((e) => e.organizer_username === owner)
    .map((e) => ({
      id: `event-${e.id}`,
      title: e.title,
      category: 'Event' as const,
      status: e.cover_image ? ('published' as const) : ('draft' as const),
      city: e.venue,
      region: '',
      price: e.is_free ? 'Free' : e.price ? `N$${e.price}` : 'Paid',
      rating: '—',
      ratingCount: 0,
      bookings: demoBookings(e.id),
      views: demoViews(e.id),
      updated: '5 days ago',
      healthIssue: !e.cover_image ? 'Add event poster' : undefined,
      image: e.cover_image,
      publicPath: `/events/${e.id}`,
      editPath: '/events/new',
    }))

  return [...stays, ...guides, ...vehicles, ...food, ...events]
}

const DEMO_BOOKINGS: ProviderBooking[] = [
  { id: 1, guest: 'Anna K.', guestInitial: 'A', service: 'Freesia Hotel', category: 'Stay', date: '2026-05-10', status: 'confirmed', total: 1050, paymentStatus: 'paid' },
  { id: 2, guest: 'James O.', guestInitial: 'J', service: 'Desert sunrise tour', category: 'Guide', date: '2026-05-14', status: 'requested', total: 340, paymentStatus: 'pending' },
  { id: 3, guest: 'Maria S.', guestInitial: 'M', service: 'Toyota Hilux 4×4', category: 'Transport', date: '2026-05-20', status: 'reserved', total: 1800, paymentStatus: 'pending' },
  { id: 4, guest: 'Tobias L.', guestInitial: 'T', service: 'Oryx Grill House', category: 'Food', date: '2026-06-01', status: 'confirmed', total: 0, paymentStatus: 'n/a' },
  { id: 5, guest: 'Priya N.', guestInitial: 'P', service: 'Coastal Guesthouse', category: 'Stay', date: '2026-05-22', status: 'pending', total: 720, paymentStatus: 'pending' },
]

export function getProviderBookings(_owner?: string): ProviderBooking[] {
  return DEMO_BOOKINGS
}

export function getAttentionItems(listings: ProviderListing[], bookings: ProviderBooking[]): AttentionItem[] {
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
  items.push({
    id: 'messages',
    label: '2 messages need replies',
    count: 2,
    priority: 'high',
    actionLabel: 'Open inbox',
    actionTo: '/messages',
  })
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
  items.push({
    id: 'reviews',
    label: '2 reviews need responses',
    count: 2,
    priority: 'medium',
    actionLabel: 'View reviews',
    actionTo: '/provider/reviews',
  })
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
