import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import { apiFetch, asArray } from '../api/client'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import {
  ProviderDashboardAnalytics,
  ProviderDashboardDelvers,
  ProviderDashboardAttention,
  ProviderDashboardHeader,
  ProviderDashboardRecentBookings,
  ProviderDashboardShortcuts,
  ProviderDashboardStats,
} from '../components/provider/dashboard'
import { ProviderUiPage } from '../components/provider/ui'
import {
  enrichAnalyticsWithEventApi,
  enrichAnalyticsWithStayApi,
  getProviderAnalytics,
  type UserPostAnalytics,
} from '../data/providerAnalytics'
import { getAttentionItems, getBookingStats, getListingStats } from '../data/providerData'
import { useProviderEventAnalytics, useProviderEventBookings } from '../hooks/useProviderEventData'
import { useProviderListings } from '../hooks/useProviderListings'
import { useProviderMergedBookings } from '../hooks/useProviderMergedBookings'
import { useProviderStayAnalytics } from '../hooks/useProviderStayData'
import { useNavBadges } from '../hooks/useNavBadges'
import { categoriesForBusinessTypes } from '../utils/providerCategories'

type ListingQuestionRow = {
  id: number
  answers?: unknown[]
}

export function ProviderDashboard() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])
  const includeEvents = allowedCategories.length === 0 || allowedCategories.includes('Event')
  const includeStays = allowedCategories.length === 0 || allowedCategories.includes('Stay')

  const listings = useProviderListings(owner)
  const bookings = useProviderMergedBookings({ allowedCategories })
  const { unreadMessages } = useNavBadges()

  const { data: questionRows = [] } = useQuery({
    queryKey: ['provider-listing-questions'],
    queryFn: async () =>
      asArray<ListingQuestionRow>(await apiFetch('/api/accounts/provider/listing-questions/')),
  })

  const unansweredQuestions = useMemo(
    () => questionRows.filter((q) => !(q.answers?.length ?? 0)).length,
    [questionRows],
  )

  const eventListings = useMemo(() => listings.filter((l) => l.category === 'Event'), [listings])
  const stayListings = useMemo(() => listings.filter((l) => l.category === 'Stay'), [listings])
  const { data: eventBookings = [] } = useProviderEventBookings(includeEvents)
  const { data: eventAnalytics } = useProviderEventAnalytics('30d', includeEvents)
  const { data: stayAnalytics } = useProviderStayAnalytics(includeStays, 30)

  const { data: userPosts = [] } = useQuery({
    queryKey: ['provider-analytics-posts', owner],
    queryFn: async () => {
      const rows = await apiFetch<UserPostAnalytics[]>(
        `/api/social/users/${encodeURIComponent(owner!)}/posts/`,
      )
      return asArray<UserPostAnalytics>(rows)
    },
    enabled: Boolean(owner),
  })

  const listingStats = getListingStats(listings)
  const bookingStats = getBookingStats(bookings)
  const attention = getAttentionItems(listings, bookings, {
    unreadMessages,
    unansweredQuestions,
  })
  const analytics = useMemo(() => {
    let base = getProviderAnalytics(owner, businessTypes, '30d', listings, bookings, userPosts)
    if (includeEvents) {
      base = enrichAnalyticsWithEventApi(base, eventAnalytics, eventListings, eventBookings)
    }
    if (includeStays) {
      base = enrichAnalyticsWithStayApi(base, stayListings, bookings.filter((b) => b.category === 'Stay'), '30d')
    }
    if (stayAnalytics && includeStays) {
      base = {
        ...base,
        summary: {
          ...base.summary,
          revenue: Math.max(base.summary.revenue, stayAnalytics.on_platform_revenue ?? 0),
        },
      }
    }
    return base
  }, [
    owner,
    businessTypes,
    listings,
    bookings,
    userPosts,
    includeEvents,
    includeStays,
    eventAnalytics,
    eventListings,
    eventBookings,
    stayListings,
    stayAnalytics,
  ])

  return (
    <ProviderUiPage>
      <ProviderDashboardHeader
        businessName={activeBusiness?.business_name ?? 'Overview'}
        verificationStatus={activeBusiness?.verification_status}
      />

      <ProviderDashboardAttention items={attention} />

      <ProviderDashboardStats
        stats={[
          { value: listingStats.total, label: 'Listings' },
          { value: bookingStats.pending, label: 'Pending', highlight: bookingStats.pending > 0 },
          { value: bookingStats.confirmed, label: 'Confirmed' },
          { value: analytics.summary.avgRating, label: 'Rating' },
        ]}
      />

      <ProviderDashboardAnalytics data={analytics} />

      <ProviderDashboardDelvers />

      <ProviderDashboardShortcuts businessTypes={businessTypes} businessId={activeBusiness?.id} />

      <ProviderDashboardRecentBookings bookings={bookings} />
    </ProviderUiPage>
  )
}
