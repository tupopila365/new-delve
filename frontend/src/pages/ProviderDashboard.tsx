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
import { getProviderAnalytics } from '../data/providerAnalytics'
import {
  getAttentionItems,
  getBookingStats,
  getListingStats,
  getProviderBookings,
  getProviderListings,
} from '../data/providerData'
import { categoriesForBusinessTypes } from '../utils/providerCategories'

export function ProviderDashboard() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])

  const listings = getProviderListings(owner)
  const allBookings = getProviderBookings()
  const bookings = useMemo(() => {
    if (allowedCategories.length === 0) return allBookings
    return allBookings.filter((b) => allowedCategories.includes(b.category))
  }, [allBookings, allowedCategories])

  const listingStats = getListingStats(listings)
  const bookingStats = getBookingStats(bookings)
  const attention = getAttentionItems(listings, bookings)
  const analytics = useMemo(
    () => getProviderAnalytics(owner, businessTypes, '30d'),
    [owner, businessTypes],
  )

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
