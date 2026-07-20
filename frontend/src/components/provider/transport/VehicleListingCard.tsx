import { Link } from 'react-router-dom'
import { Car } from 'lucide-react'
import { renterDocLabel } from '../../../data/renterDocuments'
import { vehicleTypeMeta } from '../../../utils/transportListing'
import type { ProviderVehicleListing } from './vehicleListingTypes'
import { vehicleCompleteness } from './vehicleListingTypes'

type Props = {
  vehicle: ProviderVehicleListing
  canEdit?: boolean
  onEdit: () => void
  onManageHighlights?: () => void
}

export function VehicleListingCard({ vehicle, canEdit, onEdit, onManageHighlights }: Props) {
  const { percent, missing } = vehicleCompleteness(vehicle)
  const typeMeta = vehicleTypeMeta(vehicle.vehicle_type)
  const highlightCount = vehicle.listing_stories?.length ?? 0

  return (
    <article className="prov-ui__card transport-list-card">
      <div className="transport-list-card__thumb">
        {vehicle.cover_image ? (
          <img src={vehicle.cover_image} alt="" />
        ) : (
          <span className="transport-list-card__thumb-fallback" aria-hidden>
            <Car size={22} strokeWidth={2} />
          </span>
        )}
        {!vehicle.is_active ? <span className="transport-list-card__badge">Hidden</span> : null}
        {percent < 100 ? (
          <span className="transport-list-card__badge transport-list-card__badge--draft" title="Listing checklist incomplete">
            Needs info · {percent}%
          </span>
        ) : null}
      </div>

      <div className="transport-list-card__body">
        <div className="transport-list-card__head">
          <h3 className="transport-list-card__title">{vehicle.title}</h3>
          <span className={`transport-list-card__status${vehicle.is_active !== false ? ' transport-list-card__status--live' : ''}`}>
            {vehicle.is_active !== false ? 'Live' : 'Hidden'}
          </span>
        </div>
        <p className="transport-list-card__meta">
          {vehicle.make} {vehicle.model} {vehicle.year} · {typeMeta.label} · {vehicle.seats} seats · {vehicle.transmission}
        </p>
        <p className="transport-list-card__meta">
          {vehicle.city}, {vehicle.region} · N${vehicle.price_per_day}/day
        </p>
        <div className="transport-list-card__chips">
          {(vehicle.required_renter_documents?.length ?? 0) > 0
            ? vehicle.required_renter_documents!.slice(0, 3).map((id) => (
                <span key={id}>{renterDocLabel(id)}</span>
              ))
            : null}
          {(vehicle.required_renter_documents?.length ?? 0) > 3 ? (
            <span>+{vehicle.required_renter_documents!.length - 3} docs</span>
          ) : null}
          <span>
            {highlightCount > 0
              ? `${highlightCount} highlight ring${highlightCount === 1 ? '' : 's'}`
              : 'No highlights'}
          </span>
        </div>
        {missing.length > 0 ? (
          <p className="transport-list-card__missing">Still needed: {missing.slice(0, 3).join(', ')}</p>
        ) : null}
      </div>

      <div className="transport-list-card__actions">
        <Link to={`/transport/vehicle/${vehicle.id}`} className="prov-ui__btn prov-ui__btn--ghost">View public</Link>
        {canEdit && onManageHighlights ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={onManageHighlights}>
            {highlightCount > 0 ? 'Manage highlights' : 'Add highlights'}
          </button>
        ) : null}
        {canEdit ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={onEdit}>Edit vehicle</button>
        ) : null}
      </div>
    </article>
  )
}
