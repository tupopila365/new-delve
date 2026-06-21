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
  getProviderAnalytics,
  type AnalyticsPeriod,
} from '../data/providerAnalytics'
import '../components/provider/analytics/provider-analytics.css'

const PERIOD_CHIPS = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
] as const

export function ProviderAnalytics() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')

  const data = useMemo(
    () =>
      getProviderAnalytics(
        activeBusiness?.owner_username,
        activeBusiness?.business_types ?? [],
        period,
      ),
    [activeBusiness?.owner_username, activeBusiness?.business_types, period],
  )

  const topInsight = useMemo(() => {
    const top = data.topListings[0]
    if (!top) return 'Add listings and share stories to start collecting interaction data.'
    return `“${top.title}” is your top performer with ${top.views} views and ${top.bookings} bookings this period.`
  }, [data.topListings])

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
