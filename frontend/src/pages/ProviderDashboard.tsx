import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import {
  ProviderDashboardAnalytics,
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
} from '../data/providerAnalytics'
import {
  getAttentionItems,
  getBookingStats,
  getListingStats,
  getProviderBookings,
} from '../data/providerData'
import { mergeProviderBookings, useProviderEventBookings } from '../hooks/useProviderEventData'
import { useProviderListings } from '../hooks/useProviderListings'
import { useProviderStayBookings } from '../hooks/useProviderStayData'
import { categoriesForBusinessTypes } from '../utils/providerCategories'

export function ProviderDashboard() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])
  const includeEvents = allowedCategories.length === 0 || allowedCategories.includes('Event')
  const includeStays = allowedCategories.length === 0 || allowedCategories.includes('Stay')

  const listings = useProviderListings(owner)
  const eventListings = useMemo(() => listings.filter((l) => l.category === 'Event'), [listings])
  const stayListings = useMemo(() => listings.filter((l) => l.category === 'Stay'), [listings])
  const { data: eventBookings = [] } = useProviderEventBookings(includeEvents)
  const { data: stayBookings = [] } = useProviderStayBookings(includeStays)

  const bookings = useMemo(
    () => mergeProviderBookings(getProviderBookings(), eventBookings, allowedCategories, stayBookings),
    [eventBookings, stayBookings, allowedCategories],
  )

  const listingStats = getListingStats(listings)
  const bookingStats = getBookingStats(bookings)
  const attention = getAttentionItems(listings, bookings)
  const analytics = useMemo(() => {
    let base = getProviderAnalytics(owner, businessTypes, '30d', listings)
    if (includeEvents) {
      base = enrichAnalyticsWithEventApi(base, undefined, eventListings, eventBookings)
    }
    if (includeStays) {
      base = enrichAnalyticsWithStayApi(base, stayListings, stayBookings, '30d')
    }
    return base
  }, [
    owner,
    businessTypes,
    listings,
    includeEvents,
    includeStays,
    eventListings,
    eventBookings,
    stayListings,
    stayBookings,
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

      <ProviderDashboardShortcuts businessTypes={businessTypes} businessId={activeBusiness?.id} />

      <ProviderDashboardRecentBookings bookings={bookings} />
    </ProviderUiPage>
  )
}
