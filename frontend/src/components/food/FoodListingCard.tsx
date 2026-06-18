import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MapPin, Star } from 'lucide-react'
import { MarketplaceBadge } from '../marketplace'
import { MiniRating } from '../MiniRating'
import { foodCoverSrc, foodOpenBadge } from '../../utils/foodDisplay'
import { cuisineIcon, cuisineLabel, priceLevelLabel } from '../../utils/foodListing'

export type FoodCardVenue = {
  id: number
  name: string
  description?: string
  cuisine: string
  region: string
  city?: string | null
  cover_image: string | null
  price_level: number
  rating_avg?: string | null
  rating_count?: number | null
  is_open?: boolean | null
  closes_at?: string | null
  tagline?: string | null
  popular_dish?: string | null
}

type Props = {
  venue: FoodCardVenue
  saved: boolean
  onToggleSave: (id: number, e: MouseEvent) => void
}

function onImgError(e: React.SyntheticEvent<HTMLImageElement>, cuisine: string) {
  const img = e.currentTarget
  const fallback = foodCoverSrc(null, cuisine)
  if (img.src !== fallback) img.src = fallback
}

function trustBadges(venue: FoodCardVenue): string[] {
  const badges: string[] = []
  if ((venue.rating_count ?? 0) >= 80) badges.push('Local favourite')
  if (venue.is_open === true) badges.push('Open now')
  if (venue.popular_dish) badges.push('Popular dish')
  if ((venue.price_level || 2) <= 1) badges.push('Budget friendly')
  return badges.slice(0, 3)
}

export function FoodListingCard({ venue, saved, onToggleSave }: Props) {
  const Icon = cuisineIcon(venue.cuisine)
  const location = venue.city ? `${venue.city}, ${venue.region}` : venue.region
  const price = priceLevelLabel(venue.price_level)
  const openLabel = foodOpenBadge(venue.is_open, venue.closes_at)
  const badges = trustBadges(venue)

  return (
    <Link to={`/food/${venue.id}`} className="media-card acc-media-card fd-media-card">
      <div className="acc-media-card__img-wrap">
        <img
          className="acc-media-card__img"
          src={foodCoverSrc(venue.cover_image, venue.cuisine)}
          alt={venue.name}
          loading="lazy"
          onError={(e) => onImgError(e, venue.cuisine)}
        />
        {openLabel ? (
          <span
            className={`fd-card__open-badge acc-media-card__badge${venue.is_open === false ? ' fd-card__open-badge--closed' : ''}`}
          >
            {openLabel}
          </span>
        ) : null}
        <button
          type="button"
          className={`acc-media-card__save${saved ? ' acc-media-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save venue'}
          onClick={(e) => onToggleSave(venue.id, e)}
        >
          <Heart size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>
      <div className="media-card__body">
        {badges.length > 0 ? (
          <div className="mk-card-trust acc-media-card__trust">
            {badges.map((b) => (
              <MarketplaceBadge key={b}>{b}</MarketplaceBadge>
            ))}
          </div>
        ) : null}
        <div className="acc-media-card__type-row">
          <span className="acc-media-card__type">
            <Icon size={13} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
            {cuisineLabel(venue.cuisine)}
          </span>
        </div>
        <h2 className="media-card__title acc-media-card__title">{venue.name}</h2>
        <p className="media-card__meta acc-media-card__location">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          {location}
        </p>
        {venue.rating_avg != null ? (
          <p className="media-card__meta acc-media-card__rating-row">
            <Star size={13} strokeWidth={2.25} aria-hidden className="acc-media-card__star" />
            <MiniRating rating={venue.rating_avg} count={venue.rating_count} />
          </p>
        ) : null}
        {venue.popular_dish ? (
          <p className="media-card__meta acc-media-card__guests">Known for {venue.popular_dish}</p>
        ) : null}
        <div className="acc-media-card__price">
          <span className="acc-media-card__from">From</span>
          <span>{price}</span>
          <span className="acc-media-card__per"> / person</span>
        </div>
      </div>
    </Link>
  )
}
