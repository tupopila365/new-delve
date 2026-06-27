import { mockPosts } from '../mocks/mockData'
import { categoriesForBusinessTypes } from '../utils/providerCategories'
import {
  getBookingStats,
  getProviderBookings,
  getProviderListings,
  type ListingCategory,
  type ProviderBooking,
  type ProviderListing,
} from './providerData'
import type { EventMonetizationApi } from '../hooks/useProviderEventData'

export type AnalyticsPeriod = '7d' | '30d' | '90d'

export type TrendPoint = {
  label: string
  value: number
}

export type CategoryMetric = {
  label: string
  value: number
  pct: number
}

export type TopListingMetric = {
  id: string
  title: string
  category: ListingCategory
  views: number
  bookings: number
  likes: number
  rating: string
  publicPath: string
}

export type PostEngagement = {
  id: number
  title: string
  type: 'Post' | 'Story'
  likes: number
  saves: number
  comments: number
  createdAt: string
}

export type FunnelStep = {
  id: string
  label: string
  value: number
  pct: number
}

export type ProviderAnalyticsSnapshot = {
  period: AnalyticsPeriod
  summary: {
    profileViews: number
    listingViews: number
    bookingRequests: number
    confirmedBookings: number
    revenue: number
    avgRating: string
    postEngagement: number
    conversionRate: number
  }
  deltas: {
    profileViews: number
    listingViews: number
    bookingRequests: number
    revenue: number
  }
  viewsTrend: TrendPoint[]
  bookingsTrend: TrendPoint[]
  bookingsByCategory: CategoryMetric[]
  engagementByType: CategoryMetric[]
  funnel: FunnelStep[]
  topListings: TopListingMetric[]
  topPosts: PostEngagement[]
}

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

export function analyticsPeriodLabel(period: AnalyticsPeriod) {
  return PERIOD_LABELS[period]
}

