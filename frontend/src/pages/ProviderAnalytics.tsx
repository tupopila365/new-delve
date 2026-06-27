import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import {
  ProviderAnalyticsBarChart,
  ProviderAnalyticsFunnel,
  ProviderAnalyticsPosts,
  ProviderAnalyticsSummary,
  ProviderAnalyticsTopListings,
  ProviderAnalyticsTrendChart,
} from '../components/provider/analytics'
import { ProviderUiChips, ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import {
  analyticsPeriodLabel,
  enrichAnalyticsWithEventApi,
  enrichAnalyticsWithStayApi,
  getProviderAnalytics,
  type AnalyticsPeriod,
} from '../data/providerAnalytics'
import { useProviderEventAnalytics, useProviderEventBookings } from '../hooks/useProviderEventData'
import { useProviderListings } from '../hooks/useProviderListings'
import { useProviderStayBookings } from '../hooks/useProviderStayData'
import { categoriesForBusinessTypes } from '../utils/providerCategories'
import '../components/provider/analytics/provider-analytics.css'

const PERIOD_CHIPS = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
] as const

export function ProviderAnalytics() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])
  const includeEvents = allowedCategories.length === 0 || allowedCategories.includes('Event')
  const includeStays = allowedCategories.length === 0 || allowedCategories.includes('Stay')

  const listings = useProviderListings(activeBusiness?.owner_username)
  const eventListings = useMemo(() => listings.filter((l) => l.category === 'Event'), [listings])
  const stayListings = useMemo(() => listings.filter((l) => l.category === 'Stay'), [listings])

  const { data: eventBookings = [] } = useProviderEventBookings(includeEvents)
  const { data: stayBookings = [] } = useProviderStayBookings(includeStays)
  const { data: eventAnalytics } = useProviderEventAnalytics(period, includeEvents)

  const data = useMemo(() => {
    let base = getProviderAnalytics(
      activeBusiness?.owner_username,
      businessTypes,
      period,
      listings,
    )
    if (includeEvents) {
      base = enrichAnalyticsWithEventApi(base, eventAnalytics, eventListings, eventBookings)
    }
    if (includeStays) {
      base = enrichAnalyticsWithStayApi(base, stayListings, stayBookings, period)
    }
    return base
  }, [
    activeBusiness?.owner_username,
    businessTypes,
    period,
    listings,
    includeEvents,
    includeStays,
    eventAnalytics,
    eventListings,
    eventBookings,
    stayListings,
    stayBookings,
  ])

  const topInsight = useMemo(() => {
    const top = data.topListings[0]
    if (!top) return 'Add listings and share stories to start collecting interaction data.'
    if (top.category === 'Event' && eventAnalytics?.external_ticket_clicks) {
      return `"${top.title}" leads your events with ${top.bookings} bookings and ${eventAnalytics.external_ticket_clicks} external ticket clicks this period.`
    }
    if (top.category === 'Stay') {
      return `"${top.title}" is your top stay with ${top.bookings} bookings and ${top.views} engagement points this period.`
    }
    return `"${top.title}" is your top performer with ${top.views} views and ${top.bookings} bookings this period.`
  }, [data.topListings, eventAnalytics?.external_ticket_clicks])

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Analytics"
        subtitle="See how travellers discover your business, engage with posts, and convert into bookings."
        actions={
          <Link to="/provider/listings" className="prov-ui__btn prov-ui__btn--ghost">
            View listings
          </Link>
        }
      />

      {includeEvents ? (
        <p className="prov-analytics__insight">
          Event metrics include on-platform revenue, RSVPs, and tracked external ticket clicks from{' '}
          <Link to="/provider/events" className="text-link">
            your events dashboard
          </Link>
          .
        </p>
      ) : null}

      {includeStays ? (
        <p className="prov-analytics__insight">
          Stay metrics use live bookings and listings from{' '}
          <Link to="/provider/stays" className="text-link">
            your stays dashboard
          </Link>
          .
        </p>
      ) : null}

      <ProviderUiChips
        chips={[...PERIOD_CHIPS]}
        active={period}
        onChange={(id) => setPeriod(id as AnalyticsPeriod)}
        ariaLabel="Analytics period"
      />

      <ProviderAnalyticsSummary data={data} />

      <p className="prov-analytics__insight">
        <strong>Insight:</strong> {topInsight}
      </p>

      <div className="prov-analytics__grid prov-analytics__grid--2">
        <ProviderAnalyticsTrendChart title={`Listing views · ${analyticsPeriodLabel(period)}`} points={data.viewsTrend} />
        <ProviderAnalyticsTrendChart title={`Booking requests · ${analyticsPeriodLabel(period)}`} points={data.bookingsTrend} />
      </div>

      <div className="prov-analytics__grid prov-analytics__grid--2">
        <ProviderAnalyticsBarChart title="Bookings by category" rows={data.bookingsByCategory} />
        <ProviderAnalyticsBarChart title="Engagement by service" rows={data.engagementByType} valueSuffix=" pts" />
      </div>

      <ProviderAnalyticsFunnel steps={data.funnel} />

      <div className="prov-analytics__grid prov-analytics__grid--2">
        <ProviderAnalyticsTopListings listings={data.topListings} />
        <ProviderAnalyticsPosts posts={data.topPosts} />
      </div>
    </ProviderUiPage>
  )
}
