import { AlertTriangle, ClipboardList, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProviderListing } from '../../data/providerData'
import { ProviderStatusBadge } from './ProviderStatusBadge'

type Props = {
  listing: ProviderListing
}

export function ProviderListingRow({ listing }: Props) {
  return (
    <article className="prov-ui-listing">
      <div className="prov-ui-listing__thumb">
        {listing.image ? (
          <img src={listing.image} alt="" />
        ) : (
          <ClipboardList size={22} strokeWidth={2} aria-hidden />
        )}
      </div>
      <div className="prov-ui-listing__main">
        <div className="prov-ui-listing__title-row">
          <strong>{listing.title}</strong>
          <ProviderStatusBadge status={listing.status} />
        </div>
        <span className="prov-ui-listing__meta">
          {listing.category} · {[listing.city, listing.region].filter(Boolean).join(', ')} · {listing.price}
        </span>
        <span className="prov-ui-listing__meta prov-ui-listing__meta--row">
          <Star size={13} strokeWidth={2.25} aria-hidden />
          {listing.rating} ({listing.ratingCount}) · {listing.bookings} bookings · {listing.views} views · Updated{' '}
          {listing.updated}
        </span>
        {listing.healthIssue ? (
          <span className="prov-ui-listing__meta prov-ui-listing__meta--warn">
            <AlertTriangle size={13} strokeWidth={2.25} aria-hidden />
            {listing.healthIssue}
          </span>
        ) : null}
      </div>
      <div className="prov-ui-listing__actions">
        <Link to={listing.publicPath} className="prov-ui__btn prov-ui__btn--ghost">
          View public
        </Link>
        <Link to={listing.editPath} className="prov-ui__btn prov-ui__btn--ghost">
          Edit
        </Link>
      </div>
    </article>
  )
}
