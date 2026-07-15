import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  BedDouble,
  Bookmark,
  Building2,
  Heart,
  MapPin,
  Share2,
  Star,
  Users,
} from 'lucide-react'
import { mediaUrl } from '../../api/client'
import './AccommodationListingCard.css'

export type AccommodationCardListing = {
  id: number
  title: string
  region: string
  city?: string | null
  price_per_night: string
  max_guests?: number | null
  bedrooms?: number | null
  cover_image: string | null
  property_type?: string | null
  pet_friendly?: boolean
  wifi?: boolean
  pool?: boolean
  parking?: boolean
  kitchen?: boolean
  breakfast?: boolean
  rating_avg?: string | null
  rating_count?: number | null
  likes_count?: number
  liked_by_me?: boolean
  is_featured_partner?: boolean
  partner_label?: string
}

type Props = {
  listing: AccommodationCardListing
  typeLabel?: string | null
  liked: boolean
  saved: boolean
  likeCount: number
  likeBusy?: boolean
  onLike: (event: MouseEvent) => void
  onSave: (event: MouseEvent) => void
  onShare: (event: MouseEvent) => void
}

const FALLBACK_STAY_PHOTO = '/images/default-journey.jpg'

function formatType(type?: string | null) {
  if (!type) return 'Stay'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function location(listing: AccommodationCardListing) {
  return listing.city ? `${listing.city}, ${listing.region}` : listing.region
}

function onImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.endsWith(FALLBACK_STAY_PHOTO)) img.src = FALLBACK_STAY_PHOTO
}

export function AccommodationListingCard({
  listing,
  typeLabel,
  liked,
  saved,
  likeCount,
  likeBusy,
  onLike,
  onSave,
  onShare,
}: Props) {
  const src = mediaUrl(listing.cover_image) || FALLBACK_STAY_PHOTO
  const rating = listing.rating_avg ? Number.parseFloat(listing.rating_avg).toFixed(1) : null
  const ratingCount = listing.rating_count ?? 0
  const popular = ratingCount >= 20
  const trustLabel = listing.is_featured_partner
    ? listing.partner_label?.trim() || 'Featured host'
    : popular
      ? 'Popular'
      : null
  const tags = [
    listing.pool ? 'Pool' : null,
    listing.wifi ? 'Wi-Fi' : null,
    listing.pet_friendly ? 'Pets' : null,
    listing.parking ? 'Parking' : null,
    listing.breakfast ? 'Breakfast' : null,
    listing.kitchen ? 'Kitchen' : null,
  ]
    .filter(Boolean)
    .slice(0, 3) as string[]

  return (
    <article className="stay-card-v2">
      <Link to={`/accommodation/${listing.id}`} className="stay-card-v2__link">
        <div className="stay-card-v2__media">
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={onImgError}
          />
          <span className="stay-card-v2__type">
            <Building2 size={12} strokeWidth={2.35} aria-hidden />
            {typeLabel || formatType(listing.property_type)}
          </span>
          {rating ? (
            <span className="stay-card-v2__rating">
              <Star size={12} strokeWidth={2.35} aria-hidden />
              {rating}
            </span>
          ) : null}
        </div>

        <div className="stay-card-v2__body">
          <div className="stay-card-v2__topline">
            <div>
              <h3 className="stay-card-v2__title">{listing.title}</h3>
              <p className="stay-card-v2__location">
                <MapPin size={13} strokeWidth={2.25} aria-hidden />
                {location(listing)}
              </p>
            </div>
            <p className="stay-card-v2__price">
              <span>From</span>
              N${listing.price_per_night}
              <small>/night</small>
            </p>
          </div>

          {trustLabel ? (
            <div className="stay-card-v2__trust">
              <span className="stay-card-v2__badge">
                <BadgeCheck size={12} strokeWidth={2.25} aria-hidden />
                {trustLabel}
              </span>
            </div>
          ) : null}

          {listing.bedrooms != null || listing.max_guests != null ? (
            <div className="stay-card-v2__facts" aria-label="Stay facts">
              {listing.bedrooms != null ? (
                <span>
                  <BedDouble size={13} strokeWidth={2.25} aria-hidden />
                  {listing.bedrooms} bed{listing.bedrooms === 1 ? '' : 's'}
                </span>
              ) : null}
              {listing.max_guests != null ? (
                <span>
                  <Users size={13} strokeWidth={2.25} aria-hidden />
                  {listing.max_guests} guests
                </span>
              ) : null}
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div className="stay-card-v2__tags">
              {tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="stay-card-v2__actions">
        <button
          type="button"
          className={liked ? 'is-active' : ''}
          disabled={likeBusy}
          onClick={onLike}
          aria-label={liked ? 'Unlike stay' : 'Like stay'}
        >
          <Heart size={17} strokeWidth={2.35} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          {likeCount > 0 ? likeCount : 'Like'}
        </button>
        <button
          type="button"
          className={saved ? 'is-active' : ''}
          onClick={onSave}
          aria-label={saved ? 'Remove saved stay' : 'Save stay'}
        >
          <Bookmark size={17} strokeWidth={2.35} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" onClick={onShare} aria-label="Share stay">
          <Share2 size={17} strokeWidth={2.35} aria-hidden />
          Share
        </button>
      </div>
    </article>
  )
}