function ownerSeed(owner: string) {
  return owner.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

function periodScale(period: AnalyticsPeriod) {
  if (period === '7d') return 0.28
  if (period === '30d') return 1
  return 2.6
}

function demoLikes(seed: number | string) {
  const n = typeof seed === 'number' ? seed : ownerSeed(String(seed))
  return 8 + (n % 45)
}

function buildTrend(owner: string, period: AnalyticsPeriod, base: number, variance: number): TrendPoint[] {
  const days = period === '7d' ? 7 : period === '30d' ? 4 : 3
  const seed = ownerSeed(owner)
  const labels =
    period === '7d'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : period === '30d'
        ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
        : ['Month 1', 'Month 2', 'Month 3']

  return labels.slice(0, days).map((label, i) => ({
    label,
    value: Math.max(1, Math.round(base / days + ((seed + i * 7) % variance))),
  }))
}

function avgRating(listings: ProviderListing[]) {
  const rated = listings.filter((l) => l.rating !== '—' && l.ratingCount > 0)
  if (rated.length === 0) return '—'
  const sum = rated.reduce((s, l) => s + parseFloat(l.rating), 0)
  return (sum / rated.length).toFixed(1)
}

function scopeListings(owner: string, businessTypes: string[]) {
  const listings = getProviderListings(owner)
  const allowed = categoriesForBusinessTypes(businessTypes)
  if (allowed.length === 0) return listings
  return listings.filter((l) => allowed.includes(l.category))
}

function scopeBookings(businessTypes: string[]) {
  const bookings = getProviderBookings()
  const allowed = categoriesForBusinessTypes(businessTypes)
  if (allowed.length === 0) return bookings
  return bookings.filter((b) => allowed.includes(b.category))
}

export function getProviderAnalytics(
  owner: string | undefined,
  businessTypes: string[],
  period: AnalyticsPeriod = '30d',
  listingsOverride?: ProviderListing[],
): ProviderAnalyticsSnapshot {
  const scale = periodScale(period)
  const listings = listingsOverride ?? scopeListings(owner ?? '', businessTypes)
  const bookings = scopeBookings(businessTypes)
  const bookingStats = getBookingStats(bookings)

  const listingViews = Math.round(listings.reduce((s, l) => s + l.views, 0) * scale)
  const profileViews = Math.round(listingViews * 0.42 + (owner ? ownerSeed(owner) % 40 : 0))
  const bookingRequests = Math.max(bookings.length, Math.round(bookingStats.total * scale))
  const confirmedBookings = Math.round(bookingStats.confirmed * scale) || bookingStats.confirmed
  const revenue = Math.round(bookingStats.revenue * scale)

  const posts = owner
    ? mockPosts.filter((p) => p.author.username === owner)
    : []
  const postEngagement = posts.reduce(
    (s, p) => s + p.likes_count + p.saves_count + (p.comments_count ?? 0),
    0,
  )

  const conversionRate =
    listingViews > 0 ? Math.round((bookingRequests / listingViews) * 1000) / 10 : 0

  const categoryTotals = new Map<string, number>()
  for (const b of bookings) {
    categoryTotals.set(b.category, (categoryTotals.get(b.category) ?? 0) + 1)
  }
  const maxCategory = Math.max(1, ...categoryTotals.values())
  const bookingsByCategory: CategoryMetric[] = [...categoryTotals.entries()].map(([label, value]) => ({
    label,
    value: Math.round(value * scale) || value,
    pct: Math.round((value / maxCategory) * 100),
  }))

  const engagementTotals = new Map<string, number>()
  for (const l of listings) {
    engagementTotals.set(l.category, (engagementTotals.get(l.category) ?? 0) + l.views + l.bookings * 12)
  }
  const maxEngagement = Math.max(1, ...engagementTotals.values())
  const engagementByType: CategoryMetric[] = [...engagementTotals.entries()].map(([label, value]) => ({
    label,
    value: Math.round(value * scale),
    pct: Math.round((value / maxEngagement) * 100),
  }))

  const funnelBase = Math.max(profileViews, 1)
  const funnel: FunnelStep[] = [
    { id: 'profile', label: 'Profile views', value: profileViews, pct: 100 },
    {
      id: 'listings',
      label: 'Listing views',
      value: listingViews,
      pct: Math.round((listingViews / funnelBase) * 100),
    },
    {
      id: 'requests',
      label: 'Booking requests',
      value: bookingRequests,
      pct: Math.round((bookingRequests / funnelBase) * 100),
    },
    {
      id: 'confirmed',
      label: 'Confirmed bookings',
      value: confirmedBookings,
      pct: Math.round((confirmedBookings / funnelBase) * 100),
    },
  ]

  const topListings: TopListingMetric[] = [...listings]
    .map((l) => ({
      id: l.id,
      title: l.title,
      category: l.category,
      views: Math.round(l.views * scale),
      bookings: Math.round(l.bookings * scale) || l.bookings,
      likes: Math.max(0, Math.round(l.views / 3)),
      rating: l.rating,
      publicPath: l.publicPath,
    }))
    .sort((a, b) => b.views + b.bookings * 20 - (a.views + a.bookings * 20))
    .slice(0, 5)

  const topPosts: PostEngagement[] = posts
    .map((p) => ({
      id: p.id,
      title: p.body.length > 56 ? `${p.body.slice(0, 56)}…` : p.body,
      type: (p.is_accommodation_story ? 'Story' : p.is_delvers ? 'Post' : 'Post') as PostEngagement['type'],
      likes: p.likes_count,
      saves: p.saves_count,
      comments: p.comments_count ?? 0,
      createdAt: p.created_at,
    }))
    .sort((a, b) => b.likes + b.saves + b.comments - (a.likes + a.saves + a.comments))
    .slice(0, 5)

  const seed = owner ? ownerSeed(owner) : 42

  return {
    period,
    summary: {
      profileViews,
      listingViews,
      bookingRequests,
      confirmedBookings,
      revenue,
      avgRating: avgRating(listings),
      postEngagement,
      conversionRate,
    },
    deltas: {
      profileViews: 6 + (seed % 18),
      listingViews: 4 + (seed % 22),
      bookingRequests: 2 + (seed % 12),
      revenue: 8 + (seed % 25),
    },
    viewsTrend: buildTrend(owner ?? 'x', period, listingViews, 18),
    bookingsTrend: buildTrend(owner ?? 'x', period, bookingRequests, 6),
    bookingsByCategory,
    engagementByType,
    funnel,
    topListings,
    topPosts,
  }
}

export function enrichAnalyticsWithEventApi(
  snapshot: ProviderAnalyticsSnapshot,
  eventApi: EventMonetizationApi | undefined,
  eventListings: ProviderListing[],
  eventBookings: ProviderBooking[],
): ProviderAnalyticsSnapshot {
  if (!eventApi && eventBookings.length === 0 && eventListings.length === 0) {
    return snapshot
  }

  const eventRevenue =
    eventApi?.on_platform_revenue ??
    eventBookings
      .filter((b) => !['cancelled', 'refunded'].includes(b.status))
      .reduce((s, b) => s + b.total, 0)

  const eventBookingRequests = eventApi?.total_bookings ?? eventBookings.length
  const eventConfirmed =
    eventApi?.confirmed_bookings ??
    eventBookings.filter((b) => ['confirmed', 'checked_in'].includes(b.status)).length

  const externalClicks = eventApi?.external_ticket_clicks ?? 0
  const eventListingViews = eventListings.reduce((s, l) => s + l.views, 0)

  const nonEventBookingsByCategory = snapshot.bookingsByCategory.filter((r) => r.label !== 'Event')
  const nonEventTopListings = snapshot.topListings.filter((l) => l.category !== 'Event')
  const nonEventEngagement = snapshot.engagementByType.filter((r) => r.label !== 'Event')

  const eventTopFromApi: TopListingMetric[] = (eventApi?.events ?? []).map((ev) => ({
    id: `event-${ev.id}`,
    title: ev.title,
    category: 'Event',
    views: ev.external_clicks + ev.bookings * 3,
    bookings: ev.confirmed_bookings || ev.bookings,
    likes: ev.external_clicks,
    rating: '—',
    publicPath: `/events/${ev.id}`,
  }))

  const eventTopFromListings: TopListingMetric[] = eventListings.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    views: l.views,
    bookings: l.bookings,
    likes: Math.max(0, Math.round(l.views / 3)),
    rating: l.rating,
    publicPath: l.publicPath,
  }))

  const eventTopSorted = [...(eventTopFromApi.length > 0 ? eventTopFromApi : eventTopFromListings)]
    .sort((a, b) => b.views + b.bookings * 20 - (a.views + a.bookings * 20))
    .slice(0, 5)

  const mockEventCategory = snapshot.bookingsByCategory.find((r) => r.label === 'Event')
  const eventCategoryValue = eventBookingRequests || mockEventCategory?.value || 0
  const bookingsByCategory = [
    ...nonEventBookingsByCategory,
    ...(eventCategoryValue > 0 ? [{ label: 'Event', value: eventCategoryValue, pct: 100 }] : []),
  ]
  const maxCategory = Math.max(1, ...bookingsByCategory.map((r) => r.value))
  for (const row of bookingsByCategory) {
    row.pct = Math.round((row.value / maxCategory) * 100)
  }

  const engagementByType = [
    ...nonEventEngagement,
    ...(eventListingViews + externalClicks > 0
      ? [{ label: 'Event', value: eventListingViews + externalClicks, pct: 100 }]
      : []),
  ]
  const maxEngagement = Math.max(1, ...engagementByType.map((r) => r.value))
  for (const row of engagementByType) {
    row.pct = Math.round((row.value / maxEngagement) * 100)
  }

  const listingViews =
    snapshot.summary.listingViews -
    (snapshot.topListings.filter((l) => l.category === 'Event').reduce((s, l) => s + l.views, 0)) +
    eventListingViews +
    externalClicks
  const bookingRequests =
    snapshot.summary.bookingRequests - (mockEventCategory?.value ?? 0) + eventBookingRequests
  const confirmedBookings =
    snapshot.summary.confirmedBookings -
    Math.min(mockEventCategory?.value ?? 0, snapshot.summary.confirmedBookings) +
    eventConfirmed
  const adjustedRevenue = snapshot.summary.revenue + eventRevenue

  const funnel = snapshot.funnel.map((step) => {
    if (step.id === 'listings') return { ...step, value: Math.max(listingViews, step.value) }
    if (step.id === 'requests') return { ...step, value: bookingRequests }
    if (step.id === 'confirmed') return { ...step, value: confirmedBookings }
    return step
  })

  return {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      listingViews: Math.max(listingViews, eventListingViews),
      bookingRequests,
      confirmedBookings,
      revenue: adjustedRevenue,
      conversionRate:
        listingViews > 0
          ? Math.round((bookingRequests / listingViews) * 1000) / 10
          : snapshot.summary.conversionRate,
    },
    bookingsByCategory,
    engagementByType,
    funnel,
    topListings: [...eventTopSorted, ...nonEventTopListings].slice(0, 5),
  }
}

