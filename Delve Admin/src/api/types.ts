export type PlatformOverview = {
  users: number
  providers: number
  businesses: number
  businesses_pending: number
  listings: number
  listings_stays: number
  listings_guides: number
  listings_transport: number
  listings_food: number
  listings_events?: number
  listings_posts?: number
  bookings: number
  bookings_pending: number
  bookings_stays: number
  bookings_guides: number
  bookings_transport: number
  reports_open?: number
  content_flagged?: number
  users_unverified_email?: number
}

export type AdminBusiness = {
  id: number
  slug?: string
  business_name: string
  owner_username: string
  business_types?: string[]
  verification_status: string
  verification_notes?: string
  city: string
  region: string
  document_count?: number
  description?: string
  tagline?: string
}

export type VerificationDocument = {
  id: number
  doc_type: string
  doc_type_label: string
  file: string
  status: string
  notes: string
  uploaded_at: string
}

export type BusinessDocumentsResponse = {
  business: AdminBusiness
  documents: VerificationDocument[]
}

export type AdminUser = {
  id: number
  username: string
  email: string
  is_active: boolean
  is_staff: boolean
  user_type: string
  display_name: string
  date_joined: string
  email_verified?: boolean
  region?: string
  city?: string
  businesses_count?: number
}

export type AdminProfile = {
  username: string
  email: string
  display_name?: string
  is_staff?: boolean
  user_type?: string
}

export type AttentionPriority = 'high' | 'medium' | 'low'

export type AttentionItem = {
  id: string
  label: string
  count?: number
  priority: AttentionPriority
  actionLabel: string
  actionTo: string
}

export type ActivityItem = {
  id: number | string
  text: string
  time: string
  type: 'user' | 'business' | 'booking' | 'report' | 'listing' | 'review' | 'system'
  created_at?: string
  action?: string
}

export type StatItem = {
  value: string | number
  label: string
  accent?: boolean
  warn?: boolean
}

export type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export type VerifyDecision = {
  verification_status: 'verified' | 'rejected' | 'suspended' | 'pending' | 'unverified'
  reason?: string
}

export type AdminReport = {
  id: number
  reporter_username: string
  target_type: string
  target_id: string
  target_label: string
  reason: string
  reason_label: string
  description: string
  status: string
  severity: string
  admin_notes?: string
  action_taken?: string
  created_at: string
}

export type ModerationItem = {
  id: string
  target_type: string
  target_id: string
  title: string
  author: string
  status: string
  reason?: string
  date?: string
  report_id?: number
  severity?: string
}

export type AdminListing = {
  id: string
  listing_type: string
  listing_id: number
  title: string
  owner_username: string
  region: string
  city: string
  status: 'published' | 'unpublished'
  price_label: string
  category_label: string
  created_at: string
}

export type AdminBooking = {
  id: string
  booking_type: string
  booking_id: number
  customer_username: string
  listing_title: string
  provider_username: string
  status: string
  total_price: string
  start_date: string
  end_date: string
  created_at: string
  has_dispute_notes: boolean
}

export type AdminBookingNote = {
  id: number
  author_username: string
  body: string
  created_at: string
}

export type AdminBookingDetail = AdminBooking & {
  dispute_notes: AdminBookingNote[]
  mock_payment_ref?: string
  guests?: number
  room_type_name?: string
  special_requests?: string
  group_size?: number
  duration_hours?: string
  meeting_point?: string
  package_id?: number | null
  notes?: string
  pickup_area?: string
  seat_number?: number
}

export type UnverifiedEmailUser = {
  id: number
  username: string
  email: string
  display_name: string
  date_joined: string
  user_type: string
}

export type AnalyticsPoint = { date: string; count: number }

export type PlatformAnalytics = {
  days: number
  signups: AnalyticsPoint[]
  bookings: AnalyticsPoint[]
  bookings_by_vertical: { stays: number; guides: number; transport: number }
  verification_funnel: { unverified: number; pending: number; verified: number; rejected: number }
  totals: { signups: number; bookings: number }
}

