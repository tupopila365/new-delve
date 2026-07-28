import { Link } from 'react-router-dom'
import { BedDouble, Images } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { ListingSection } from './ListingSection'
import { roomGalleryImages } from './listingUtils'
import type { ListingRoomOption } from './types'
import './listing-detail.css'
import { formatDisplayMoney } from '../../lib/displayMoney'
import { exploreDisplayCurrency } from '../../lib/exploreDestination'

type Props = {
  rooms: ListingRoomOption[]
  listingType: string
  listingId: string | number
  detailBackTo: string
  title?: string
  subtitle?: string
  bookLabel?: string
  className?: string
}

function roomMeta(room: ListingRoomOption): string {
  const parts: string[] = []
  if (room.maxGuests != null) parts.push(`${room.maxGuests} guests`)
  if (room.quantityAvailable != null) {
    parts.push(`${room.quantityAvailable} room${room.quantityAvailable === 1 ? '' : 's'}`)
  }
  if (room.bedSummary?.trim()) parts.push(room.bedSummary.trim())
  else if (room.bedrooms != null) {
    parts.push(`${room.bedrooms} ${room.bedrooms === 1 ? 'bed' : 'beds'}`)
  }
  return parts.join(' · ')
}

function displayPrice(room: ListingRoomOption): string | null {
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim()
  return price ? formatDisplayMoney(price, exploreDisplayCurrency()) : null
}

export function ListingRoomPicker({
  rooms,
  listingType,
  listingId,
  detailBackTo,
  title = 'Rooms',
  subtitle,
  bookLabel = 'Book',
  className = '',
}: Props) {
  if (rooms.length === 0) return null

  return (
    <ListingSection title={title} className={`listing-rooms ${className}`.trim()}>
      {subtitle ? <p className="listing-rooms__sub">{subtitle}</p> : null}
      <div className="listing-rooms__strip">
        {rooms.map((room) => {
          const galleryImages = roomGalleryImages(room)
          const imageSrc = room.image ? mediaUrl(room.image) || room.image : galleryImages[0]?.src ?? null
          const meta = roomMeta(room)
          const price = displayPrice(room)
          const compareAt = room.compareAtPrice?.trim() ? formatDisplayMoney(room.compareAtPrice.trim(), exploreDisplayCurrency()) : null
          const onSale = Boolean(compareAt && price && compareAt !== price)
          const hostBadges = (room.badges?.length ? room.badges : room.badge ? [room.badge] : [])
            .map((b) => b.trim())
            .filter(Boolean)
          const badges =
            hostBadges.length > 0
              ? hostBadges
              : onSale
                ? ['On sale']
                : room.featured
                  ? ['Special']
                  : []
          const photoCount = galleryImages.length
          const detailPath =
            listingType === 'accommodation'
              ? `/accommodation/${listingId}/room/${encodeURIComponent(String(room.id ?? room.name))}`
              : `/listing/${listingType}/${listingId}/gallery`

          return (
            <article
              key={room.id ?? room.name}
              className={`listing-rooms__offer${room.featured ? ' listing-rooms__offer--featured' : ''}`}
            >
              <Link
                className="listing-rooms__preview"
                to={detailPath}
                state={
                  listingType === 'accommodation'
                    ? undefined
                    : { title: room.name, images: galleryImages, backTo: detailBackTo }
                }
                aria-label={`View details and ${photoCount} photos of ${room.name}`}
              >
                {badges.length > 0 ? (
                  <span className="listing-rooms__badges">
                    {badges.map((badge) => (
                      <span key={badge} className="listing-rooms__badge">
                        {badge}
                      </span>
                    ))}
                  </span>
                ) : null}
                {photoCount > 1 ? (
                  <span className="listing-rooms__count">
                    <Images size={11} strokeWidth={2.25} aria-hidden />
                    {photoCount}
                  </span>
                ) : null}
                {imageSrc ? (
                  <img src={imageSrc} alt={room.name} loading="lazy" decoding="async" />
                ) : (
                  <span className="listing-rooms__preview-empty">
                    <BedDouble size={24} strokeWidth={1.75} />
                  </span>
                )}
              </Link>

              <div className="listing-rooms__body">
                <Link className="listing-rooms__name" to={detailPath}>
                  {room.name}
                </Link>
                {meta ? <p className="listing-rooms__meta">{meta}</p> : null}
                {price ? (
                  <p className="listing-rooms__pricing">
                    {onSale && compareAt ? <span className="listing-rooms__was">{compareAt}</span> : null}
                    <span className="listing-rooms__now">{price}</span>
                    <span className="listing-rooms__unit">/ night</span>
                  </p>
                ) : null}
                <Link className="listing-rooms__book" to={room.bookHref}>
                  {bookLabel}
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </ListingSection>
  )
}
