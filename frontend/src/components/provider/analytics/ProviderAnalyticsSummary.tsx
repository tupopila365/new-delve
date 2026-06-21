import { TrendingDown, TrendingUp } from 'lucide-react'
import { ProviderUiStats } from '../ui'
import type { ProviderAnalyticsSnapshot } from '../../../data/providerAnalytics'
import { analyticsPeriodLabel } from '../../../data/providerAnalytics'

type Props = {
  data: ProviderAnalyticsSnapshot
}

function Delta({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span className={`prov-analytics__delta prov-analytics__delta--${up ? 'up' : 'down'}`}>
      {up ? <TrendingUp size={12} strokeWidth={2.5} aria-hidden /> : <TrendingDown size={12} strokeWidth={2.5} aria-hidden />}
      {up ? '+' : ''}
      {value}% vs prior period
    </span>
  )
}

export function ProviderAnalyticsSummary({ data }: Props) {
  const { summary, deltas, period } = data

  return (
    <section>
      <p className="prov-analytics__insight">
        <strong>{analyticsPeriodLabel(period)}</strong> — how travellers discover your business, interact with
        listings and posts, and convert into bookings.
      </p>
      <ProviderUiStats
        columns={4}
        stats={[
          {
            value: summary.profileViews.toLocaleString(),
            label: 'Profile views',
            accent: true,
          },
          { value: summary.listingViews.toLocaleString(), label: 'Listing views' },
          { value: summary.bookingRequests, label: 'Booking requests', accent: summary.bookingRequests > 0 },
          { value: `N$${summary.revenue.toLocaleString()}`, label: 'Revenue' },
          { value: summary.avgRating, label: 'Avg rating' },
          { value: `${summary.conversionRate}%`, label: 'View → booking' },
          { value: summary.confirmedBookings, label: 'Confirmed' },
          { value: summary.postEngagement.toLocaleString(), label: 'Post interactions' },
        ]}
      />
      <div className="prov-analytics__grid prov-analytics__grid--2" style={{ marginTop: 10 }}>
        <p className="prov-analytics__stat-note">
          Profile views <Delta value={deltas.profileViews} />
        </p>
        <p className="prov-analytics__stat-note">
          Listing views <Delta value={deltas.listingViews} />
        </p>
        <p className="prov-analytics__stat-note">
          Booking requests <Delta value={deltas.bookingRequests} />
        </p>
        <p className="prov-analytics__stat-note">
          Revenue <Delta value={deltas.revenue} />
        </p>
      </div>
    </section>
  )
}
