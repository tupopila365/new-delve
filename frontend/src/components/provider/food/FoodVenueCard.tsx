import { Link } from 'react-router-dom'
import { mediaUrl } from '../../../api/client'
import { cuisineLabel, priceLevelLabel } from '../../../utils/foodListing'
import { venueCompleteness, type ProviderFoodVenue } from './foodVenueTypes'

type Props = {
  venue: ProviderFoodVenue
  onEdit: () => void
  canManage?: boolean
}

export function FoodVenueCard({ venue, onEdit, canManage = true }: Props) {
  const { percent, missing } = venueCompleteness(venue)
  const cover = venue.cover_image ? mediaUrl(venue.cover_image) : null
  const openLabel =
    venue.is_open === true ? 'Open' : venue.is_open === false ? 'Closed' : venue.is_active ? 'Published' : 'Draft'

  return (
    <article className="adm-listing-card">
      <div className="adm-listing-card__img">
        {cover ? <img src={cover} alt="" /> : <span aria-hidden>🍽</span>}
      </div>
      <div className="adm-listing-card__body">
        <div className="adm-listing-card__title-row">
          <p className="adm-listing-card__title">{venue.name}</p>
          <span className={`adm-badge ${venue.is_active ? 'adm-badge--green' : 'adm-badge--yellow'}`}>{openLabel}</span>
        </div>
        <p className="adm-listing-card__meta">
          {cuisineLabel(venue.cuisine)} · {venue.city}, {venue.region} · {priceLevelLabel(venue.price_level)}
        </p>
        {venue.rating_count ? (
          <p className="adm-listing-card__rating">
            ⭐ {venue.rating_avg} ({venue.rating_count} reviews)
          </p>
        ) : null}
        <p className="adm-listing-card__desc">{venue.tagline || venue.description}</p>
        {percent < 100 ? (
          <p className="adm-listing-card__hint">Profile {percent}% — missing: {missing.join(', ')}</p>
        ) : null}
      </div>
      <div className="adm-listing-card__actions">
        <Link to={`/food/${venue.id}`} className="btn btn-ghost adm-action-btn">View</Link>
        {canManage ? (
          <button type="button" className="btn btn-ghost adm-action-btn" onClick={onEdit}>Edit</button>
        ) : null}
      </div>
    </article>
  )
}
