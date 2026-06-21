import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ProviderUiStats } from '../ui'
import type { ProviderAnalyticsSnapshot } from '../../../data/providerAnalytics'

type Props = {
  data: ProviderAnalyticsSnapshot
}

export function ProviderDashboardAnalytics({ data }: Props) {
  const { summary } = data

  return (
    <section>
      <div className="prov-ui__recent-head">
        <h2 className="prov-ui__section-title">Analytics snapshot</h2>
        <Link to="/provider/analytics" className="prov-ui__link">
          View all
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginLeft: 4 }} />
        </Link>
      </div>
      <ProviderUiStats
        columns={4}
        stats={[
          { value: summary.listingViews.toLocaleString(), label: 'Listing views', accent: true },
          { value: summary.bookingRequests, label: 'Requests' },
          { value: `${summary.conversionRate}%`, label: 'Conversion' },
          { value: summary.postEngagement, label: 'Post interactions' },
        ]}
      />
    </section>
  )
}
