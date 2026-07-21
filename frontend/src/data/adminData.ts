export type AdminBooking = {
  id: string
  customer: string
  provider: string
  category: 'Stay' | 'Guide' | 'Transport' | 'Food' | 'Event'
  service: string
  date: string
  status: string
  paymentStatus: string
  amount: number
  issue?: string
}

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

export type AdminActivity = {
  id: number
  text: string
  time: string
  type: 'user' | 'business' | 'booking' | 'report' | 'listing' | 'review'
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

export const DEMO_ADMIN_BOOKINGS: AdminBooking[] = [
  { id: 'BK-1042', customer: 'Anna K.', provider: 'Freesia Hotel', category: 'Stay', service: 'Standard king room', date: '2026-05-10', status: 'confirmed', paymentStatus: 'paid', amount: 1050 },
  { id: 'BK-1043', customer: 'James O.', provider: 'Kaoko Safari Guides', category: 'Guide', service: 'Desert sunrise tour', date: '2026-05-14', status: 'pending', paymentStatus: 'unpaid', amount: 340 },
  { id: 'BK-1044', customer: 'Maria S.', provider: 'Namibia Wheels', category: 'Transport', service: 'Toyota Hilux 4×4', date: '2026-05-20', status: 'disputed', paymentStatus: 'paid', amount: 1800, issue: 'Customer dispute' },
  { id: 'BK-1045', customer: 'Tobias L.', provider: 'Oryx Grill House', category: 'Food', service: 'Dinner reservation', date: '2026-06-01', status: 'confirmed', paymentStatus: 'n/a', amount: 0 },
  { id: 'BK-1046', customer: 'Priya N.', provider: 'Coastal Guesthouse', category: 'Stay', service: 'Courtyard twin', date: '2026-05-22', status: 'cancelled', paymentStatus: 'refunded', amount: 720, issue: 'Refund requested' },
  { id: 'BK-1047', customer: 'Sam W.', provider: 'Windhoek Events Co.', category: 'Event', service: 'Night Market ticket', date: '2026-05-18', status: 'confirmed', paymentStatus: 'failed', amount: 150, issue: 'Payment failed' },
]

export const DEMO_ADMIN_REPORTS: AdminReport[] = [
  { id: 1, type: 'Post', item: 'Delvers photo — dune sunset', reporter: 'user_42', reason: 'Spam / misleading location', status: 'new', date: '2026-06-02', severity: 'medium' },
  { id: 2, type: 'Comment', item: 'Reply on community thread', reporter: 'demo_user', reason: 'Harassment', status: 'under_review', date: '2026-06-01', severity: 'high' },
  { id: 3, type: 'Business', item: 'Desert Lodge Co.', reporter: 'stays_host', reason: 'Fake verification documents', status: 'escalated', date: '2026-05-30', severity: 'critical' },
  { id: 4, type: 'Listing', item: 'Unlisted safari vehicle', reporter: 'guide_mgr', reason: 'Safety concern', status: 'new', date: '2026-05-29', severity: 'high' },
]

export const DEMO_ADMIN_ACTIVITY: AdminActivity[] = [
  { id: 1, text: 'New user registered — @traveler_nam', time: '12 min ago', type: 'user' },
  { id: 2, text: 'Coastal Vibes submitted business verification', time: '1h ago', type: 'business' },
  { id: 3, text: 'Booking BK-1042 confirmed — Freesia Hotel', time: '2h ago', type: 'booking' },
  { id: 4, text: 'Post reported — spam / misleading location', time: '3h ago', type: 'report' },
  { id: 5, text: 'Kaoko Safari Guides updated tour package', time: '5h ago', type: 'listing' },
  { id: 6, text: 'New review on Oryx Grill House (5★)', time: '6h ago', type: 'review' },
]

export const DEMO_CONTENT_REVIEW: AdminContentItem[] = [
  { id: 1, type: 'Delvers post', title: 'Dune sunset panorama', author: '@photo_nam', status: 'reported', reports: 2, date: '2026-06-02' },
  { id: 2, type: 'Journey', title: 'Namibia overland route', author: '@demo_user', status: 'published', reports: 0, date: '2026-06-01' },
  { id: 3, type: 'Community', title: 'Best campsites near Sossusvlei?', author: '@jonas_k', status: 'needs_review', reports: 1, date: '2026-05-31' },
]

export const DEMO_ANALYTICS = {
  newUsersWeek: 12,
  activeUsers: 248,
  providerGrowth: 4,
  bookingsByCategory: [
    { label: 'Stays', value: 42, pct: 45 },
    { label: 'Guides', value: 18, pct: 19 },
    { label: 'Transport', value: 15, pct: 16 },
    { label: 'Food', value: 12, pct: 13 },
    { label: 'Events', value: 7, pct: 7 },
  ],
  revenueMonth: 184200,
  reportedTrend: 4,
}

export function getBookingStats(bookings: AdminBooking[]) {
  return {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    pending: bookings.filter((b) => b.status === 'pending' || b.status === 'requested').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    refunded: bookings.filter((b) => b.paymentStatus === 'refunded').length,
    disputed: bookings.filter((b) => b.status === 'disputed').length,
    failedPayments: bookings.filter((b) => b.paymentStatus === 'failed').length,
    revenue: bookings.filter((b) => b.paymentStatus === 'paid').reduce((s, b) => s + b.amount, 0),
  }
}

export function userStatusLabel(u: { is_active: boolean; is_staff: boolean; user_type: string }): string {
  if (!u.is_active) return 'Suspended'
  if (u.is_staff) return 'Admin'
  if (u.user_type === 'service_provider') return 'Provider'
  return 'Traveller'
}

export function userStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'Active' || status === 'Traveller') return 'success'
  if (status === 'Provider') return 'info'
  if (status === 'Admin') return 'neutral'
  if (status === 'Suspended' || status === 'Flagged') return 'danger'
  if (status === 'Pending verification') return 'warning'
  return 'neutral'
}

export function verificationVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'verified') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected' || status === 'suspended') return 'danger'
  if (status === 'unverified') return 'neutral'
  return 'info'
}
