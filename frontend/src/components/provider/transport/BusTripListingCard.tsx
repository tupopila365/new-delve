import { Link } from 'react-router-dom'
import { Bus } from 'lucide-react'
import { busRouteTitle } from '../../../utils/transportListing'
import type { ProviderBusTripListing } from './busTripListingTypes'
import { busTripCompleteness } from './busTripListingTypes'

type Props = {
  trip: ProviderBusTripListing
  canEdit?: boolean
  onEdit: () => void
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-NA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function BusTripListingCard({ trip, canEdit, onEdit }: Props) {
  const { percent, missing } = busTripCompleteness(trip)
  const occ = trip.occupied_seats?.length ?? 0
  const pct = trip.total_seats > 0 ? Math.round((occ / trip.total_seats) * 100) : 0

  return (
    <article className="prov-ui__card transport-list-card">
      <div className="transport-list-card__thumb">
        {trip.route_detail.cover_image ? (
          <img src={trip.route_detail.cover_image} alt="" />
        ) : (
          <span className="transport-list-card__thumb-fallback" aria-hidden>
            <Bus size={22} strokeWidth={2} />
          </span>
        )}
        {percent < 100 ? (
          <span className="transport-list-card__badge transport-list-card__badge--draft" title="Listing checklist incomplete">
            Needs info · {percent}%
          </span>
        ) : null}
      </div>

      <div className="transport-list-card__body">
        <div className="transport-list-card__head">
          <h3 className="transport-list-card__title">{busRouteTitle(trip)}</h3>
          <span className={`transport-list-card__status${trip.is_active ? ' transport-list-card__status--live' : ''}`}>
            {trip.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="transport-list-card__meta">{trip.route_detail.operator_name}</p>
        <p className="transport-list-card__meta">
          {fmtWhen(trip.departs_at)} · N${trip.price}/passenger · {trip.total_seats} seats
        </p>
        <div className="transport-capacity">
          <div className="transport-capacity__bar" aria-hidden>
            <div className="transport-capacity__fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="transport-capacity__label">{occ}/{trip.total_seats} booked · {pct}% full</span>
        </div>
        {missing.length > 0 ? (
          <p className="transport-list-card__missing">Still needed: {missing.slice(0, 3).join(', ')}</p>
        ) : null}
      </div>

      <div className="transport-list-card__actions">
        <Link to={`/transport/bus/${trip.id}`} className="prov-ui__btn prov-ui__btn--ghost">View public</Link>
        {canEdit ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={onEdit}>Edit trip</button>
        ) : null}
      </div>
    </article>
  )
}
