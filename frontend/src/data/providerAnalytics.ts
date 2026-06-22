import { mockPosts } from '../mocks/mockData'
import { categoriesForBusinessTypes } from '../utils/providerCategories'
import {
  getBookingStats,
  getProviderBookings,
  getProviderListings,
  type ListingCategory,
  type ProviderListing,
} from './providerData'

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
      likes: demoLikes(l.id),
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
