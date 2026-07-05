import { Link } from 'react-router-dom'
import { Star, UtensilsCrossed } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import { cuisineLabel, priceLevelLabel } from '../../../utils/foodListing'
import { venueCompleteness, type ProviderFoodVenue } from './foodVenueTypes'
import { venueOpenPillClass } from './foodVenueModules'

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
        {cover ? (
          <img src={cover} alt="" />
        ) : (
          <UtensilsCrossed size={28} strokeWidth={1.75} aria-hidden className="adm-listing-card__placeholder-icon" />
        )}
      </div>
      <div className="adm-listing-card__body">
        <div className="adm-listing-card__title-row">
          <p className="adm-listing-card__title">{venue.name}</p>
          <span className={venueOpenPillClass(venue)}>{openLabel}</span>
        </div>
        <p className="adm-listing-card__meta">
          {cuisineLabel(venue.cuisine)} · {venue.city}, {venue.region} · {priceLevelLabel(venue.price_level)}
        </p>
        {venue.rating_count ? (
          <p className="adm-listing-card__rating">
            <Star size={14} strokeWidth={2.25} fill="currentColor" aria-hidden />
            {venue.rating_avg} ({venue.rating_count} reviews)
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
