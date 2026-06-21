import { Link } from 'react-router-dom'
import type { TopListingMetric } from '../../../data/providerAnalytics'

type Props = {
  listings: TopListingMetric[]
}

export function ProviderAnalyticsTopListings({ listings }: Props) {
  if (listings.length === 0) {
    return (
      <section className="prov-analytics__card">
        <h2 className="prov-analytics__card-title">Top listings</h2>
        <p className="prov-analytics__insight">Publish listings to start tracking views and bookings.</p>
      </section>
    )
  }

  return (
    <section className="prov-analytics__card">
      <h2 className="prov-analytics__card-title">Top listings</h2>
      <ol className="prov-analytics__rank-list">
        {listings.map((listing, index) => (
          <li key={listing.id} className="prov-analytics__rank-item">
            <span className="prov-analytics__rank-num">{index + 1}</span>
            <Link to={listing.publicPath} className="prov-analytics__rank-copy">
              <strong>{listing.title}</strong>
              <span>
                {listing.category} · {listing.views} views · {listing.bookings} bookings · {listing.likes} likes
              </span>
            </Link>
            <span className="prov-analytics__rank-metric">{listing.rating !== '—' ? listing.rating : '—'}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
