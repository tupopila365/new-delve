import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
  AccommodationRoomBooking,
  AccommodationRoomMeta,
} from './AccommodationRoomBooking'
import { ListingPhotoGrid } from '../listing/ListingPhotoGrid'
import { roomGalleryImages } from '../listing/listingUtils'
import type { ListingRoomOption } from '../listing/types'
import './accommodation-room.css'

type Props = {
  room: ListingRoomOption
  listingId: string
  listingTitle: string
  maxListingGuests: number
  backTo: string
}

export function AccommodationRoomDetailView({
  room,
  listingId,
  listingTitle,
  maxListingGuests,
  backTo,
}: Props) {
  const images = roomGalleryImages(room)

  return (
    <div className="listing-room-page">
      <div className="listing-room-page__toolbar">
        <Link className="listing-room-page__back" to={backTo} aria-label="Back to stay">
          <ArrowLeft size={18} strokeWidth={2.25} />
          <span>Back</span>
        </Link>
      </div>

      <header className="listing-room-page__intro">
        <p className="listing-room-page__stay">{listingTitle}</p>
        <h1 className="listing-room-page__title">{room.name}</h1>
        <AccommodationRoomMeta room={room} />
      </header>

      <div className="listing-room-page__layout">
        <div className="listing-room-page__main">
          <ListingPhotoGrid images={images} title={room.name} className="listing-room-page__photos" />

          {room.description?.trim() ? (
            <p className="listing-room-page__desc">{room.description.trim()}</p>
          ) : null}

          <div className="listing-room-page__mobile-book">
            <AccommodationRoomBooking
              room={room}
              listingId={listingId}
              listingTitle={listingTitle}
              maxListingGuests={maxListingGuests}
            />
          </div>
        </div>

        <aside className="listing-room-page__aside">
          <AccommodationRoomBooking
            className="acc-room-booking--sidebar"
            room={room}
            listingId={listingId}
            listingTitle={listingTitle}
            maxListingGuests={maxListingGuests}
          />
        </aside>
      </div>
    </div>
  )
}
