import type { ActivityItem, AdminBooking, AdminListing } from '../api/types'

export type AdminReport = {
  id: number
  type: string
  item: string
  reporter: string
  reason: string
  status: string
  date: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export type AdminContentItem = {
  id: number
  type: string
  title: string
  author: string
  status: string
  reports: number
  date: string
}

export const DEMO_REPORTS: AdminReport[] = [
  { id: 1, type: 'Post', item: 'Delvers photo — dune sunset', reporter: 'user_42', reason: 'Spam / misleading location', status: 'new', date: '2026-06-02', severity: 'medium' },
  { id: 2, type: 'Comment', item: 'Reply on community thread', reporter: 'demo_user', reason: 'Harassment', status: 'under_review', date: '2026-06-01', severity: 'high' },
  { id: 3, type: 'Business', item: 'Desert Lodge Co.', reporter: 'stays_host', reason: 'Fake verification documents', status: 'escalated', date: '2026-05-30', severity: 'critical' },
  { id: 4, type: 'Listing', item: 'Unlisted safari vehicle', reporter: 'guide_pro', reason: 'Safety concern', status: 'new', date: '2026-05-29', severity: 'high' },
]

export const DEMO_BOOKINGS: AdminBooking[] = [
  {
    id: 'accommodation:1042',
    booking_type: 'accommodation',
    booking_id: 1042,
    customer_username: 'demo_user',
    provider_username: 'stays_host',
    listing_title: 'Freesia Hotel — Standard king room',
    status: 'confirmed',
    total_price: '1850',
    start_date: '2026-05-10',
    end_date: '2026-05-12',
    created_at: '2026-05-01T10:00:00Z',
    has_dispute_notes: false,
  },
  {
    id: 'guide:1043',
    booking_type: 'guide',
    booking_id: 1043,
    customer_username: 'demo_user',
    provider_username: 'guide_pro',
    listing_title: 'Desert sunrise tour',
    status: 'pending',
    total_price: '650',
    start_date: '2026-05-14',
    end_date: '',
    created_at: '2026-05-02T14:00:00Z',
    has_dispute_notes: false,
  },
  {
    id: 'guide:1047',
    booking_type: 'guide',
    booking_id: 1047,
    customer_username: 'demo_user',
    provider_username: 'guide_mgr',
    listing_title: 'Dune half-day · Desert Footprints Tours',
    status: 'pending',
    total_price: '2800',
    start_date: '2026-07-08',
    end_date: '',
    created_at: '2026-06-05T10:00:00Z',
    has_dispute_notes: false,
  },
  {
    id: 'vehicle:1044',
    booking_type: 'vehicle',
    booking_id: 1044,
    customer_username: 'demo_user',
    provider_username: 'transport_mgr',
    listing_title: 'Toyota Hilux 4×4',
    status: 'confirmed',
    total_price: '2400',
    start_date: '2026-05-20',
    end_date: '2026-05-23',
    created_at: '2026-05-05T09:00:00Z',
    has_dispute_notes: true,
  },
  {
    id: 'bus_seat:1045',
    booking_type: 'bus_seat',
    booking_id: 1045,
    customer_username: 'demo_user',
    provider_username: 'transport_mgr',
    listing_title: 'Windhoek → Swakopmund (seat 12)',
    status: 'confirmed',
    total_price: '350',
    start_date: '2026-06-01T06:00:00Z',
    end_date: '2026-06-01T12:00:00Z',
    created_at: '2026-05-28T11:00:00Z',
    has_dispute_notes: false,
  },
  {
    id: 'food:1046',
    booking_type: 'food',
    booking_id: 1046,
    customer_username: 'demo_user',
    provider_username: 'food_mgr',
    listing_title: 'Savanna Table',
    status: 'pending',
    total_price: '',
    start_date: '2026-06-02T19:00:00Z',
    end_date: '',
    created_at: '2026-05-30T16:00:00Z',
    has_dispute_notes: false,
  },
]

export const DEMO_LISTINGS: AdminListing[] = [
  {
    id: 'accommodation:1',
    listing_type: 'accommodation',
    listing_id: 1,
    title: 'Freesia Hotel',
    owner_username: 'stays_host',
    region: 'Khomas',
    city: 'Windhoek',
    status: 'published',
    price_label: 'N$850/night',
    category_label: 'Stay',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'guide:2',
    listing_type: 'guide',
    listing_id: 2,
    title: 'Kaoko Safari Guides',
    owner_username: 'guide_pro',
    region: 'Erongo',
    city: 'Swakopmund',
    status: 'published',
    price_label: 'N$450/hr',
    category_label: 'Guide',
    created_at: '2026-02-01T08:00:00Z',
  },
  {
    id: 'guide:7',
    listing_type: 'guide',
    listing_id: 7,
    title: 'Desert Footprints Tours',
    owner_username: 'guide_mgr',
    region: 'Erongo',
    city: 'Swakopmund',
    status: 'published',
    price_label: 'N$420/hr',
    category_label: 'Guide',
    created_at: '2026-06-05T08:00:00Z',
  },
  {
    id: 'vehicle:3',
    listing_type: 'vehicle',
    listing_id: 3,
    title: 'Toyota Hilux 4×4',
    owner_username: 'transport_mgr',
    region: 'Khomas',
    city: 'Windhoek',
    status: 'published',
    price_label: 'N$800/day',
    category_label: 'Vehicle rental',
    created_at: '2026-02-15T08:00:00Z',
  },
  {
    id: 'bus_trip:301',
    listing_type: 'bus_trip',
    listing_id: 301,
    title: 'Windhoek → Oshakati',
    owner_username: 'transport_mgr',
    region: 'Khomas',
    city: 'Windhoek',
    status: 'published',
    price_label: 'N$240',
    category_label: 'Bus trip',
    created_at: '2026-02-20T08:00:00Z',
  },
  {
    id: 'food:4',
    listing_type: 'food',
    listing_id: 4,
    title: 'Oryx Grill House',
    owner_username: 'stays_host',
    region: 'Khomas',
    city: 'Windhoek',
    status: 'published',
    price_label: '$$',
    category_label: 'Food & drink',
    created_at: '2026-03-01T08:00:00Z',
  },
  {
    id: 'food:6',
    listing_type: 'food',
    listing_id: 6,
    title: 'Savanna Table',
    owner_username: 'food_mgr',
    region: 'Khomas',
    city: 'Windhoek',
    status: 'published',
    price_label: '$$',
    category_label: 'Food · Local cuisine',
    created_at: '2026-06-04T08:00:00Z',
  },
  {
    id: 'event:5',
    listing_type: 'event',
    listing_id: 5,
    title: 'Windhoek Jazz Night',
    owner_username: 'guide_pro',
    region: 'Khomas',
    city: 'Windhoek',
    status: 'published',
    price_label: '',
    category_label: 'Event',
    created_at: '2026-04-01T08:00:00Z',
  },
  {
    id: 'journey:1001',
    listing_type: 'journey',
    listing_id: 1001,
    title: 'Windhoek → Sossusvlei → Swakopmund',
    owner_username: 'kaoko_explorer',
    region: 'Hardap',
    city: '',
    status: 'published',
    price_label: 'N$8400',
    category_label: 'Journey',
    created_at: '2026-03-10T08:00:00Z',
  },
  {
    id: 'post:12',
    listing_type: 'post',
    listing_id: 12,
    title: 'Dune sunset panorama',
    owner_username: 'demo_user',
    region: 'Hardap',
    city: '',
    status: 'published',
    price_label: '',
    category_label: 'Delvers post',
    created_at: '2026-06-02T08:00:00Z',
  },
  {
    id: 'community:8',
    listing_type: 'community',
    listing_id: 8,
    title: 'Best campsites near Sossusvlei?',
    owner_username: 'demo_user',
    region: 'Hardap',
    city: '',
    status: 'published',
    price_label: '',
    category_label: 'Community post',
    created_at: '2026-05-31T08:00:00Z',
  },
  {
    id: 'post:99',
    listing_type: 'post',
    listing_id: 99,
    title: 'Misleading tour photos',
    owner_username: 'spam_account',
    region: 'Erongo',
    city: '',
    status: 'unpublished',
    price_label: '',
    category_label: 'Delvers post',
    created_at: '2026-05-20T08:00:00Z',
  },
]

export const DEMO_ACTIVITY: ActivityItem[] = [
  { id: 1, text: 'New user registered — @traveler_nam', time: '12 min ago', type: 'user' },
  { id: 2, text: 'Coastal Vibes submitted business verification', time: '1h ago', type: 'business' },
  { id: 3, text: 'Booking BK-1042 confirmed — Freesia Hotel', time: '2h ago', type: 'booking' },
  { id: 4, text: 'Post reported — spam / misleading location', time: '3h ago', type: 'report' },
  { id: 5, text: 'Kaoko Safari Guides updated tour package', time: '5h ago', type: 'listing' },
  { id: 6, text: 'Account suspended — @spam_account', time: '8h ago', type: 'system' },
]

export const DEMO_CONTENT: AdminContentItem[] = [
  { id: 1, type: 'Delvers post', title: 'Dune sunset panorama', author: '@photo_nam', status: 'reported', reports: 2, date: '2026-06-02' },
  { id: 2, type: 'Community', title: 'Best campsites near Sossusvlei?', author: '@jonas_k', status: 'needs_review', reports: 1, date: '2026-05-31' },
]

export const DEMO_ANALYTICS = {
  newUsersWeek: 12,
  bookingsByCategory: [
    { label: 'Stays', value: 42, pct: 45 },
    { label: 'Guides', value: 18, pct: 19 },
    { label: 'Transport', value: 15, pct: 16 },
    { label: 'Food', value: 12, pct: 13 },
  ],
}

export function demoAnalytics(days: number) {
  const signups: { date: string; count: number }[] = []
  const bookings: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    signups.push({ date: iso, count: Math.floor(Math.random() * 4) + (i % 7 === 0 ? 3 : 0) })
    bookings.push({ date: iso, count: Math.floor(Math.random() * 6) + (i % 5 === 0 ? 2 : 0) })
  }
  return {
    days,
    signups,
    bookings,
    bookings_by_vertical: { stays: 42, guides: 18, transport: 15 },
    verification_funnel: { unverified: 8, pending: 3, verified: 12, rejected: 2 },
    totals: {
      signups: signups.reduce((n, p) => n + p.count, 0),
      bookings: 75,
    },
  }
}

export function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  const s = status.toLowerCase()
  if (['verified', 'confirmed', 'active', 'resolved'].includes(s)) return 'success'
  if (['pending', 'under_review', 'needs_review', 'requested'].includes(s)) return 'warning'
  if (['rejected', 'suspended', 'disputed', 'escalated', 'critical', 'reported'].includes(s)) return 'danger'
  if (['new', 'info'].includes(s)) return 'info'
  return 'neutral'
}

export function severityVariant(severity: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (severity === 'critical' || severity === 'high') return 'danger'
  if (severity === 'medium') return 'warning'
  return 'neutral'
}

export function userStatusLabel(u: { is_active: boolean; is_staff: boolean; user_type: string }): string {
  if (!u.is_active) return 'Suspended'
  if (u.is_staff) return 'Admin'
  if (u.user_type === 'service_provider') return 'Provider'
  return 'Traveller'
}

export function userStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'Active' || status === 'Traveller' || status === 'Provider') return 'success'
  if (status === 'Admin') return 'info'
  if (status === 'Suspended') return 'danger'
  if (status === 'Pending verification') return 'warning'
  return 'neutral'
}