function filterBookingsByPeriod(bookings: ProviderBooking[], period: AnalyticsPeriod): ProviderBooking[] {
  const days = PERIOD_DAYS[period] ?? 30
  const cutoff = Date.now() - days * 86400000
  return bookings.filter((b) => {
    if (!b.requestedAt) return true
    const t = new Date(b.requestedAt).getTime()
    return Number.isNaN(t) || t >= cutoff
  })
}

export function enrichAnalyticsWithStayApi(
  snapshot: ProviderAnalyticsSnapshot,
  stayListings: ProviderListing[],
  stayBookings: ProviderBooking[],
  period: AnalyticsPeriod = '30d',
): ProviderAnalyticsSnapshot {
  if (stayBookings.length === 0 && stayListings.length === 0) {
    return snapshot
  }

  const scopedBookings = filterBookingsByPeriod(stayBookings, period)
  const stayRevenue = scopedBookings
    .filter((b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status))
    .reduce((s, b) => s + b.total, 0)
  const stayBookingRequests = scopedBookings.length
  const stayConfirmed = scopedBookings.filter((b) =>
    ['confirmed', 'checked_in', 'checked_out'].includes(b.status),
  ).length
  const stayListingViews = stayListings.reduce((s, l) => s + l.views, 0)
  const stayEngagement = stayListings.reduce((s, l) => s + l.views, 0)

  const nonStayBookingsByCategory = snapshot.bookingsByCategory.filter((r) => r.label !== 'Stay')
  const nonStayTopListings = snapshot.topListings.filter((l) => l.category !== 'Stay')
  const nonStayEngagement = snapshot.engagementByType.filter((r) => r.label !== 'Stay')

  const bookingsByListing = new Map<string, number>()
  for (const b of scopedBookings) {
    bookingsByListing.set(b.service, (bookingsByListing.get(b.service) ?? 0) + 1)
  }

  const stayTopFromListings: TopListingMetric[] = stayListings.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    views: l.views,
    bookings: bookingsByListing.get(l.title) ?? l.bookings,
    likes: Math.max(0, Math.round(l.views / 3)),
    rating: l.rating,
    publicPath: l.publicPath,
  }))

  const stayTopSorted = [...stayTopFromListings]
    .sort((a, b) => b.views + b.bookings * 20 - (a.views + a.bookings * 20))
    .slice(0, 5)

  const mockStayCategory = snapshot.bookingsByCategory.find((r) => r.label === 'Stay')
  const stayCategoryValue = stayBookingRequests || mockStayCategory?.value || 0
  const bookingsByCategory = [
    ...nonStayBookingsByCategory,
    ...(stayCategoryValue > 0 ? [{ label: 'Stay', value: stayCategoryValue, pct: 100 }] : []),
  ]
  const maxCategory = Math.max(1, ...bookingsByCategory.map((r) => r.value))
  for (const row of bookingsByCategory) {
    row.pct = Math.round((row.value / maxCategory) * 100)
  }

  const engagementByType = [
    ...nonStayEngagement,
    ...(stayEngagement > 0
      ? [{ label: 'Stay', value: stayEngagement, pct: 100 }]
      : []),
  ]
  const maxEngagement = Math.max(1, ...engagementByType.map((r) => r.value))
  for (const row of engagementByType) {
    row.pct = Math.round((row.value / maxEngagement) * 100)
  }

  const mockStayViews = snapshot.topListings
    .filter((l) => l.category === 'Stay')
    .reduce((s, l) => s + l.views, 0)
  const listingViews =
    snapshot.summary.listingViews - mockStayViews + stayListingViews
  const bookingRequests =
    snapshot.summary.bookingRequests - (mockStayCategory?.value ?? 0) + stayBookingRequests
  const confirmedBookings =
    snapshot.summary.confirmedBookings -
    Math.min(mockStayCategory?.value ?? 0, snapshot.summary.confirmedBookings) +
    stayConfirmed
  const adjustedRevenue = snapshot.summary.revenue + stayRevenue

  const funnel = snapshot.funnel.map((step) => {
    if (step.id === 'listings') return { ...step, value: Math.max(listingViews, step.value) }
    if (step.id === 'requests') return { ...step, value: bookingRequests }
    if (step.id === 'confirmed') return { ...step, value: confirmedBookings }
    return step
  })

  return {
    ...snapshot,
    summary: {
      ...snapshot.summary,
      listingViews: Math.max(listingViews, stayListingViews),
      bookingRequests,
      confirmedBookings,
      revenue: adjustedRevenue,
      conversionRate:
        listingViews > 0
          ? Math.round((bookingRequests / listingViews) * 1000) / 10
          : snapshot.summary.conversionRate,
    },
    bookingsByCategory,
    engagementByType,
    funnel,
    topListings: [...stayTopSorted, ...nonStayTopListings].slice(0, 5),
  }
}
