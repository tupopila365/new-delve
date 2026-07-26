import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  BedDouble,
  Bookmark,
  Building2,
  Heart,
  MapPin,
  Star,
  Users,
} from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { useDisplayMoney } from '../../hooks/useDisplayMoney'
import { listingTrustLabel } from '../../lib/listingTrust'
import { ListingDealBadges, DealAwarePrice, type ListingDeal } from '../deals'
import { isVideoUrl } from '../listing/photos/listingGalleryMedia'
import { ShareButton } from '../share'
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
  owner_verified?: boolean
  deals?: ListingDeal[]
}

type Props = {
  listing: AccommodationCardListing
  typeLabel?: string | null
  liked: boolean
  saved: boolean
  likeCount: number
  likeBusy?: boolean
  distanceLabel?: string | null
  onLike: (event: MouseEvent) => void
  onSave: (event: MouseEvent) => void
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
  distanceLabel,
  onLike,
  onSave,
}: Props) {
  const { format } = useDisplayMoney()
  const src = mediaUrl(listing.cover_image) || FALLBACK_STAY_PHOTO
  const isVideoCover = Boolean(listing.cover_image && isVideoUrl(listing.cover_image))
  const ratingCount = listing.rating_count ?? 0
  const rating =
    ratingCount > 0 && listing.rating_avg ? Number.parseFloat(listing.rating_avg).toFixed(1) : null
  const trustLabel = listingTrustLabel(listing)
  const priceText = format(listing.price_per_night, { suffix: '/night', from: true })
  const place = location(listing)
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
          {isVideoCover ? (
            <video
              className="stay-card-v2__video"
              src={`${src}#t=0.1`}
              muted
              loop
              playsInline
              preload="metadata"
              autoPlay
              aria-hidden
            />
          ) : (
            <img src={src} alt="" loading="lazy" onError={onImgError} />
          )}
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
          {listing.deals?.length ? (
            <ListingDealBadges deals={listing.deals} className="stay-card-v2__deals" max={2} />
          ) : null}
        </div>

        <div className="stay-card-v2__body">
          <div className="stay-card-v2__topline">
            <div>
              <h3 className="stay-card-v2__title">{listing.title}</h3>
              <p className="stay-card-v2__location">
                <MapPin size={13} strokeWidth={2.25} aria-hidden />
                {location(listing)}
                {distanceLabel ? <span className="stay-card-v2__distance">{distanceLabel}</span> : null}
              </p>
            </div>
            <p className="stay-card-v2__price">
              <DealAwarePrice
                fallback={priceText || 'Ask for price'}
                deals={listing.deals}
                suffix="/night"
              />
            </p>
          </div>

          {trustLabel ? (
            <div className="stay-card-v2__trust">
              <span
                className={`stay-card-v2__badge${listing.owner_verified ? ' stay-card-v2__badge--verified' : ''}`}
              >
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
          className={`stay-card-v2__action--like${liked ? ' is-active' : ''}`}
          disabled={likeBusy}
          onClick={onLike}
          aria-label={liked ? 'Unlike stay' : 'Like stay'}
          aria-pressed={liked}
        >
          <Heart size={17} strokeWidth={2.35} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          {likeCount > 0 ? likeCount : 'Like'}
        </button>
        <button
          type="button"
          className={`stay-card-v2__action--save${saved ? ' is-active' : ''}`}
          onClick={onSave}
          aria-label={saved ? 'Remove saved stay' : 'Save stay'}
          aria-pressed={saved}
        >
          <Bookmark size={17} strokeWidth={2.35} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saved ? 'Saved' : 'Save'}
        </button>
        <ShareButton
          className="stay-card-v2__action--share"
          stopPropagation
          label="Share"
          ariaLabel="Share stay"
          iconSize={17}
          share={{
            path: `/accommodation/${listing.id}`,
            title: listing.title || 'DELVE stay',
            text: `Check out ${listing.title || 'this stay'} on DELVE`,
            previewImage: listing.cover_image,
            previewLabel: place ? `Stay · ${place}` : 'Stay on DELVE',
          }}
        />
      </div>
    </article>
  )
}
