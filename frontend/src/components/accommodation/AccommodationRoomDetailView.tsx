import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  BedDouble,
  Bookmark,
  MapPin,
  Users,
} from 'lucide-react'
import {
  AccommodationRoomBooking,
} from './AccommodationRoomBooking'
import { StayHostCard } from './StayHostCard'
import { ListingDelversMoments } from '../listing'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { roomGalleryImages } from '../listing/listingUtils'
import type { ListingRoomOption } from '../listing/types'
import { buildListingImages, type AccommodationListing } from '../../utils/accommodationListing'
import '../journeys/journey-detail.css'
import './accommodation-detail.css'
import './accommodation-room.css'

type Props = {
  room: ListingRoomOption
  listing: AccommodationListing
  listingId: string
  listingTitle: string
  maxListingGuests: number
  backTo: string
  saved?: boolean
  onSave?: () => void
  onShare?: () => void
}

function roomNightly(room: ListingRoomOption): string | null {
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim()
  return price || null
}

export function AccommodationRoomDetailView({
  room,
  listing,
  listingId,
  listingTitle,
  maxListingGuests,
  backTo,
  saved = false,
  onSave,
  onShare,
}: Props) {
  const roomImages = roomGalleryImages(room).filter((img) => Boolean(img.src?.trim()))
  const stayImages = buildListingImages(listing).filter((img) => Boolean(img.src?.trim()))
  const galleryImages = roomImages.length > 0 ? roomImages : stayImages
  const nightly = roomNightly(room)
  const locationLine = [listing.city, listing.region].filter(Boolean).join(', ')

  const scrollToReserve = () => {
    document.getElementById('room-reserve-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <JourneyHero
        images={galleryImages}
        backTo={backTo}
        backLabel="Back to stay"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <div className="jd-titleblock">
        <span className="jd-badge">Room</span>
        <h1 className="jd-title">{room.name}</h1>
        <p className="jd-route">
          At{' '}
          <Link to={backTo} style={{ color: 'inherit' }}>
            {listingTitle}
          </Link>
        </p>
        {locationLine ? (
          <p className="jd-hook">
            <MapPin
              size={15}
              strokeWidth={2.25}
              aria-hidden
              style={{ display: 'inline', verticalAlign: '-0.15em', marginRight: 6 }}
            />
            {locationLine}
          </p>
        ) : null}
      </div>

      <ul className="jd-facts">
        {nightly ? (
          <li className="jd-fact jd-fact--cost">
            <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
            N${nightly} / night
          </li>
        ) : null}
        {room.maxGuests != null ? (
          <li className="jd-fact">
            <Users size={15} strokeWidth={2.25} aria-hidden />
            Up to {room.maxGuests} guests
          </li>
        ) : null}
        {room.bedSummary?.trim() || room.bedrooms != null ? (
          <li className="jd-fact">
            <BedDouble size={15} strokeWidth={2.25} aria-hidden />
            {room.bedSummary?.trim() ||
              `${room.bedrooms} ${room.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`}
          </li>
        ) : null}
      </ul>

      <div className="acc-room-detail__layout" id="room-reserve-panel">
        <div className="acc-room-detail__main">
          <div className="acc-detail__reserve-block acc-room-detail__booking-inline">
            <AccommodationRoomBooking
              room={room}
              listingId={listingId}
              listingTitle={listingTitle}
              maxListingGuests={maxListingGuests}
            />
          </div>

          {room.description?.trim() ? (
            <JourneySection title="About this room">
              <p className="jd-story__lead">{room.description.trim()}</p>
            </JourneySection>
          ) : null}

          <ListingDelversMoments
            listingType="accommodation"
            listingId={listingId}
            listingTitle={listingTitle}
            title="From Delvers"
            className="acc-detail__moments"
            showWhenEmpty
            emptyMessage="No guest moments yet."
          />

          <StayHostCard
            username={listing.owner_username}
            listingId={listingId}
            listingTitle={listingTitle}
            regionLine={locationLine}
            className="acc-detail__provider"
          />

          <p className="acc-room-detail__back-link">
            <Link to={backTo}>← See all rooms at {listingTitle}</Link>
          </p>
        </div>

        <aside className="acc-room-detail__aside">
          <AccommodationRoomBooking
            className="acc-room-booking--sidebar"
            room={room}
            listingId={listingId}
            listingTitle={listingTitle}
            maxListingGuests={maxListingGuests}
          />
        </aside>
      </div>

      <div className="jd-mobilebar">
        <span className="jd-mobilebar__meta">
          <span className="jd-mobilebar__title">{nightly ? `N$${nightly}` : listingTitle}</span>
          <span className="jd-mobilebar__sub">{nightly ? 'per night · check dates' : room.name}</span>
        </span>
        <div className="jd-mobilebar__actions">
          {onSave ? (
            <button
              type="button"
              className={`jd-mobilebar__icon${saved ? ' is-active' : ''}`}
              onClick={onSave}
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <Bookmark size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ) : null}
          <button type="button" className="jd-mobilebar__btn" onClick={scrollToReserve}>
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
