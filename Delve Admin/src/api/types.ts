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
  bookings_food?: number
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
  transport_modes?: ('rental' | 'shared')[]
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

export type AdminUserProfilePost = {
  id: number
  body: string
  is_hidden: boolean
  moderation_reason?: string
  is_delvers?: boolean
  delvers_board?: string
  is_accommodation_story?: boolean
  created_at: string
  likes_count?: number
  comments_count?: number
}

export type AdminUserProfile = {
  user: AdminUser
  profile: {
    display_name: string
    bio: string
    avatar: string | null
    user_type: string
    region: string
    city: string
    email_verified: boolean
    is_private: boolean
    posts_visibility: string
    allow_messages: boolean
    show_in_search: boolean
  }
  stats: {
    posts_count: number
    posts_hidden_count: number
    photos_count: number
    followers_count: number
    following_count: number
    reports_against_open: number
    businesses_count: number
  }
  businesses: AdminBusiness[]
  guide_profile: {
    id: number
    headline: string
    is_active: boolean
    rating_avg: string
    rating_count: number
    regions: string[]
  } | null
  recent_posts: AdminUserProfilePost[]
  reports: AdminReport[]
  moderation_actions: {
    id: number
    action: string
    action_label: string
    detail: string
    actor_username: string | null
    created_at: string
  }[]
  bookings_summary: { as_traveler: number; as_provider: number }
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
  author_id?: number | null
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
  is_featured?: boolean
}

export type AdminFoodListingInspector = {
  listing_type: 'food'
  listing_id: number
  title: string
  owner_username: string
  owner_display_name: string
  status: 'published' | 'unpublished'
  cuisine: string
  region: string
  city: string
  price_level: number
  reservations_enabled: boolean
  dine_in: boolean
  takeaway: boolean
  delivery: boolean
  rating_avg: string
  rating_count: number
  saves_count: number
  reviews_count: number
  reservations_by_status: Record<string, number>
  recent_reservations: {
    id: number
    guest_username: string
    party_size: number
    reserved_for: string
    status: string
  }[]
  recent_reviews: {
    id: number
    reviewer_username: string
    rating: number
    body: string
    created_at: string
  }[]
  public_url: string
  created_at: string
}

export type AdminGuideListingInspector = {
  listing_type: 'guide'
  listing_id: number
  title: string
  owner_username: string
  owner_display_name: string
  status: 'published' | 'unpublished'
  photo?: string | null
  regions: string[]
  languages: string[]
  specialities: string[]
  hourly_rate: string
  licensed_guide: boolean
  years_guiding?: number | null
  default_meeting_point: string
  packages_count: number
  packages: {
    id: string
    title: string
    hours?: number | null
    price: string
  }[]
  rating_avg: string
  rating_count: number
  saves_count: number
  bookings_by_status: Record<string, number>
  recent_bookings: {
    id: number
    guest_username: string
    package_title: string
    date: string
    group_size: number
    total_price: string
    status: string
  }[]
  guest_reviews: {
    id: number
    name: string
    place: string
    rating?: number | null
    body: string
  }[]
  business_id?: number | null
  business_name: string
  business_verification_status: string
  public_url: string
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
  duration_hours?: string | number
  meeting_point?: string
  package_id?: string | number | null
  package_title?: string
  start_time?: string
  notes?: string
  guide_id?: number
  guide_headline?: string
  pickup_area?: string
  seat_number?: number
  tickets?: number
  booking_ref?: string
  party_size?: number
}

export type AdminPayment = {
  id: string
  source: string
  source_label: string
  record_id: number
  buyer_username: string
  seller_username: string
  title: string
  status: string
  total: string
  platform_fee: string
  seller_payout: string
  payout_status: string
  payout_status_label: string
  paid_at: string
  payout_released_at: string
  mock_payment_ref?: string
  created_at: string
  fulfillment_label?: string
}

export type AdminPaymentDetail = AdminPayment & {
  order_ref?: string
  items?: { id: number; product_name: string; quantity: number; unit_price: string; line_total: string }[]
  shipping_total?: string
  tracking_number?: string
  check_in?: string
  check_out?: string
  guests?: number
  date?: string
  group_size?: number
  start_date?: string
  end_date?: string
  seat_number?: number
  departs_at?: string
}

