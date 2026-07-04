import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { ProviderBooking } from '../../data/providerData'
import {
  messageUserPath,
  type MessagePlaceContext,
} from '../messages/messageProviderUtils'
import { BookingStatusBadge } from '../booking'

type Props = {
  booking: ProviderBooking
  showActions?: boolean
}

function bookingPlace(booking: ProviderBooking): MessagePlaceContext | null {
  const typeByCategory: Record<string, MessagePlaceContext['type']> = {
    Stay: 'booking_stay',
    Guide: 'booking_guide',
    Transport: 'booking_vehicle',
    Food: 'booking_food',
    Event: 'event',
  }
  const type = typeByCategory[booking.category]
  if (!type) return null
  return { type, id: booking.id, label: booking.service }
}

export function ProviderBookingRow({ booking, showActions = true }: Props) {
  return (
    <div className="prov-booking-row">
      <div className="prov-booking-row__guest">
        <span className="prov-booking-row__avatar" aria-hidden>
          {booking.guestInitial}
        </span>
        <div>
          <strong>{booking.guest}</strong>
          <span>
            {booking.service} · {booking.category}
          </span>
        </div>
      </div>
      <span className="prov-booking-row__date">
        {booking.date}
        {booking.guests ? (
          <span className="prov-booking-row__guests">
            <Users size={12} strokeWidth={2.25} aria-hidden />
            {booking.guests}
          </span>
        ) : null}
      </span>
      <BookingStatusBadge status={booking.status} />
      <strong className="prov-booking-row__amount">
        {booking.total ? `N$${booking.total.toLocaleString()}` : 'Free'}
      </strong>
      {booking.paymentStatus ? (
        <span className="prov-booking-row__payment">{booking.paymentStatus}</span>
      ) : null}
      {showActions ? (
        <div className="prov-booking-row__actions">
          <Link
            to={messageUserPath(booking.guestUsername, 'provider', bookingPlace(booking))}
            state={{ from: '/provider/bookings', guestName: booking.guest }}
            className="btn btn-ghost btn--sm"
          >
            Message
          </Link>
        </div>
      ) : null}
    </div>
  )
}
