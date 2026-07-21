import { ApiError } from '../api/client'
import type {
  ActivityItem,
  AdminBooking,
  AdminBookingDetail,
  AdminBusiness,
  AdminListing,
  AdminPayment,
  AdminPaymentDetail,
  AdminDispute,
  AdminDisputeDetail,
  AdminProfile,
  AdminReport,
  AdminUser,
  BusinessDocumentsResponse,
  HomePin,
  HomeStoryChannel,
  HomeStorySlide,
  ModerationItem,
  PlatformOverview,
  PlatformSettings,
  PromotionCampaign,
  PromotionConflictSummary,
  UnverifiedEmailUser,
} from '../api/types'
import {
  HOME_STORY_CHANNELS,
  HOME_STORY_SOURCE_TYPES,
  MAX_HOME_PINS,
  MAX_HOME_STORY_SLIDES,
} from '../api/types'
import { DEMO_ACTIVITY, DEMO_BOOKINGS, DEMO_DISPUTES, DEMO_LISTINGS, DEMO_PAYMENTS, DEMO_REPORTS, demoAnalytics } from '../data/demoData'

type MockProfile = AdminProfile & {
  password: string
  user_type: string
  is_staff: boolean
  bio?: string
}

const profiles: Record<string, MockProfile> = {
  demo_admin: {
    username: 'demo_admin',
    email: 'admin@delve.local',
    display_name: 'DELVE Admin',
    password: 'demo12345',
    user_type: 'normal',
    is_staff: true,
  },
  demo_user: {
    username: 'demo_user',
    email: 'user@delve.local',
    display_name: 'Demo Traveller',
    password: 'demo12345',
    user_type: 'normal',
    is_staff: false,
  },
  stays_host: {
    username: 'stays_host',
    email: 'host@delve.local',
    display_name: 'Stays Host',
    password: 'demo12345',
    user_type: 'service_provider',
    is_staff: false,
  },
}

let currentUser: string | null = localStorage.getItem('delve_admin_mock_user')
let mockReports: AdminReport[] = DEMO_REPORTS.map((r, i) => ({
  id: r.id,
  reporter_username: r.reporter,
  target_type: r.type.toLowerCase(),
  target_id: String(i + 100),
  target_label: r.item,
  reason: 'spam',
  reason_label: r.reason,
  description: r.reason,
  status: r.status,
  severity: r.severity,
  created_at: r.date,
}))

let mockModeration: ModerationItem[] = [
  {
    id: 'post-12',
    target_type: 'post',
    target_id: '12',
    title: 'Dune sunset panorama',
    author: 'stays_host',
    author_id: 3,
    status: 'reported',
    reason: 'Spam / misleading location',
    severity: 'medium',
  },
  {
    id: 'comment-4',
    target_type: 'comment',
    target_id: '4',
    title: 'Reply on community thread',
    author: 'demo_user',
    author_id: 2,
    status: 'reported',
    reason: 'Harassment',
    severity: 'high',
  },
]

let auditId = 1
const auditLog: ActivityItem[] = [...DEMO_ACTIVITY]
let reportIdCounter = mockReports.length + 1

let mockListings: AdminListing[] = [...DEMO_LISTINGS]
let mockBookings: AdminBooking[] = [...DEMO_BOOKINGS]
let mockPayments: AdminPayment[] = [...DEMO_PAYMENTS]

type MockSimIntent = {
  id: string
  status: string
  amount: string
  currency: string
  target_type: string
  target_id: string
  last4: string
  brand: string
  failure_code: string
  failure_message: string
  charge_id: string
  refunded: boolean
  created_at: string
  confirmed_at: string
  buyer_username: string
  simulated: boolean
  provider: string
}

let mockSimIntents: MockSimIntent[] = [
  {
    id: 'pi_sim_demo_shop_501abcdef',
    status: 'succeeded',
    amount: '120.00',
    currency: 'nad',
    target_type: 'shop_order',
    target_id: 'DLV-8F2K1',
    last4: '4242',
    brand: 'visa',
    failure_code: '',
    failure_message: '',
    charge_id: 'ch_sim_demo_shop501',
    refunded: false,
    created_at: '2026-06-01T10:00:00Z',
    confirmed_at: '2026-06-01T10:00:02Z',
    buyer_username: 'demo_user',
    simulated: true,
    provider: 'stripe_sim',
  },
  {
    id: 'pi_sim_demo_stay_1042abcdef',
    status: 'succeeded',
    amount: '1850.00',
    currency: 'nad',
    target_type: 'accommodation',
    target_id: '1042',
    last4: '4242',
    brand: 'visa',
    failure_code: '',
    failure_message: '',
    charge_id: 'ch_sim_demo_stay1042',
    refunded: false,
    created_at: '2026-07-10T12:00:00Z',
    confirmed_at: '2026-07-10T12:00:03Z',
    buyer_username: 'demo_user',
    simulated: true,
    provider: 'stripe_sim',
  },
  {
    id: 'pi_sim_demo_failed_open1',
    status: 'failed',
    amount: '650.00',
    currency: 'nad',
    target_type: 'guide',
    target_id: '2099',
    last4: '0002',
    brand: 'visa',
    failure_code: 'card_declined',
    failure_message: 'Your card was declined.',
    charge_id: '',
    refunded: false,
    created_at: '2026-07-18T08:00:00Z',
    confirmed_at: '',
    buyer_username: 'demo_user',
    simulated: true,
    provider: 'stripe_sim',
  },
]

let mockDisputes: AdminDisputeDetail[] = DEMO_DISPUTES.map((d) => ({
  ...d,
  body:
    d.id === 1
      ? 'Tracking shows delivered but nothing arrived at the lodge.'
      : 'Room photos do not match what we got — much smaller and no desk.',
  resolution_note: '',
  resolved_by_username: '',
  has_active_case: true,
}))

const RESOLUTIONS_LABEL: Record<string, string> = {
  refund_buyer: 'Refund buyer',
  release_seller: 'Release to seller',
  partial: 'Partial / other',
  dismissed: 'Dismissed',
}
let homePinIdCounter = 1
let mockHomePins: HomePin[] = []

let homeStorySlideIdCounter = 1
let mockHomeStorySlides: HomeStorySlide[] = []
let mockHomeStoryChannels: HomeStoryChannel[] = HOME_STORY_CHANNELS.map((c) => ({
  channel_id: c.id,
  label: c.label,
  auto_fill: true,
  active_slides: 0,
  max_slides: MAX_HOME_STORY_SLIDES,
  updated_by_username: null,
  updated_at: new Date().toISOString(),
}))

