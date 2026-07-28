import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Bookmark,
  Building2,
  MapPin,
  Star,
} from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { useDisplayMoney } from '../../hooks/useDisplayMoney'
import { DealAwarePrice, type ListingDeal } from '../deals'
import { isVideoUrl } from '../listing/photos/listingGalleryMedia'
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
  availability_searched?: boolean
  available_room_count?: number
  total_room_count?: number
  lowest_available_room_price?: string
  total_price?: string
  search_nights?: number
  limited_availability?: boolean
  sold_out_room_types_count?: number
  availability_status?: 'available' | 'limited'
  availability_message?: string
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
  bookingQuery?: string
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
  saved,
  distanceLabel,
  onSave,
  bookingQuery,
}: Props) {
  const { format } = useDisplayMoney()
  const src = mediaUrl(listing.cover_image) || FALLBACK_STAY_PHOTO
  const isVideoCover = Boolean(listing.cover_image && isVideoUrl(listing.cover_image))
  const ratingCount = listing.rating_count ?? 0
  const rating =
    ratingCount > 0 && listing.rating_avg ? Number.parseFloat(listing.rating_avg).toFixed(1) : null
  const availabilitySearched = listing.availability_searched === true
  const priceText = availabilitySearched
    ? format(listing.lowest_available_room_price, { suffix: '/night' })
    : format(listing.price_per_night, { suffix: '/night', from: true })
  const totalText = availabilitySearched ? format(listing.total_price) : ''

  return (
    <article className="stay-card-v2">
      <Link
        to={`/accommodation/${listing.id}${bookingQuery ? `?${bookingQuery}` : ''}`}
        className="stay-card-v2__link"
      >
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
              {availabilitySearched ? (
                <>
                  <strong>{totalText || 'Price available inside'}</strong>
                  <small>
                    total · {listing.search_nights} night{listing.search_nights === 1 ? '' : 's'}
                  </small>
                  <span>{priceText}</span>
                </>
              ) : (
                <>
                  <DealAwarePrice
                    fallback={priceText || 'Ask for price'}
                    deals={listing.deals}
                    suffix="/night"
                  />
                  <small>Add dates to check availability</small>
                </>
              )}
            </p>
          </div>

          {availabilitySearched ? (
            <div
              className={`stay-card-v2__availability${listing.limited_availability ? ' is-limited' : ''}`}
            >
              <span>{listing.availability_message || `${listing.available_room_count} rooms available`}</span>
              {listing.available_room_count != null ? (
                <small>
                  {listing.available_room_count} of {listing.total_room_count ?? listing.available_room_count} rooms available
                </small>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="stay-card-v2__actions">
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
      </div>
    </article>
  )
}