export type AdminNotification = {
  id: string
  level: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  action_to: string
}

export type PlatformSettings = {
  feature_flags: Record<string, boolean>
  announcement_title: string
  announcement_body: string
  announcement_active: boolean
  updated_at: string
  updated_by_username: string | null
}

export type PromotionCampaign = {
  id: number
  placement: string
  placement_label: string
  target_type: string
  target_type_label: string
  target_id: string
  target_label: string
  region: string
  starts_at: string
  ends_at: string
  status: 'pending_payment' | 'requested' | 'scheduled' | 'active' | 'expired' | 'rejected' | 'cancelled' | 'refunded'
  status_label: string
  is_live: boolean
  priority: number
  label: string
  admin_notes: string
  provider_notes: string
  rejection_reason: string
  product_id: number | null
  product_name: string | null
  amount_cents: number
  amount_display?: string
  currency: string
  payment_status: string
  payment_status_label?: string
  payment_ref: string
  receipt_number: string
  paid_at: string | null
  refund_amount_cents: number
  created_by_username: string | null
  requested_by_username: string | null
  reviewed_by_username: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export type PromotionAnalyticsSummary = {
  days: number
  totals: {
    campaigns: number
    impressions: number
    clicks: number
    listing_opens: number
    bookings: number
    ctr_pct: number
    revenue_cents: number
    underperforming: number
  }
  funnel: { label: string; value: number }[]
  by_placement: {
    placement: string
    label: string
    impressions: number
    clicks: number
    bookings: number
    ctr_pct: number
  }[]
  campaigns: {
    id: number
    target_label: string
    placement: string
    placement_label: string
    region: string
    status: string
    status_label: string
    priority: number
    impressions: number
    clicks: number
    listing_opens: number
    bookings: number
    ctr_pct: number
    effective_priority: number
    underperforming: boolean
  }[]
}

export type PromotionConflictSummary = {
  placement: string
  max_slots: number
  booked_slots: number
  available_slots: number
  has_conflict: boolean
  warnings: string[]
  conflicts: {
    id: number
    target_label: string
    target_type: string
    target_id: string
    starts_at: string
    ends_at: string
    priority: number
    region: string
  }[]
}

export const PLACEMENT_OPTIONS = [
  { value: 'homepage_stays', label: 'Homepage — Featured stays', targetType: 'accommodation', listingType: 'accommodation', maxSlots: 2, defaultLabel: 'Featured Partner' },
  { value: 'homepage_guides', label: 'Homepage — Featured guides', targetType: 'guide', listingType: 'guide', maxSlots: 2, defaultLabel: 'Featured Partner' },
  { value: 'homepage_food', label: 'Homepage — Featured food', targetType: 'food', listingType: 'food', maxSlots: 2, defaultLabel: 'Featured Partner' },
  { value: 'homepage_events', label: 'Homepage — Featured events', targetType: 'event', listingType: 'event', maxSlots: 2, defaultLabel: 'Featured Partner' },
  { value: 'homepage_transport', label: 'Homepage — Featured transport', targetType: 'vehicle', listingType: 'vehicle', maxSlots: 2, defaultLabel: 'Featured Partner' },
  { value: 'category_spotlight', label: 'Category list — Hero spotlight', targetType: 'food', listingType: 'food', maxSlots: 1, defaultLabel: 'Featured Partner' },
  { value: 'delvers_feed', label: 'Delvers feed — Sponsored', targetType: 'post', listingType: 'post', maxSlots: 2, defaultLabel: 'Sponsored' },
  { value: 'community_feed', label: 'Community feed — Sponsored', targetType: 'post', listingType: 'community', maxSlots: 2, defaultLabel: 'Sponsored' },
] as const

export const FEED_TARGET_TYPES = [
  { value: 'post', label: 'Social post' },
  { value: 'accommodation', label: 'Stay listing' },
  { value: 'guide', label: 'Guide profile' },
  { value: 'food', label: 'Food venue' },
  { value: 'event', label: 'Event' },
  { value: 'vehicle', label: 'Vehicle rental' },
] as const