let promotionIdCounter = 6
let mockPromotions: PromotionCampaign[] = [
  {
    id: 1,
    placement: 'homepage_stays',
    placement_label: 'Homepage — Featured stays',
    target_type: 'accommodation',
    target_type_label: 'Stay listing',
    target_id: '1',
    target_label: 'Freesia Hotel',
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    status: 'active',
    status_label: 'Active',
    is_live: true,
    priority: 10,
    label: 'Featured Partner',
    admin_notes: 'Launch partner — complimentary slot',
    provider_notes: '',
    rejection_reason: '',
    product_id: null,
    product_name: null,
    amount_cents: 0,
    currency: 'NAD',
    payment_status: 'paid',
    payment_ref: '',
    receipt_number: '',
    paid_at: new Date(Date.now() - 86400000).toISOString(),
    refund_amount_cents: 0,
    created_by_username: 'demo_admin',
    requested_by_username: null,
    reviewed_by_username: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    placement: 'homepage_food',
    placement_label: 'Homepage — Featured food',
    target_type: 'food',
    target_type_label: 'Food venue',
    target_id: '4',
    target_label: 'Oryx Grill House',
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    status: 'active',
    status_label: 'Active',
    is_live: true,
    priority: 8,
    label: 'Featured Partner',
    admin_notes: '',
    provider_notes: '',
    rejection_reason: '',
    product_id: null,
    product_name: null,
    amount_cents: 0,
    currency: 'NAD',
    payment_status: 'paid',
    payment_ref: '',
    receipt_number: '',
    paid_at: new Date(Date.now() - 86400000).toISOString(),
    refund_amount_cents: 0,
    created_by_username: 'demo_admin',
    requested_by_username: null,
    reviewed_by_username: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    placement: 'category_spotlight',
    placement_label: 'Category list — Hero spotlight',
    target_type: 'food',
    target_type_label: 'Food venue',
    target_id: '4',
    target_label: 'Oryx Grill House',
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    status: 'active',
    status_label: 'Active',
    is_live: true,
    priority: 10,
    label: 'Featured Partner',
    admin_notes: 'Food list hero',
    provider_notes: '',
    rejection_reason: '',
    product_id: null,
    product_name: null,
    amount_cents: 0,
    currency: 'NAD',
    payment_status: 'paid',
    payment_ref: '',
    receipt_number: '',
    paid_at: new Date(Date.now() - 86400000).toISOString(),
    refund_amount_cents: 0,
    created_by_username: 'demo_admin',
    requested_by_username: null,
    reviewed_by_username: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    placement: 'delvers_feed',
    placement_label: 'Delvers feed — Sponsored',
    target_type: 'accommodation',
    target_type_label: 'Stay listing',
    target_id: '1',
    target_label: 'Freesia Hotel',
    region: '',
    starts_at: new Date(Date.now() - 86400000).toISOString(),
    ends_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    status: 'active',
    status_label: 'Active',
    is_live: true,
    priority: 10,
    label: 'Sponsored',
    admin_notes: 'Tour operator stay boost',
    provider_notes: '',
    rejection_reason: '',
    product_id: null,
    product_name: null,
    amount_cents: 0,
    currency: 'NAD',
    payment_status: 'paid',
    payment_ref: '',
    receipt_number: '',
    paid_at: new Date(Date.now() - 86400000).toISOString(),
    refund_amount_cents: 0,
    created_by_username: 'demo_admin',
    requested_by_username: null,
    reviewed_by_username: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    placement: 'homepage_guides',
    placement_label: 'Homepage — Featured guides',
    target_type: 'guide',
    target_type_label: 'Guide profile',
    target_id: '2',
    target_label: 'Desert Trails with Kai',
    region: 'Erongo',
    starts_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: 'requested',
    status_label: 'Requested',
    is_live: false,
    priority: 0,
    label: 'Featured Partner',
    admin_notes: '',
    provider_notes: 'EFT ref #8842 — want Erongo spotlight for winter season',
    rejection_reason: '',
    product_id: null,
    product_name: null,
    amount_cents: 0,
    currency: 'NAD',
    payment_status: 'pending',
    payment_ref: '',
    receipt_number: '',
    paid_at: null,
    refund_amount_cents: 0,
    created_by_username: 'demo_provider',
    requested_by_username: 'demo_provider',
    reviewed_by_username: null,
    reviewed_at: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]
const mockBookingNotes: Record<string, { id: number; author_username: string; body: string; created_at: string }[]> = {
  'vehicle:1044': [
    {
      id: 1,
      author_username: 'demo_admin',
      body: 'Customer claims vehicle was not available at pickup. Provider investigating.',
      created_at: '2026-05-21T10:00:00Z',
    },
  ],
}
let bookingNoteId = 2

let mockUnverifiedUsers: UnverifiedEmailUser[] = [
  {
    id: 99,
    username: 'new_traveller',
    email: 'new.traveller@example.com',
    display_name: 'New Traveller',
    date_joined: '2026-06-18T08:00:00Z',
    user_type: 'normal',
  },
  {
    id: 100,
    username: 'pending_host',
    email: 'pending.host@example.com',
    display_name: 'Pending Host',
    date_joined: '2026-06-19T09:00:00Z',
    user_type: 'service_provider',
  },
]

let mockSettings: PlatformSettings = {
  feature_flags: {
    delvers_social: true,
    new_bookings: true,
    provider_registration: true,
    maintenance_mode: false,
  },
  announcement_title: '',
  announcement_body: '',
  announcement_active: false,
  updated_at: new Date().toISOString(),
  updated_by_username: 'demo_admin',
}

const mockDocs: Record<number, BusinessDocumentsResponse['documents']> = {
  2: [
    {
      id: 1,
      doc_type: 'business_registration',
      doc_type_label: 'Business registration',
      file: 'https://via.placeholder.com/400x300?text=Business+Registration',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-01T10:00:00Z',
    },
    {
      id: 2,
      doc_type: 'tour_guide_license',
      doc_type_label: 'Tour guide license',
      file: 'https://via.placeholder.com/400x300?text=Tour+Guide+License',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-01T10:05:00Z',
    },
    {
      id: 10,
      doc_type: 'first_aid_cert',
      doc_type_label: 'First aid certificate',
      file: 'https://via.placeholder.com/400x300?text=First+Aid+Cert',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-01T10:10:00Z',
    },
  ],
  3: [
    {
      id: 3,
      doc_type: 'business_registration',
      doc_type_label: 'Business registration',
      file: 'https://via.placeholder.com/400x300?text=Business+Registration',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-02T08:00:00Z',
    },
    {
      id: 4,
      doc_type: 'operating_permit',
      doc_type_label: 'Operating permit',
      file: 'https://via.placeholder.com/400x300?text=Operating+Permit',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-02T08:05:00Z',
    },
    {
      id: 5,
      doc_type: 'transport_insurance',
      doc_type_label: 'Transport insurance',
      file: 'https://via.placeholder.com/400x300?text=Transport+Insurance',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-02T08:10:00Z',
    },
    {
      id: 6,
      doc_type: 'vehicle_registration',
      doc_type_label: 'Vehicle registration',
      file: 'https://via.placeholder.com/400x300?text=Vehicle+Registration',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-02T08:15:00Z',
    },
  ],
  4: [
    {
      id: 7,
      doc_type: 'business_registration',
      doc_type_label: 'Business registration',
      file: 'https://via.placeholder.com/400x300?text=Business+Registration',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-03T12:00:00Z',
    },
    {
      id: 11,
      doc_type: 'tour_guide_license',
      doc_type_label: 'Tour guide license',
      file: 'https://via.placeholder.com/400x300?text=Guide+License',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-03T12:05:00Z',
    },
  ],
  6: [
    {
      id: 12,
      doc_type: 'business_registration',
      doc_type_label: 'Business registration',
      file: 'https://via.placeholder.com/400x300?text=Business+Registration',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-05T09:00:00Z',
    },
    {
      id: 13,
      doc_type: 'tour_guide_license',
      doc_type_label: 'Tour guide license',
      file: 'https://via.placeholder.com/400x300?text=Tour+Guide+License',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-05T09:05:00Z',
    },
    {
      id: 14,
      doc_type: 'first_aid_cert',
      doc_type_label: 'First aid certificate',
      file: 'https://via.placeholder.com/400x300?text=First+Aid+Cert',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-05T09:10:00Z',
    },
  ],
  5: [
    {
      id: 8,
      doc_type: 'business_registration',
      doc_type_label: 'Business registration',
      file: 'https://via.placeholder.com/400x300?text=Business+Registration',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-04T09:00:00Z',
    },
    {
      id: 9,
      doc_type: 'food_handling_cert',
      doc_type_label: 'Food handling certificate',
      file: 'https://via.placeholder.com/400x300?text=Food+Handling+Cert',
      status: 'pending',
      notes: '',
      uploaded_at: '2026-06-04T09:05:00Z',
    },
  ],
}

let businesses: AdminBusiness[] = [
  {
    id: 1,
    business_name: 'Freesia Hotel',
    owner_username: 'stays_host',
    verification_status: 'verified',
    city: 'Windhoek',
    region: 'Khomas',
    business_types: ['accommodation'],
    document_count: 2,
  },
  {
    id: 2,
    business_name: 'Coastal Vibes',
    owner_username: 'guide_pro',
    verification_status: 'pending',
    city: 'Swakopmund',
    region: 'Erongo',
    business_types: ['guide'],
    document_count: 3,
    tagline: 'Coastal dunes & lagoon walks',
  },
  {
    id: 3,
    business_name: 'Namibia Wheels',
    owner_username: 'transport_mgr',
    verification_status: 'pending',
    city: 'Windhoek',
    region: 'Khomas',
    business_types: ['transport'],
    transport_modes: ['rental', 'shared'],
    document_count: 4,
  },
  {
    id: 4,
    business_name: 'Khomas City Walks',
    owner_username: 'guide_pro',
    verification_status: 'pending',
    city: 'Windhoek',
    region: 'Khomas',
    business_types: ['guide'],
    document_count: 2,
  },
  {
    id: 5,
    business_name: 'Windhoek Kitchen Co',
    owner_username: 'food_mgr',
    verification_status: 'pending',
    city: 'Windhoek',
    region: 'Khomas',
    business_types: ['food_drink'],
    document_count: 2,
    tagline: 'Seasonal plates & local brews',
  },
  {
    id: 6,
    business_name: 'Namib Trail Guides',
    owner_username: 'guide_mgr',
    verification_status: 'pending',
    city: 'Swakopmund',
    region: 'Erongo',
    business_types: ['guide'],
    document_count: 3,
    tagline: 'Desert trails with local experts',
  },
]

let mockUsers: AdminUser[] = Object.entries(profiles).map(([username, p], i) => ({
  id: i + 1,
  username,
  email: p.email,
  display_name: p.display_name ?? username,
  is_active: true,
  is_staff: p.is_staff,
  user_type: p.user_type,
  date_joined: '2026-01-15T08:00:00Z',
  email_verified: true,
  region: 'Khomas',
  city: 'Windhoek',
  businesses_count: businesses.filter((b) => b.owner_username === username).length,
}))

function normalizePath(path: string): string {
  const url = new URL(path, 'http://mock.local')
  const p = url.pathname.replace(/\/+$/, '') || '/'
  const qs = url.searchParams
  return qs.toString() ? `${p}?${qs}` : p
}

function publicProfile(p: MockProfile): AdminProfile {
  const { password: _pw, ...rest } = p
  return rest
}

function requireAuth() {
  if (!currentUser) throw new ApiError('Unauthorized', 401, { detail: 'Authentication required.' })
}

function requireStaff() {
  requireAuth()
  if (!profiles[currentUser!]?.is_staff) throw new ApiError('Forbidden', 403, { detail: 'Forbidden' })
}

function refreshPromotionStatus(c: PromotionCampaign): PromotionCampaign {
  if (c.status === 'cancelled' || c.status === 'requested' || c.status === 'rejected' || c.status === 'pending_payment' || c.status === 'refunded') return c
  const now = Date.now()
  const start = new Date(c.starts_at).getTime()
  const end = new Date(c.ends_at).getTime()
  let status: PromotionCampaign['status'] = 'scheduled'
  let status_label = 'Scheduled'
  if (now > end) {
    status = 'expired'
    status_label = 'Expired'
  } else if (now >= start) {
    status = 'active'
    status_label = 'Active'
  }
  const is_live = status === 'active'
  return { ...c, status, status_label, is_live, updated_at: new Date().toISOString() }
}

const PLACEMENT_LABELS: Record<string, string> = {
  homepage_stays: 'Homepage — Featured stays',
  homepage_guides: 'Homepage — Featured guides',
  homepage_food: 'Homepage — Featured food',
  homepage_events: 'Homepage — Featured events',
  delvers_feed: 'Delvers feed — Sponsored',
  community_feed: 'Community feed — Sponsored',
}

const PLACEMENT_MAX: Record<string, number> = {
  homepage_stays: 2,
  homepage_guides: 2,
  homepage_food: 2,
  homepage_events: 2,
  category_spotlight: 1,
  delvers_feed: 2,
  community_feed: 2,
}

function mockPromotionConflicts(params: URLSearchParams): PromotionConflictSummary {
  const placement = params.get('placement') || ''
  const startsAt = new Date(params.get('starts_at') || '')
  const endsAt = new Date(params.get('ends_at') || '')
  const region = (params.get('region') || '').trim()
  const targetType = params.get('target_type') || ''
  const maxSlots = PLACEMENT_MAX[placement] ?? 2

  const conflicts = mockPromotions.filter((c) => {
    if (c.placement !== placement || c.status === 'cancelled' || c.status === 'requested' || c.status === 'rejected' || c.status === 'pending_payment' || c.status === 'refunded') return false
    if (placement === 'category_spotlight' && targetType && c.target_type !== targetType) return false
    const start = new Date(c.starts_at).getTime()
    const end = new Date(c.ends_at).getTime()
    if (!(startsAt.getTime() < end && endsAt.getTime() > start)) return false
    if (region) return !c.region || c.region.toLowerCase() === region.toLowerCase()
    return !c.region
  })

  const booked = conflicts.length
  const warnings: string[] = []
  if (booked >= maxSlots) {
    warnings.push(`All ${maxSlots} slot${maxSlots === 1 ? '' : 's'} already booked for this period.`)
  } else if (booked === maxSlots - 1 && maxSlots > 1) {
    warnings.push(`Slot ${maxSlots} is the only slot left for this period.`)
  }
  conflicts.slice(0, maxSlots).forEach((row, idx) => {
    warnings.push(
      `Slot ${idx + 1} booked — ${row.target_label} (${new Date(row.starts_at).toLocaleDateString()} → ${new Date(row.ends_at).toLocaleDateString()})`,
    )
  })

  return {
    placement,
    max_slots: maxSlots,
    booked_slots: Math.min(booked, maxSlots),
    available_slots: Math.max(0, maxSlots - booked),
    has_conflict: booked >= maxSlots,
    warnings,
    conflicts: conflicts.map((c) => ({
      id: c.id,
      target_label: c.target_label,
      target_type: c.target_type,
      target_id: c.target_id,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      priority: c.priority,
      region: c.region,
    })),
  }
}

function pushAudit(text: string, type: ActivityItem['type'] = 'system') {
  auditLog.unshift({ id: auditId++, text, time: 'Just now', type })
}

export async function mockApiFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const full = normalizePath(path)
  const [pathname, query] = full.split('?')
  const method = (init.method ?? 'GET').toUpperCase()
  const params = new URLSearchParams(query ?? '')

  if (pathname === '/api/accounts/token' && method === 'POST') {
    const body = JSON.parse(String(init.body)) as { email?: string; username?: string; password: string }
    const username =
      body.username?.trim() ||
      Object.keys(profiles).find((k) => profiles[k].email?.toLowerCase() === body.email?.trim().toLowerCase())
    const p = username ? profiles[username] : undefined
    if (!p || p.password !== body.password) {
      throw new ApiError('Invalid credentials', 401, { detail: 'Invalid credentials' })
    }
    currentUser = username!
    localStorage.setItem('delve_admin_mock_user', currentUser)
    return { access: 'mock-access', refresh: 'mock-refresh' }
  }

  if (pathname === '/api/accounts/me' && method === 'GET') {
    requireAuth()
    const p = profiles[currentUser!]
    if (!p) throw new ApiError('Unauthorized', 401, { detail: 'Authentication required.' })
    return { ...publicProfile(p), email_verified: true }
  }

  if (pathname === '/api/accounts/admin/overview' && method === 'GET') {
    requireStaff()
    const pending = businesses.filter((b) => b.verification_status === 'pending').length
    const overview: PlatformOverview = {
      users: mockUsers.length + 20,
      providers: mockUsers.filter((u) => u.user_type === 'service_provider').length + 6,
      businesses: businesses.length,
      businesses_pending: pending,
      listings: 42,
      listings_stays: 12,
      listings_guides: 8,
      listings_transport: mockListings.filter(
        (l) => l.listing_type === 'vehicle' || l.listing_type === 'bus_trip',
      ).length,
      listings_food: 8,
      listings_events: 6,
      listings_posts: 24,
      bookings: mockBookings.length + 32,
      bookings_pending: mockBookings.filter((b) => b.status === 'pending').length + 2,
      bookings_stays: 18,
      bookings_guides: 10,
      bookings_transport: 8,
      bookings_food: mockBookings.filter((b) => b.booking_type === 'food').length + 1,
      reports_open: mockReports.filter((r) => ['new', 'under_review', 'escalated'].includes(r.status)).length,
      users_unverified_email: mockUnverifiedUsers.length,
    }
    return overview
  }

  if (pathname === '/api/accounts/admin/activity' && method === 'GET') {
    requireStaff()
    return auditLog.slice(0, 50)
  }

  if (pathname === '/api/accounts/admin/users' && method === 'GET') {
    requireStaff()
    return mockUsers
  }

  const userDetailMatch = pathname.match(/^\/api\/accounts\/admin\/users\/(\d+)$/)
  if (userDetailMatch && method === 'GET') {
    requireStaff()
    const user = mockUsers.find((u) => u.id === Number(userDetailMatch[1]))
    if (!user) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return user
  }

  const userProfileMatch = pathname.match(/^\/api\/accounts\/admin\/users\/(\d+)\/profile$/)
  if (userProfileMatch && method === 'GET') {
    requireStaff()
    const user = mockUsers.find((u) => u.id === Number(userProfileMatch[1]))
    if (!user) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const userBusinesses = businesses.filter((b) => b.owner_username === user.username)
    return {
      user,
      profile: {
        display_name: user.display_name,
        bio: profiles[user.username]?.bio ?? '',
        avatar: null,
        user_type: user.user_type,
        region: user.region ?? '',
        city: user.city ?? '',
        email_verified: user.email_verified ?? true,
        is_private: false,
        posts_visibility: 'public',
        allow_messages: true,
        show_in_search: true,
      },
      stats: {
        posts_count: 3,
        posts_hidden_count: 0,
        photos_count: 2,
        followers_count: 12,
        following_count: 8,
        reports_against_open: 0,
        businesses_count: userBusinesses.length,
      },
      businesses: userBusinesses,
      guide_profile: user.user_type === 'service_provider' ? null : null,
      recent_posts: [
        {
          id: 101,
          body: 'Sunset over the dunes — what a week in Sossusvlei.',
          is_hidden: false,
          is_delvers: true,
          created_at: '2026-03-10T14:00:00Z',
          likes_count: 4,
          comments_count: 1,
        },
      ],
      reports: [],
      moderation_actions: [],
      bookings_summary: { as_traveler: 2, as_provider: user.user_type === 'service_provider' ? 5 : 0 },
    }
  }

  const userUpdateMatch = pathname.match(/^\/api\/accounts\/admin\/users\/(\d+)\/update$/)
  if (userUpdateMatch && method === 'PATCH') {
    requireStaff()
    const id = Number(userUpdateMatch[1])
    const user = mockUsers.find((u) => u.id === id)
    if (!user) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as { is_active?: boolean; is_staff?: boolean }
    if (typeof body.is_active === 'boolean') {
      user.is_active = body.is_active
      pushAudit(
        `${body.is_active ? 'Account reactivated' : 'Account suspended'} — @${user.username}`,
        'user',
      )
    }
    if (typeof body.is_staff === 'boolean') {
      user.is_staff = body.is_staff
      profiles[user.username].is_staff = body.is_staff
      pushAudit(
        `${body.is_staff ? 'Promoted to platform admin' : 'Removed admin access'} — @${user.username}`,
        'user',
      )
    }
    return user
  }

  if (pathname === '/api/accounts/admin/businesses' && method === 'GET') {
    requireStaff()
    let rows = [...businesses]
    const status = params.get('status')
    if (status) rows = rows.filter((b) => b.verification_status === status)
    return rows
  }

  const bizDocsMatch = pathname.match(/^\/api\/accounts\/admin\/businesses\/(\d+)\/documents$/)
  if (bizDocsMatch && method === 'GET') {
    requireStaff()
    const id = Number(bizDocsMatch[1])
    const business = businesses.find((b) => b.id === id)
    if (!business) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return {
      business,
      documents: mockDocs[id] ?? [],
    } satisfies BusinessDocumentsResponse
  }

  const bizVerifyMatch = pathname.match(/^\/api\/accounts\/admin\/businesses\/(\d+)\/verification$/)
  if (bizVerifyMatch && method === 'PATCH') {
    requireStaff()
    const id = Number(bizVerifyMatch[1])
    const business = businesses.find((b) => b.id === id)
    if (!business) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as { verification_status?: string; reason?: string }
    if (body.verification_status) {
      const prev = business.verification_status
      if (
        (body.verification_status === 'rejected' || body.verification_status === 'suspended') &&
        !(body.reason || '').trim()
      ) {
        throw new ApiError('Bad request', 400, {
          detail: 'A reason is required when rejecting or suspending a business.',
        })
      }
      business.verification_status = body.verification_status
      if (body.reason) business.verification_notes = body.reason
      pushAudit(
        `Business verification updated — ${business.business_name} → ${body.verification_status}`,
        'business',
      )
      const changed = prev !== body.verification_status
      return {
        ...business,
        email_sent: changed,
        email_recipient: changed ? 'provider@example.com' : '',
        email_detail: changed
          ? `Provider notified at provider@example.com.`
          : 'Status unchanged — no email sent.',
      }
    }
    return business
  }

  if (pathname === '/api/reports' && method === 'POST') {
    requireAuth()
    const body = JSON.parse(String(init.body)) as {
      target_type: string
      target_id: string
      target_label?: string
      reason: string
      description?: string
    }
    const report: AdminReport = {
      id: reportIdCounter++,
      reporter_username: currentUser!,
      target_type: body.target_type,
      target_id: body.target_id,
      target_label: body.target_label ?? body.target_id,
      reason: body.reason,
      reason_label: body.reason.replace(/_/g, ' '),
      description: body.description ?? '',
      status: 'new',
      severity: body.reason === 'safety_concern' ? 'critical' : 'medium',
      created_at: new Date().toISOString(),
    }
    mockReports.unshift(report)
    pushAudit(`New report — ${report.target_type}:${report.target_id}`, 'report')
    return report
  }

  if (pathname === '/api/accounts/admin/reports' && method === 'GET') {
    requireStaff()
    let rows = [...mockReports]
    const status = params.get('status')
    if (status) rows = rows.filter((r) => r.status === status)
    return rows
  }

  const reportDetailMatch = pathname.match(/^\/api\/accounts\/admin\/reports\/(\d+)$/)
  if (reportDetailMatch && method === 'GET') {
    requireStaff()
    const report = mockReports.find((r) => r.id === Number(reportDetailMatch[1]))
    if (!report) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return report
  }

  if (reportDetailMatch && method === 'PATCH') {
    requireStaff()
    const report = mockReports.find((r) => r.id === Number(reportDetailMatch[1]))
    if (!report) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as {
      status?: string
      action?: string
      admin_notes?: string
    }
    if (body.status) report.status = body.status
    if (body.admin_notes) report.admin_notes = body.admin_notes
    if (body.action === 'dismiss') report.status = 'dismissed'
    if (body.action === 'warn') report.status = 'resolved'
    if (body.action === 'suspend') {
      report.status = 'resolved'
      pushAudit(`Account suspended via report #${report.id}`, 'user')
    }
    if (body.action === 'remove_content') {
      report.status = 'resolved'
      mockModeration = mockModeration.map((m) =>
        m.target_type === report.target_type && m.target_id === report.target_id
          ? { ...m, status: 'hidden', reason: body.admin_notes ?? m.reason }
          : m,
      )
    }
    pushAudit(`Report #${report.id} — ${body.action ?? body.status}`, 'report')
    return report
  }

  if (pathname === '/api/accounts/admin/moderation' && method === 'GET') {
    requireStaff()
    return mockModeration
  }

  if (pathname === '/api/accounts/admin/moderation' && method === 'PATCH') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as {
      target_type: string
      target_id: string
      action: 'remove' | 'restore'
      reason?: string
    }
    mockModeration = mockModeration.map((m) =>
      m.target_type === body.target_type && m.target_id === body.target_id
        ? {
            ...m,
            status: body.action === 'remove' ? 'hidden' : 'reported',
            reason: body.reason ?? m.reason,
          }
        : m,
    )
    pushAudit(`Content ${body.action} — ${body.target_type}:${body.target_id}`, 'report')
    return { ok: true }
  }

  if (pathname === '/api/accounts/admin/listings' && method === 'GET') {
    requireStaff()
    return mockListings
  }

  if (pathname === '/api/accounts/admin/listings' && method === 'PATCH') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as {
      listing_type: string
      listing_id: number
      published?: boolean
      reason?: string
    }
    mockListings = mockListings.map((item) =>
      item.listing_type === body.listing_type && item.listing_id === body.listing_id
        ? { ...item, status: body.published ? 'published' : 'unpublished' }
        : item,
    )
    const updated = mockListings.find(
      (item) => item.listing_type === body.listing_type && item.listing_id === body.listing_id,
    )
    pushAudit(
      `${body.published ? 'Republished' : 'Unpublished'} ${body.listing_type}:${body.listing_id}`,
      'listing',
    )
    return updated
  }

  const foodInspectMatch = pathname.match(/^\/api\/accounts\/admin\/listings\/food\/(\d+)\/inspect$/)
  if (foodInspectMatch && method === 'GET') {
    requireStaff()
    const listingId = Number(foodInspectMatch[1])
    const row = mockListings.find((item) => item.listing_type === 'food' && item.listing_id === listingId)
    if (!row) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return {
      listing_type: 'food',
      listing_id: listingId,
      title: row.title,
      owner_username: row.owner_username,
      owner_display_name: row.owner_username,
      status: row.status,
      cuisine: row.category_label.replace(/^Food · /, '') || 'Restaurant',
      region: row.region,
      city: row.city,
      price_level: 2,
      reservations_enabled: true,
      dine_in: true,
      takeaway: true,
      delivery: false,
      rating_avg: '4.6',
      rating_count: 42,
      saves_count: 18,
      reviews_count: 12,
      reservations_by_status: { pending: 2, confirmed: 5, checked_in: 1 },
      recent_reservations: [
        {
          id: 101,
          guest_username: 'demo_user',
          party_size: 4,
          reserved_for: '2026-07-05T19:00:00Z',
          status: 'confirmed',
        },
      ],
      recent_reviews: [
        {
          id: 1,
          reviewer_username: 'demo_user',
          rating: 5,
          body: 'Great grill and friendly staff.',
          created_at: '2026-06-20T12:00:00Z',
        },
      ],
      public_url: `/food/${listingId}`,
      created_at: row.created_at,
    }
  }

  const guideInspectMatch = pathname.match(/^\/api\/accounts\/admin\/listings\/guide\/(\d+)\/inspect$/)
  if (guideInspectMatch && method === 'GET') {
    requireStaff()
    const listingId = Number(guideInspectMatch[1])
    const row = mockListings.find((item) => item.listing_type === 'guide' && item.listing_id === listingId)
    if (!row) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return {
      listing_type: 'guide',
      listing_id: listingId,
      title: row.title,
      owner_username: row.owner_username,
      owner_display_name: row.owner_username,
      status: row.status,
      photo: null,
      regions: [row.region].filter(Boolean),
      languages: ['English'],
      specialities: ['Wildlife', 'Culture'],
      hourly_rate: '450.00',
      licensed_guide: true,
      years_guiding: 8,
      default_meeting_point: 'Lodge lobby',
      packages_count: 1,
      packages: [{ id: 'half-day', title: 'Half-day dunes', hours: 4, price: '3600' }],
      rating_avg: '4.9',
      rating_count: 12,
      saves_count: 7,
      bookings_by_status: { pending: 1, confirmed: 3, completed: 2 },
      recent_bookings: [
        {
          id: 201,
          guest_username: 'demo_user',
          package_title: 'Half-day dunes',
          date: '2026-07-08',
          group_size: 2,
          total_price: '3600.00',
          status: 'confirmed',
        },
      ],
      guest_reviews: [
        {
          id: 1,
          name: 'Sam',
          place: 'Windhoek',
          rating: 5,
          body: 'Excellent local knowledge.',
        },
      ],
      business_id: 1,
      business_name: 'Guide Co',
      business_verification_status: 'approved',
      public_url: `/guides/${listingId}`,
      created_at: row.created_at,
    }
  }

  if (pathname === '/api/accounts/admin/bookings' && method === 'GET') {
    requireStaff()
    return mockBookings
  }

  if (pathname === '/api/accounts/admin/payments' && method === 'GET') {
    requireStaff()
    const source = (params.get('source') || '').trim().toLowerCase()
    const payout = (params.get('payout_status') || params.get('payout') || '').trim().toLowerCase()
    let rows = [...mockPayments]
    if (source) rows = rows.filter((r) => r.source === source)
    if (payout === 'all' || payout === '*') {
      // include all
    } else if (payout) {
      rows = rows.filter((r) => r.payout_status === payout)
    } else {
      rows = rows.filter((r) => r.payout_status !== 'none')
    }
    const held = rows.filter((r) => r.payout_status === 'held').sort((a, b) => b.created_at.localeCompare(a.created_at))
    const rest = rows.filter((r) => r.payout_status !== 'held').sort((a, b) => b.created_at.localeCompare(a.created_at))
    return [...held, ...rest]
  }

  const paymentDetailMatch = pathname.match(/^\/api\/accounts\/admin\/payments\/([^/]+)\/(\d+)$/)
  if (paymentDetailMatch && method === 'GET') {
    requireStaff()
    const source = paymentDetailMatch[1]
    const recordId = Number(paymentDetailMatch[2])
    const row = mockPayments.find((p) => p.source === source && p.record_id === recordId)
    if (!row) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const detail: AdminPaymentDetail = {
      ...row,
      ...(source === 'shop'
        ? {
            order_ref: 'DLV-8F2K1',
            shipping_total: '20.00',
            tracking_number: 'NP123456',
            items: [
              {
                id: 1,
                product_name: 'Handwoven basket',
                quantity: 1,
                unit_price: '100.00',
                line_total: '100.00',
              },
            ],
          }
        : {}),
      ...(source === 'accommodation'
        ? { check_in: '2026-05-10', check_out: '2026-05-12', guests: 2 }
        : {}),
      ...(source === 'guide' ? { date: '2026-05-14', group_size: 2 } : {}),
      ...(source === 'vehicle' ? { start_date: '2026-05-10', end_date: '2026-05-14' } : {}),
      ...(source === 'bus_seat' ? { seat_number: 12, departs_at: '2026-05-11T07:00:00Z' } : {}),
    }
    return detail
  }

  if (pathname === '/api/payments/admin/intents' && method === 'GET') {
    requireStaff()
    const statusFilter = (params.get('status') || '').trim()
    let rows = [...mockSimIntents]
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter)
    return rows
  }

  const adminIntentDetail = pathname.match(/^\/api\/payments\/admin\/intents\/([^/]+)$/)
  if (adminIntentDetail && method === 'GET') {
    requireStaff()
    const pi = mockSimIntents.find((r) => r.id === decodeURIComponent(adminIntentDetail[1]))
    if (!pi) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    return pi
  }

  if (pathname === '/api/payments/webhooks/simulate' && method === 'POST') {
    requireStaff()
    if (typeof init.body !== 'string') throw new ApiError('Bad request', 400, { detail: 'Invalid body.' })
    const body = JSON.parse(init.body) as {
      type?: string
      payment_intent?: string
      failure_code?: string
      failure_message?: string
    }
    const eventType = (body.type || '').trim()
    const pi = mockSimIntents.find((r) => r.id === String(body.payment_intent || '').trim())
    if (!pi) throw new ApiError('Not found', 404, { detail: 'PaymentIntent not found.' })

    if (eventType === 'charge.refunded' || eventType === 'payment_intent.canceled') {
      pi.refunded = true
      const linked = mockPayments.find((p) => p.mock_payment_ref === pi.id)
      if (linked) {
        linked.payout_status = 'refunded'
        linked.payout_status_label = 'Refunded'
        linked.status = 'refunded'
      }
    } else if (eventType === 'payment_intent.payment_failed') {
      pi.status = 'failed'
      pi.failure_code = body.failure_code || 'card_declined'
      pi.failure_message = body.failure_message || 'Your card was declined.'
    } else if (eventType === 'payment_intent.succeeded') {
      pi.status = 'succeeded'
      pi.failure_code = ''
      pi.failure_message = ''
      pi.charge_id = pi.charge_id || `ch_sim_${Math.random().toString(36).slice(2, 12)}`
      pi.confirmed_at = new Date().toISOString()
      const linked = mockPayments.find((p) => p.mock_payment_ref === pi.id)
      if (linked && linked.payout_status === 'refunded') {
        linked.payout_status = 'held'
        linked.payout_status_label = 'Held by Delve'
      }
    } else {
      throw new ApiError('Bad request', 400, { detail: `Unsupported event type: ${eventType}` })
    }
    return { received: true, payment_intent: pi }
  }

  if (pathname === '/api/accounts/admin/disputes' && method === 'GET') {
    requireStaff()
    const source = (params.get('source') || '').trim().toLowerCase()
    const st = (params.get('status') || 'active').trim().toLowerCase()
    let rows = [...mockDisputes]
    if (source) rows = rows.filter((r) => r.source === source)
    if (st === 'active' || !st) {
      rows = rows.filter((r) => r.status === 'open' || r.status === 'under_review')
    } else if (st !== 'all') {
      rows = rows.filter((r) => r.status === st)
    }
    return rows.map(({ body: _b, resolution_note: _n, resolved_by_username: _u, has_active_case: _h, ...rest }) => rest)
  }

  const disputeDetailMatch = pathname.match(/^\/api\/accounts\/admin\/disputes\/(\d+)$/)
  if (disputeDetailMatch) {
    requireStaff()
    const id = Number(disputeDetailMatch[1])
    const row = mockDisputes.find((d) => d.id === id)
    if (!row) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    if (method === 'GET') return row
    if (method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as {
        status?: string
        resolution?: string
        resolution_note?: string
      }
      mockDisputes = mockDisputes.map((d) =>
        d.id === id
          ? {
              ...d,
              status: body.status || d.status,
              status_label:
                body.status === 'resolved'
                  ? 'Resolved'
                  : body.status === 'under_review'
                    ? 'Under review'
                    : body.status === 'closed'
                      ? 'Closed'
                      : d.status_label,
              resolution: body.resolution ?? d.resolution,
              resolution_label:
                RESOLUTIONS_LABEL[body.resolution || ''] ??
                d.resolution_label,
              resolution_note: body.resolution_note ?? d.resolution_note,
              resolved_at:
                body.status === 'resolved' || body.status === 'closed'
                  ? new Date().toISOString()
                  : d.resolved_at,
              resolved_by_username:
                body.status === 'resolved' || body.status === 'closed' ? currentUser || '' : d.resolved_by_username,
              has_active_case: !(body.status === 'resolved' || body.status === 'closed'),
            }
          : d,
      )
      pushAudit(`Dispute #${id} → ${body.status || 'updated'}`, 'system')
      return mockDisputes.find((d) => d.id === id)!
    }
  }

  const bookingDetailMatch = pathname.match(/^\/api\/accounts\/admin\/bookings\/([^/]+)\/(\d+)$/)
  if (bookingDetailMatch) {
    requireStaff()
    const bookingType = bookingDetailMatch[1]
    const bookingId = Number(bookingDetailMatch[2])
    const row = mockBookings.find((b) => b.booking_type === bookingType && b.booking_id === bookingId)
    if (!row) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const key = `${bookingType}:${bookingId}`
    const detail: AdminBookingDetail = {
      ...row,
      dispute_notes: mockBookingNotes[key] ?? [],
      mock_payment_ref: `MOCK-${bookingId}`,
      ...(bookingType === 'accommodation'
        ? {
            guests: 2,
            room_type_name: 'Standard king room',
            special_requests: 'Late check-in requested after 20:00.',
          }
        : {}),
      ...(bookingType === 'food'
        ? {
            party_size: 4,
            special_requests: 'Window seat if possible.',
          }
        : {}),
    }
    if (method === 'GET') return detail
    if (method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { note?: string; status?: string }
      if (body.note?.trim()) {
        const note = {
          id: bookingNoteId++,
          author_username: currentUser!,
          body: body.note.trim(),
          created_at: new Date().toISOString(),
        }
        mockBookingNotes[key] = [note, ...(mockBookingNotes[key] ?? [])]
        mockBookings = mockBookings.map((b) =>
          b.booking_type === bookingType && b.booking_id === bookingId
            ? { ...b, has_dispute_notes: true }
            : b,
        )
        pushAudit(`Booking note — ${key}`, 'booking')
      }
      if (body.status) {
        mockBookings = mockBookings.map((b) =>
          b.booking_type === bookingType && b.booking_id === bookingId ? { ...b, status: body.status! } : b,
        )
        pushAudit(`Booking status → ${body.status} — ${key}`, 'booking')
      }
      return {
        ...mockBookings.find((b) => b.booking_type === bookingType && b.booking_id === bookingId)!,
        dispute_notes: mockBookingNotes[key] ?? [],
        mock_payment_ref: `MOCK-${bookingId}`,
        ...(bookingType === 'accommodation'
          ? {
              guests: 2,
              room_type_name: 'Standard king room',
              special_requests: 'Late check-in requested after 20:00.',
            }
          : {}),
      } as AdminBookingDetail
    }
  }

  if (pathname === '/api/accounts/admin/email-verification' && method === 'GET') {
    requireStaff()
    return mockUnverifiedUsers
  }

  const emailVerifyMatch = pathname.match(/^\/api\/accounts\/admin\/email-verification\/(\d+)$/)
  if (emailVerifyMatch && method === 'PATCH') {
    requireStaff()
    const id = Number(emailVerifyMatch[1])
    const user = mockUnverifiedUsers.find((u) => u.id === id)
    if (!user) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as { action: 'verify' | 'resend' }
    if (body.action === 'verify') {
      mockUnverifiedUsers = mockUnverifiedUsers.filter((u) => u.id !== id)
      pushAudit(`Email manually verified — @${user.username}`, 'user')
      return { ...user, email_verified: true, detail: 'Email marked as verified.' }
    }
    pushAudit(`Verification email resent — @${user.username}`, 'user')
    return { ...user, detail: 'Verification email sent.' }
  }

  if (pathname === '/api/accounts/admin/analytics' && method === 'GET') {
    requireStaff()
    const days = Number(params.get('days') || '30')
    return demoAnalytics(days)
  }

  if (pathname === '/api/accounts/admin/notifications' && method === 'GET') {
    requireStaff()
    const items = []
    const critical = mockReports.filter((r) => r.severity === 'critical' && ['new', 'escalated'].includes(r.status))
    if (critical.length) {
      items.push({
        id: 'critical-reports',
        level: 'critical',
        title: `${critical.length} critical report${critical.length === 1 ? '' : 's'}`,
        message: 'Safety or fraud reports need immediate review.',
        action_to: '/admin/reports',
      })
    }
    const pending = businesses.filter((b) => b.verification_status === 'pending')
    if (pending.length) {
      items.push({
        id: 'pending-verifications',
        level: 'high',
        title: `${pending.length} pending verification${pending.length === 1 ? '' : 's'}`,
        message: 'Businesses waiting for document review.',
        action_to: '/admin/verifications',
      })
    }
    const open = mockReports.filter((r) => r.status === 'new' || r.status === 'escalated')
    if (open.length) {
      items.push({
        id: 'open-reports',
        level: 'medium',
        title: `${open.length} open report${open.length === 1 ? '' : 's'}`,
        message: 'New or escalated traveller reports.',
        action_to: '/admin/reports',
      })
    }
    if (mockUnverifiedUsers.length) {
      items.push({
        id: 'unverified-email',
        level: 'low',
        title: `${mockUnverifiedUsers.length} unverified email${mockUnverifiedUsers.length === 1 ? '' : 's'}`,
        message: 'Accounts that have not confirmed their email.',
        action_to: '/admin/email-verification',
      })
    }
    return items
  }

  if (pathname === '/api/accounts/admin/settings' && method === 'GET') {
    requireStaff()
    return mockSettings
  }

  if (pathname === '/api/accounts/admin/settings' && method === 'PATCH') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as Partial<PlatformSettings>
    if (body.feature_flags) mockSettings.feature_flags = { ...mockSettings.feature_flags, ...body.feature_flags }
    if (body.announcement_title != null) mockSettings.announcement_title = body.announcement_title
    if (body.announcement_body != null) mockSettings.announcement_body = body.announcement_body
    if (body.announcement_active != null) mockSettings.announcement_active = body.announcement_active
    mockSettings.updated_at = new Date().toISOString()
    mockSettings.updated_by_username = currentUser!
    pushAudit('Platform settings updated', 'system')
    return mockSettings
  }

  if (pathname === '/api/accounts/admin/promotions/analytics' && method === 'GET') {
    requireStaff()
    const days = Number(params.get('days') || 30)
    const metricsById: Record<number, { impressions: number; clicks: number; listing_opens: number; bookings: number }> = {
      1: { impressions: 1240, clicks: 62, listing_opens: 18, bookings: 3 },
      2: { impressions: 890, clicks: 8, listing_opens: 2, bookings: 0 },
      3: { impressions: 420, clicks: 28, listing_opens: 9, bookings: 1 },
      4: { impressions: 680, clicks: 41, listing_opens: 11, bookings: 2 },
    }
    const rows = mockPromotions.map((c) => {
      const m = metricsById[c.id] ?? { impressions: 0, clicks: 0, listing_opens: 0, bookings: 0 }
      const ctr_pct = m.impressions ? Math.round((m.clicks / m.impressions) * 10000) / 100 : 0
      const underperforming = m.impressions >= 50 && ctr_pct < 1
      const effective_priority = underperforming ? Math.round((c.priority || 0) * 0.45) : c.priority
      return {
        id: c.id,
        target_label: c.target_label,
        placement: c.placement,
        placement_label: c.placement_label,
        region: c.region || 'National',
        status: c.status,
        status_label: c.status_label,
        priority: c.priority,
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        ...m,
        ctr_pct,
        effective_priority,
        underperforming,
      }
    })
    const totals = rows.reduce(
      (acc, r) => ({
        campaigns: acc.campaigns + 1,
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
        listing_opens: acc.listing_opens + r.listing_opens,
        bookings: acc.bookings + r.bookings,
        revenue_cents: acc.revenue_cents + (mockPromotions.find((x) => x.id === r.id)?.payment_status === 'paid' ? 250000 : 0),
        underperforming: acc.underperforming + (r.underperforming ? 1 : 0),
      }),
      { campaigns: 0, impressions: 0, clicks: 0, listing_opens: 0, bookings: 0, revenue_cents: 0, underperforming: 0 },
    )
    const ctr_pct = totals.impressions ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0
    const byPlacementMap = new Map<string, { placement: string; label: string; impressions: number; clicks: number; bookings: number }>()
    rows.forEach((r) => {
      const bucket = byPlacementMap.get(r.placement) ?? { placement: r.placement, label: r.placement_label, impressions: 0, clicks: 0, bookings: 0 }
      bucket.impressions += r.impressions
      bucket.clicks += r.clicks
      bucket.bookings += r.bookings
      byPlacementMap.set(r.placement, bucket)
    })
    return {
      days,
      totals: { ...totals, ctr_pct },
      funnel: [
        { label: 'Impressions', value: totals.impressions },
        { label: 'Clicks', value: totals.clicks },
        { label: 'Listing opens', value: totals.listing_opens },
        { label: 'Bookings', value: totals.bookings },
      ],
      by_placement: [...byPlacementMap.values()].map((b) => ({
        ...b,
        ctr_pct: b.impressions ? Math.round((b.clicks / b.impressions) * 10000) / 100 : 0,
      })),
      campaigns: rows.sort((a, b) => b.impressions - a.impressions),
    }
  }

  if (pathname === '/api/accounts/admin/home-pins' && method === 'GET') {
    requireStaff()
    const placement = params.get('placement') || ''
    let rows = [...mockHomePins]
    if (placement) rows = rows.filter((p) => p.placement === placement)
    return rows.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  }

  if (pathname === '/api/accounts/admin/home-pins' && method === 'POST') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as {
      placement: string
      target_type: string
      target_id: string
      target_label?: string
      partner_label?: string
      region?: string
      is_active?: boolean
      sort_order?: number
    }
    const placement = body.placement
    if (!placement.startsWith('homepage_')) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid homepage placement.' })
    }
    const is_active = body.is_active !== false
    if (is_active) {
      const activeCount = mockHomePins.filter((p) => p.placement === placement && p.is_active).length
      if (activeCount >= MAX_HOME_PINS) {
        throw new ApiError('Bad request', 400, {
          detail: `At most ${MAX_HOME_PINS} active pins per homepage rail.`,
        })
      }
    }
    const listing = DEMO_LISTINGS.find(
      (l) => String(l.listing_id) === String(body.target_id) && l.listing_type === body.target_type,
    )
    const maxOrder = mockHomePins
      .filter((p) => p.placement === placement)
      .reduce((m, p) => Math.max(m, p.sort_order), -1)
    const now = new Date().toISOString()
    const row: HomePin = {
      id: homePinIdCounter++,
      placement,
      placement_label: PLACEMENT_LABELS[placement] ?? placement,
      target_type: body.target_type,
      target_id: String(body.target_id),
      target_label: body.target_label?.trim() || listing?.title || '',
      partner_label: body.partner_label?.trim() || 'Featured',
      region: body.region?.trim() || '',
      sort_order: body.sort_order ?? maxOrder + 1,
      starts_at: null,
      ends_at: null,
      is_active,
      created_by_username: currentUser,
      created_at: now,
      updated_at: now,
    }
    mockHomePins = [...mockHomePins, row]
    pushAudit(`Home pin — ${row.target_label || row.target_id}`, 'listing')
    return row
  }

  if (pathname === '/api/accounts/admin/home-pins/reorder' && method === 'POST') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as { placement: string; ordered_ids: number[] }
    const placement = body.placement
    const orderedIds = body.ordered_ids || []
    orderedIds.forEach((id, index) => {
      const idx = mockHomePins.findIndex((p) => p.id === id && p.placement === placement)
      if (idx >= 0) {
        mockHomePins[idx] = {
          ...mockHomePins[idx],
          sort_order: index,
          updated_at: new Date().toISOString(),
        }
      }
    })
    pushAudit(`Home pins reordered — ${placement}`, 'system')
    return mockHomePins
      .filter((p) => p.placement === placement)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  }

  const homePinDetailMatch = pathname.match(/^\/api\/accounts\/admin\/home-pins\/(\d+)$/)
  if (homePinDetailMatch && method === 'PATCH') {
    requireStaff()
    const id = Number(homePinDetailMatch[1])
    const idx = mockHomePins.findIndex((p) => p.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as Partial<HomePin>
    if (body.is_active === true && !mockHomePins[idx].is_active) {
      const activeCount = mockHomePins.filter(
        (p) => p.placement === mockHomePins[idx].placement && p.is_active && p.id !== id,
      ).length
      if (activeCount >= MAX_HOME_PINS) {
        throw new ApiError('Bad request', 400, {
          detail: `At most ${MAX_HOME_PINS} active pins per homepage rail.`,
        })
      }
    }
    mockHomePins[idx] = {
      ...mockHomePins[idx],
      partner_label: body.partner_label ?? mockHomePins[idx].partner_label,
      target_label: body.target_label ?? mockHomePins[idx].target_label,
      region: body.region ?? mockHomePins[idx].region,
      sort_order: body.sort_order ?? mockHomePins[idx].sort_order,
      is_active: body.is_active ?? mockHomePins[idx].is_active,
      starts_at: body.starts_at !== undefined ? body.starts_at : mockHomePins[idx].starts_at,
      ends_at: body.ends_at !== undefined ? body.ends_at : mockHomePins[idx].ends_at,
      updated_at: new Date().toISOString(),
    }
    pushAudit(`Home pin updated — ${mockHomePins[idx].target_label}`, 'listing')
    return mockHomePins[idx]
  }

  if (homePinDetailMatch && method === 'DELETE') {
    requireStaff()
    const id = Number(homePinDetailMatch[1])
    const idx = mockHomePins.findIndex((p) => p.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const label = mockHomePins[idx].target_label
    mockHomePins = mockHomePins.filter((p) => p.id !== id)
    pushAudit(`Home pin removed — ${label}`, 'listing')
    return undefined
  }

  const refreshStoryChannels = () => {
    mockHomeStoryChannels = mockHomeStoryChannels.map((c) => ({
      ...c,
      active_slides: mockHomeStorySlides.filter((s) => s.channel_id === c.channel_id && s.is_active).length,
    }))
  }

  if (pathname === '/api/accounts/admin/home-story-channels' && method === 'GET') {
    requireStaff()
    refreshStoryChannels()
    return mockHomeStoryChannels
  }

  const storyChannelMatch = pathname.match(/^\/api\/accounts\/admin\/home-story-channels\/([^/]+)$/)
  if (storyChannelMatch && method === 'PATCH') {
    requireStaff()
    const channelId = decodeURIComponent(storyChannelMatch[1])
    const idx = mockHomeStoryChannels.findIndex((c) => c.channel_id === channelId)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Invalid channel.' })
    const body = JSON.parse(String(init.body)) as { auto_fill?: boolean }
    mockHomeStoryChannels[idx] = {
      ...mockHomeStoryChannels[idx],
      auto_fill: body.auto_fill ?? mockHomeStoryChannels[idx].auto_fill,
      updated_by_username: currentUser,
      updated_at: new Date().toISOString(),
    }
    pushAudit(`Home story channel — ${channelId} auto_fill=${mockHomeStoryChannels[idx].auto_fill}`, 'system')
    refreshStoryChannels()
    return mockHomeStoryChannels[idx]
  }

  if (pathname === '/api/accounts/admin/home-story-slides' && method === 'GET') {
    requireStaff()
    const channel = params.get('channel') || ''
    let rows = [...mockHomeStorySlides]
    if (channel) rows = rows.filter((s) => s.channel_id === channel)
    return rows.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  }

  if (pathname === '/api/accounts/admin/home-story-slides' && method === 'POST') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as {
      channel_id: string
      source_type: string
      target_id?: string
      target_label?: string
      headline?: string
      sub?: string
      cta_path?: string
      cta_label?: string
      media_url?: string
      media_kind?: 'image' | 'video'
      is_active?: boolean
    }
    const channelId = body.channel_id
    if (!HOME_STORY_CHANNELS.some((c) => c.id === channelId)) {
      throw new ApiError('Bad request', 400, { detail: 'Invalid channel.' })
    }
    const is_active = body.is_active !== false
    if (is_active) {
      const activeCount = mockHomeStorySlides.filter((s) => s.channel_id === channelId && s.is_active).length
      if (activeCount >= MAX_HOME_STORY_SLIDES) {
        throw new ApiError('Bad request', 400, {
          detail: `At most ${MAX_HOME_STORY_SLIDES} active slides per channel.`,
        })
      }
    }
    if (body.source_type === 'custom' && !body.media_url?.trim()) {
      throw new ApiError('Bad request', 400, { detail: 'media_url is required for custom slides.' })
    }
    const sourceLabel =
      HOME_STORY_SOURCE_TYPES.find((s) => s.value === body.source_type)?.label ?? body.source_type
    const maxOrder = mockHomeStorySlides
      .filter((s) => s.channel_id === channelId)
      .reduce((m, s) => Math.max(m, s.sort_order), -1)
    const now = new Date().toISOString()
    const channelLabel = HOME_STORY_CHANNELS.find((c) => c.id === channelId)?.label ?? channelId
    const listing = DEMO_LISTINGS.find((l) => String(l.listing_id) === String(body.target_id))
    const row: HomeStorySlide = {
      id: homeStorySlideIdCounter++,
      channel_id: channelId,
      channel_label: channelLabel,
      source_type: body.source_type,
      source_type_label: sourceLabel,
      target_id: body.target_id ?? '',
      target_label: body.target_label?.trim() || listing?.title || '',
      headline: body.headline?.trim() || '',
      sub: body.sub?.trim() || '',
      cta_path: body.cta_path?.trim() || '',
      cta_label: body.cta_label?.trim() || '',
      media_url: body.media_url?.trim() || '',
      media_kind: body.media_kind === 'video' ? 'video' : 'image',
      sort_order: maxOrder + 1,
      starts_at: null,
      ends_at: null,
      is_active,
      created_by_username: currentUser,
      created_at: now,
      updated_at: now,
    }
    mockHomeStorySlides = [...mockHomeStorySlides, row]
    pushAudit(`Home story slide — ${row.headline || row.target_label || row.id}`, 'listing')
    refreshStoryChannels()
    return row
  }

  if (pathname === '/api/accounts/admin/home-story-slides/reorder' && method === 'POST') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as { channel_id: string; ordered_ids: number[] }
    const channelId = body.channel_id
    ;(body.ordered_ids || []).forEach((id, index) => {
      const idx = mockHomeStorySlides.findIndex((s) => s.id === id && s.channel_id === channelId)
      if (idx >= 0) {
        mockHomeStorySlides[idx] = {
          ...mockHomeStorySlides[idx],
          sort_order: index,
          updated_at: new Date().toISOString(),
        }
      }
    })
    pushAudit(`Home story slides reordered — ${channelId}`, 'system')
    return mockHomeStorySlides
      .filter((s) => s.channel_id === channelId)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  }

  const storySlideMatch = pathname.match(/^\/api\/accounts\/admin\/home-story-slides\/(\d+)$/)
  if (storySlideMatch && method === 'PATCH') {
    requireStaff()
    const id = Number(storySlideMatch[1])
    const idx = mockHomeStorySlides.findIndex((s) => s.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as Partial<HomeStorySlide>
    if (body.is_active === true && !mockHomeStorySlides[idx].is_active) {
      const activeCount = mockHomeStorySlides.filter(
        (s) =>
          s.channel_id === mockHomeStorySlides[idx].channel_id && s.is_active && s.id !== id,
      ).length
      if (activeCount >= MAX_HOME_STORY_SLIDES) {
        throw new ApiError('Bad request', 400, {
          detail: `At most ${MAX_HOME_STORY_SLIDES} active slides per channel.`,
        })
      }
    }
    mockHomeStorySlides[idx] = {
      ...mockHomeStorySlides[idx],
      headline: body.headline ?? mockHomeStorySlides[idx].headline,
      sub: body.sub ?? mockHomeStorySlides[idx].sub,
      cta_path: body.cta_path ?? mockHomeStorySlides[idx].cta_path,
      cta_label: body.cta_label ?? mockHomeStorySlides[idx].cta_label,
      media_url: body.media_url ?? mockHomeStorySlides[idx].media_url,
      media_kind: body.media_kind ?? mockHomeStorySlides[idx].media_kind,
      is_active: body.is_active ?? mockHomeStorySlides[idx].is_active,
      sort_order: body.sort_order ?? mockHomeStorySlides[idx].sort_order,
      updated_at: new Date().toISOString(),
    }
    pushAudit(`Home story slide updated — ${mockHomeStorySlides[idx].headline}`, 'listing')
    refreshStoryChannels()
    return mockHomeStorySlides[idx]
  }

  if (storySlideMatch && method === 'DELETE') {
    requireStaff()
    const id = Number(storySlideMatch[1])
    const idx = mockHomeStorySlides.findIndex((s) => s.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const label = mockHomeStorySlides[idx].headline || mockHomeStorySlides[idx].target_label
    mockHomeStorySlides = mockHomeStorySlides.filter((s) => s.id !== id)
    pushAudit(`Home story slide removed — ${label}`, 'listing')
    refreshStoryChannels()
    return undefined
  }

  if (pathname === '/api/accounts/admin/promotions' && method === 'GET') {
    requireStaff()
    mockPromotions = mockPromotions.map(refreshPromotionStatus)
    let rows = [...mockPromotions]
    const statusFilter = params.get('status')
    const placement = params.get('placement')
    if (statusFilter) rows = rows.filter((c) => c.status === statusFilter)
    if (placement) rows = rows.filter((c) => c.placement === placement)
    return rows.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  }

  if (pathname === '/api/accounts/admin/promotions/conflicts' && method === 'GET') {
    requireStaff()
    return mockPromotionConflicts(params)
  }

  if (pathname === '/api/accounts/admin/promotions' && method === 'POST') {
    requireStaff()
    const body = JSON.parse(String(init.body)) as {
      placement: string
      target_type: string
      target_id: string
      target_label?: string
      region?: string
      starts_at: string
      ends_at: string
      priority?: number
      label?: string
      admin_notes?: string
    }
    const conflictParams = new URLSearchParams({
      placement: body.placement,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      region: body.region ?? '',
    })
    if (body.placement === 'category_spotlight') conflictParams.set('target_type', body.target_type)
    const conflict = mockPromotionConflicts(conflictParams)
    if (conflict.has_conflict) {
      throw new ApiError('Bad request', 400, { non_field_errors: conflict.warnings })
    }
    const row: PromotionCampaign = refreshPromotionStatus({
      id: promotionIdCounter++,
      placement: body.placement,
      placement_label: PLACEMENT_LABELS[body.placement] ?? body.placement,
      target_type: body.target_type,
      target_type_label: body.target_type,
      target_id: body.target_id,
      target_label: body.target_label ?? '',
      region: body.region ?? '',
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      status: 'scheduled',
      status_label: 'Scheduled',
      is_live: false,
      priority: body.priority ?? 0,
      label: body.label?.trim() || 'Featured Partner',
      admin_notes: body.admin_notes ?? '',
      provider_notes: '',
      rejection_reason: '',
      product_id: null,
      product_name: null,
      amount_cents: 0,
      currency: 'NAD',
      payment_status: 'pending',
      payment_ref: '',
      receipt_number: '',
      paid_at: null,
      refund_amount_cents: 0,
      created_by_username: currentUser!,
      requested_by_username: null,
      reviewed_by_username: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    mockPromotions = [row, ...mockPromotions]
    pushAudit(`Featured partner campaign — ${row.target_label}`, 'listing')
    return row
  }

  const promotionDetailMatch = pathname.match(/^\/api\/accounts\/admin\/promotions\/(\d+)$/)
  if (promotionDetailMatch && method === 'PATCH') {
    requireStaff()
    const id = Number(promotionDetailMatch[1])
    const idx = mockPromotions.findIndex((c) => c.id === id)
    if (idx < 0) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as {
      cancel?: boolean
      status?: string
      approve?: boolean
      reject?: boolean
      rejection_reason?: string
    }
    if (body.approve) {
      if (mockPromotions[idx].status !== 'requested') {
        throw new ApiError('Bad request', 400, { detail: 'Only requested campaigns can be approved.' })
      }
      const row = mockPromotions[idx]
      const conflictParams = new URLSearchParams({
        placement: row.placement,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        region: row.region ?? '',
        exclude_id: String(row.id),
      })
      if (row.placement === 'category_spotlight') conflictParams.set('target_type', row.target_type)
      const conflict = mockPromotionConflicts(conflictParams)
      if (conflict.has_conflict) {
        throw new ApiError('Bad request', 400, { non_field_errors: conflict.warnings })
      }
      mockPromotions[idx] = refreshPromotionStatus({
        ...mockPromotions[idx],
        status: 'scheduled',
        status_label: 'Scheduled',
        reviewed_by_username: currentUser!,
        reviewed_at: new Date().toISOString(),
        rejection_reason: '',
        updated_at: new Date().toISOString(),
      })
      pushAudit(`Promotion approved — ${mockPromotions[idx].target_label}`, 'listing')
      return mockPromotions[idx]
    }
    if (body.reject) {
      if (mockPromotions[idx].status !== 'requested') {
        throw new ApiError('Bad request', 400, { detail: 'Only requested campaigns can be rejected.' })
      }
      const reason = (body.rejection_reason || '').trim()
      if (!reason) throw new ApiError('Bad request', 400, { detail: 'rejection_reason is required.' })
      mockPromotions[idx] = {
        ...mockPromotions[idx],
        status: 'rejected',
        status_label: 'Rejected',
        rejection_reason: reason,
        reviewed_by_username: currentUser!,
        reviewed_at: new Date().toISOString(),
        is_live: false,
        updated_at: new Date().toISOString(),
      }
      pushAudit(`Promotion rejected — ${mockPromotions[idx].target_label}`, 'listing')
      return mockPromotions[idx]
    }
    if (body.cancel || body.status === 'cancelled') {
      mockPromotions[idx] = {
        ...mockPromotions[idx],
        status: 'cancelled',
        status_label: 'Cancelled',
        is_live: false,
        updated_at: new Date().toISOString(),
      }
      pushAudit(`Campaign cancelled — ${mockPromotions[idx].target_label}`, 'listing')
      return mockPromotions[idx]
    }
    mockPromotions[idx] = refreshPromotionStatus(mockPromotions[idx])
    pushAudit(`Campaign updated — ${mockPromotions[idx].target_label}`, 'listing')
    return mockPromotions[idx]
  }

  const userDeleteMatch = pathname.match(/^\/api\/accounts\/admin\/users\/(\d+)\/delete$/)
  if (userDeleteMatch && method === 'POST') {
    requireStaff()
    const id = Number(userDeleteMatch[1])
    const user = mockUsers.find((u) => u.id === id)
    if (!user) throw new ApiError('Not found', 404, { detail: 'Not found.' })
    const body = JSON.parse(String(init.body)) as { confirm_username: string }
    if (body.confirm_username !== user.username) {
      throw new ApiError('Bad request', 400, { detail: 'confirm_username must match.' })
    }
    if (user.is_staff) throw new ApiError('Bad request', 400, { detail: 'Staff accounts cannot be deleted.' })
    mockUsers = mockUsers.map((u) =>
      u.id === id
        ? {
            ...u,
            username: `deleted_${id}`,
            email: `deleted_${id}@deleted.delve`,
            display_name: 'Deleted user',
            is_active: false,
          }
        : u,
    )
    pushAudit(`Account deleted (GDPR) — @${body.confirm_username}`, 'user')
    return { detail: 'Account deleted. Personal data anonymized.', id, username: `deleted_${id}` }
  }

  throw new ApiError(`Mock route not found: ${method} ${pathname}`, 404, null)
}

export function mockLogout() {
  currentUser = null
  localStorage.removeItem('delve_admin_mock_user')
}

if (currentUser && !profiles[currentUser]) {
  currentUser = null
  localStorage.removeItem('delve_admin_mock_user')
}