export type AdminDispute = {
  id: number
  source: string
  source_label: string
  record_id: number
  title: string
  buyer_username: string
  seller_username: string
  reason: string
  reason_label: string
  status: string
  status_label: string
  resolution: string
  resolution_label: string
  created_at: string
  updated_at: string
  resolved_at: string
}

export type AdminDisputeDetail = AdminDispute & {
  body: string
  resolution_note: string
  resolved_by_username?: string
  has_active_case?: boolean
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

export type HomePin = {
  id: number
  placement: string
  placement_label: string
  target_type: string
  target_id: string
  target_label: string
  partner_label: string
  region: string
  sort_order: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_by_username: string | null
  created_at: string
  updated_at: string
}

export type HomeStoryChannel = {
  channel_id: string
  label: string
  auto_fill: boolean
  active_slides: number
  max_slides: number
  updated_by_username: string | null
  updated_at: string
}

export type HomeStorySlide = {
  id: number
  channel_id: string
  channel_label: string
  source_type: string
  source_type_label: string
  target_id: string
  target_label: string
  headline: string
  sub: string
  cta_path: string
  cta_label: string
  media_url: string
  media_kind: 'image' | 'video'
  sort_order: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_by_username: string | null
  created_at: string
  updated_at: string
}

export const HOME_STORY_CHANNELS = [
  { id: 'stays', label: 'Stays', listingType: 'accommodation', defaultSource: 'accommodation' },
  { id: 'go', label: 'Transport', listingType: 'vehicle', defaultSource: 'vehicle' },
  { id: 'live', label: 'Events', listingType: 'event', defaultSource: 'event' },
  { id: 'eat', label: 'Food', listingType: 'food', defaultSource: 'food' },
  { id: 'tours', label: 'Guides', listingType: 'guide', defaultSource: 'guide' },
  { id: 'pins', label: 'Delvers', listingType: 'post', defaultSource: 'post' },
] as const

export const HOME_STORY_SOURCE_TYPES = [
  { value: 'post', label: 'Social post', listingTypes: ['post', 'community'] },
  { value: 'accommodation', label: 'Stay listing', listingTypes: ['accommodation'] },
  { value: 'guide', label: 'Guide profile', listingTypes: ['guide'] },
  { value: 'food', label: 'Food venue', listingTypes: ['food'] },
  { value: 'event', label: 'Event', listingTypes: ['event'] },
  { value: 'vehicle', label: 'Vehicle rental', listingTypes: ['vehicle'] },
  { value: 'bus_trip', label: 'Bus trip', listingTypes: ['bus_trip'] },
  { value: 'custom', label: 'Custom media URL', listingTypes: [] },
] as const

export const MAX_HOME_STORY_SLIDES = 6

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
  { value: 'category_spotlight', label: 'Category list — Hero spotlight', targetType: 'food', listingType: 'food', maxSlots: 1, defaultLabel: 'Featured Partner' },
  { value: 'delvers_feed', label: 'Delvers feed — Sponsored', targetType: 'post', listingType: 'post', maxSlots: 2, defaultLabel: 'Sponsored' },
  { value: 'community_feed', label: 'Community feed — Sponsored', targetType: 'post', listingType: 'community', maxSlots: 2, defaultLabel: 'Sponsored' },
] as const

/** Homepage rails only — editorial pins (max 2 active per rail). */
export const HOME_PIN_PLACEMENTS = PLACEMENT_OPTIONS.filter((p) => p.value.startsWith('homepage_'))

export const MAX_HOME_PINS = 2

export const FEED_TARGET_TYPES = [
  { value: 'post', label: 'Social post' },
  { value: 'accommodation', label: 'Stay listing' },
  { value: 'guide', label: 'Guide profile' },
  { value: 'food', label: 'Food venue' },
  { value: 'event', label: 'Event' },
  { value: 'vehicle', label: 'Vehicle rental' },
  { value: 'bus_trip', label: 'Bus trip' },
] as const
