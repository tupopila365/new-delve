import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Images, Users } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { JourneySection } from '../journeys/JourneySection'
import { roomGalleryImages } from '../listing/listingUtils'
import type { ListingRoomOption } from '../listing/types'

type Props = {
  rooms: ListingRoomOption[]
  listingId: string | number
  selectedId: string | null
  onSelect: (room: ListingRoomOption | null) => void
  /** Listing cover used when a room has no/failing media. */
  fallbackCoverSrc?: string | null
  title?: string
  subtitle?: string
  className?: string
}

function roomMeta(room: ListingRoomOption): string {
  const parts: string[] = []
  if (room.maxGuests != null) parts.push(`${room.maxGuests} guests`)
  if (room.bedSummary?.trim()) parts.push(room.bedSummary.trim())
  else if (room.bedrooms != null) {
    parts.push(`${room.bedrooms} ${room.bedrooms === 1 ? 'bed' : 'beds'}`)
  }
  return parts.join(' · ')
}

function displayPrice(room: ListingRoomOption): string | null {
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim()
  return price ? `N$${price}` : null
}

function resolveRoomImage(room: ListingRoomOption, fallbackCoverSrc?: string | null): string | null {
  const galleryImages = roomGalleryImages(room)
  const primary = room.image ? mediaUrl(room.image) || room.image : null
  const fromGallery = galleryImages[0]?.src?.trim() || null
  const fallback = fallbackCoverSrc ? mediaUrl(fallbackCoverSrc) || fallbackCoverSrc : null
  return primary || fromGallery || fallback || null
}

function RoomTicketMedia({
  src,
  photoCount,
  badge,
  detailPath,
  name,
}: {
  src: string | null
  photoCount: number
  badge: string | null
  detailPath: string
  name: string
}) {
  const [failed, setFailed] = useState(false)
  const showImg = Boolean(src?.trim()) && !failed

  return (
    <Link className="stay-rooms__media" to={detailPath} aria-label={`View ${name}`}>
      {badge ? <span className="stay-rooms__badge">{badge}</span> : null}
      {photoCount > 1 ? (
        <span className="stay-rooms__count">
          <Images size={11} strokeWidth={2.25} aria-hidden />
          {photoCount}
        </span>
      ) : null}
      {showImg ? (
        <img
          src={src!}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="stay-rooms__media-empty" aria-hidden>
          <BedDouble size={28} strokeWidth={1.75} />
        </span>
      )}
    </Link>
  )
}

export function StayRoomPicker({
  rooms,
  listingId,
  selectedId,
  onSelect,
  fallbackCoverSrc,
  title = 'Rooms & rates',
  subtitle = 'Compare rooms like tickets — pick one to check dates.',
  className = '',
}: Props) {
  if (rooms.length === 0) return null

  return (
    <JourneySection title={title} className={`stay-rooms ${className}`.trim()} flush>
      {subtitle ? <p className="stay-rooms__sub">{subtitle}</p> : null}
      <div className="stay-rooms__strip" role="list">
        {rooms.map((room) => {
          const roomKey = String(room.id ?? room.name)
          const active = selectedId === roomKey
          const galleryImages = roomGalleryImages(room)
          const imageSrc = resolveRoomImage(room, fallbackCoverSrc)
          const meta = roomMeta(room)
          const price = displayPrice(room)
          const compareAt = room.compareAtPrice?.trim() ? `N$${room.compareAtPrice.trim()}` : null
          const onSale = Boolean(compareAt && price && compareAt !== price)
          const badge =
            room.badge?.trim() || (onSale ? 'On sale' : room.featured ? 'Featured' : null)
          const photoCount = galleryImages.length
          const detailPath = `/accommodation/${listingId}/room/${encodeURIComponent(room.name)}`

          const toggleSelect = () => onSelect(active ? null : room)

          return (
            <article
              key={roomKey}
              role="listitem"
              className={`stay-rooms__card${active ? ' stay-rooms__card--active' : ''}${
                room.featured ? ' stay-rooms__card--featured' : ''
              }`}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('a, button')) return
                toggleSelect()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleSelect()
                }
              }}
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${room.name}${price ? `, ${price} per night` : ''}. ${active ? 'Selected' : 'Select room'}`}
            >
              <RoomTicketMedia
                src={imageSrc}
                photoCount={photoCount}
                badge={badge}
                detailPath={detailPath}
                name={room.name}
              />

              <div className="stay-rooms__body">
                <p className="stay-rooms__name">{room.name}</p>
                {price ? (
                  <p className="stay-rooms__price">
                    {onSale && compareAt ? <span className="stay-rooms__was">{compareAt}</span> : null}
                    <span className="stay-rooms__price-value">{price}</span>
                    <span className="stay-rooms__price-unit">/ night</span>
                  </p>
                ) : null}
                {meta ? (
                  <p className="stay-rooms__meta">
                    <Users size={12} strokeWidth={2.25} aria-hidden />
                    {meta}
                  </p>
                ) : null}
                <div className="stay-rooms__actions">
                  <button
                    type="button"
                    className={`stay-rooms__select${active ? ' stay-rooms__select--on' : ''}`}
                    aria-pressed={active}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelect()
                    }}
                  >
                    {active ? 'Selected' : 'Select'}
                  </button>
                  <Link
                    className="stay-rooms__view"
                    to={detailPath}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View room
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </JourneySection>
  )
}
