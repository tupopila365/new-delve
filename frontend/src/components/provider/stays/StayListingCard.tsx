import { Link } from 'react-router-dom'
import { Hotel } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import { propertyTypeLabel } from '../../../utils/accommodationListing'
import type { ProviderStayListing } from './stayListingTypes'
import { listingCompleteness } from './stayListingTypes'

type Props = {
  stay: ProviderStayListing
  canEdit?: boolean
  onEdit: () => void
}

export function StayListingCard({ stay, canEdit, onEdit }: Props) {
  const { percent, missing } = listingCompleteness(stay)
  const cover = stay.cover_image ? mediaUrl(stay.cover_image) || stay.cover_image : null
  const roomCount = Array.isArray(stay.room_types) ? stay.room_types.length : 0
  const photoCount = (stay.media_gallery?.length ?? 0) + (stay.cover_image ? 1 : 0)

  return (
    <article className="prov-ui__card stay-card">
      <div className="stay-card__thumb">
        {cover ? (
          <img src={cover} alt="" />
        ) : (
          <span className="stay-card__thumb-fallback" aria-hidden>
            <Hotel size={22} strokeWidth={2} />
          </span>
        )}
        {!stay.is_active ? <span className="stay-card__badge stay-card__badge--hidden">Hidden</span> : null}
        {percent < 100 ? <span className="stay-card__badge stay-card__badge--draft">{percent}% complete</span> : null}
      </div>

      <div className="stay-card__body">
        <div className="stay-card__head">
          <h3 className="stay-card__title">{stay.title}</h3>
          <span className={`stay-card__status${stay.is_active ? ' stay-card__status--live' : ''}`}>
            {stay.is_active ? 'Live' : 'Draft'}
          </span>
        </div>

        <p className="stay-card__type">{propertyTypeLabel(stay.property_type)}</p>
        <p className="stay-card__meta">
          {stay.city}, {stay.region} · N${stay.price_per_night}/night · {stay.max_guests} guests · {stay.bedrooms}{' '}
          bed{stay.bedrooms === 1 ? '' : 's'}
        </p>

        <div className="stay-card__chips">
          {stay.wifi ? <span>Wi-Fi</span> : null}
          {stay.parking ? <span>Parking</span> : null}
          {stay.breakfast ? <span>Breakfast</span> : null}
          {stay.pool ? <span>Pool</span> : null}
          {stay.pet_friendly ? <span>Pets</span> : null}
          {roomCount > 0 ? <span>{roomCount} room type{roomCount === 1 ? '' : 's'}</span> : null}
          {photoCount > 0 ? <span>{photoCount} photo{photoCount === 1 ? '' : 's'}</span> : null}
        </div>

        <p className="stay-card__rating">
          {stay.rating_avg} rating · {stay.rating_count} review{stay.rating_count === 1 ? '' : 's'}
        </p>

        {missing.length > 0 ? (
          <p className="stay-card__missing">
            Still needed: {missing.slice(0, 3).join(', ')}
            {missing.length > 3 ? ` +${missing.length - 3} more` : ''}
          </p>
        ) : null}
      </div>

      <div className="stay-card__actions">
        <Link to={`/accommodation/${stay.id}`} className="prov-ui__btn prov-ui__btn--ghost">
          View public
        </Link>
        {canEdit ? (
          <button type="button" className="prov-ui__btn prov-ui__btn--primary" onClick={onEdit}>
            Edit listing
          </button>
        ) : null}
      </div>
    </article>
  )
}
