import { BadgeDollarSign, BedDouble, Users } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import './booking-detail.css'

export type BookingRoomCardData = {
  name: string
  image?: string | null
  maxGuests?: number | null
  bedrooms?: number | null
  bedSummary?: string | null
  pricePerNight?: string | null
  fallbackPrice?: string | null
}

type Props = {
  room: BookingRoomCardData
  className?: string
}

export function BookingRoomCard({ room, className = '' }: Props) {
  const imageSrc = room.image ? mediaUrl(room.image) || room.image : null
  const price = room.pricePerNight?.trim() || room.fallbackPrice?.trim() || null

  return (
    <div className={`bk-room-card ${className}`.trim()}>
      <div className="bk-room-card__visual">
        {imageSrc ? (
          <img className="bk-room-card__img" src={imageSrc} alt={room.name} />
        ) : (
          <div className="bk-room-card__img bk-room-card__img--ph">
            <BedDouble size={28} strokeWidth={1.75} aria-hidden />
          </div>
        )}
      </div>
      <div className="bk-room-card__body">
        <p className="bk-room-card__name">{room.name}</p>
        <ul className="bk-room-card__facts">
          {room.maxGuests != null ? (
            <li>
              <Users size={14} strokeWidth={2.25} aria-hidden />
              Up to {room.maxGuests} guests
            </li>
          ) : null}
          {room.bedrooms != null ? (
            <li>
              <BedDouble size={14} strokeWidth={2.25} aria-hidden />
              {room.bedrooms} {room.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
            </li>
          ) : null}
          {room.bedSummary?.trim() ? (
            <li>
              <BedDouble size={14} strokeWidth={2.25} aria-hidden />
              {room.bedSummary.trim()}
            </li>
          ) : null}
          {price ? (
            <li>
              <BadgeDollarSign size={14} strokeWidth={2.25} aria-hidden />
              N${price} / night
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
