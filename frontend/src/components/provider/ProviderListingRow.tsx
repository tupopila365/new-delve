import { Link } from 'react-router-dom'
import type { ProviderListing } from '../../data/providerData'
import { ProviderStatusBadge } from './ProviderStatusBadge'

type Props = {
  listing: ProviderListing
}

export function ProviderListingRow({ listing }: Props) {
  return (
    <article className="prov-listing-row">
      <div className="prov-listing-row__thumb">
        {listing.image ? (
          <img src={listing.image} alt="" />
        ) : (
          <span aria-hidden>📋</span>
        )}
      </div>
      <div className="prov-listing-row__main">
        <div className="prov-listing-row__title-row">
          <strong>{listing.title}</strong>
          <ProviderStatusBadge status={listing.status} />
        </div>
        <span className="prov-listing-row__meta">
          {listing.category} · {[listing.city, listing.region].filter(Boolean).join(', ')} · {listing.price}
        </span>
        <span className="prov-listing-row__meta">
          ★ {listing.rating} ({listing.ratingCount}) · {listing.bookings} bookings · {listing.views} views · Updated{' '}
          {listing.updated}
        </span>
        {listing.healthIssue ? (
          <span className="prov-listing-row__issue">⚠ {listing.healthIssue}</span>
        ) : null}
      </div>
      <div className="prov-listing-row__actions">
        <Link to={listing.publicPath} className="btn btn-ghost btn--sm">
          View public
        </Link>
        <Link to={listing.editPath} className="btn btn-ghost btn--sm">
          Edit
        </Link>
        <button type="button" className="btn btn-ghost btn--sm" disabled title="Availability editor coming soon">
          Availability
        </button>
      </div>
    </article>
  )
}
