import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import type { ProviderBooking } from '../../../data/providerData'
import { messageUserPath } from '../../messages/messageProviderUtils'
import { BookingStatusBadge } from '../../booking'

type Props = {
  booking: ProviderBooking
  onConfirm?: () => void
  onCheckIn?: () => void
  confirmPending?: boolean
  checkInPending?: boolean
}

export function ProviderBookingCard({
  booking,
  onConfirm,
  onCheckIn,
  confirmPending,
  checkInPending,
}: Props) {
  const canConfirm = onConfirm && ['requested', 'pending', 'reserved'].includes(booking.status)
  const canCheckIn = onCheckIn && booking.status === 'confirmed'

  return (
    <article className="prov-ui__booking">
      <div className="prov-ui__booking-top">
        <span className="prov-ui__booking-avatar" aria-hidden>
          {booking.guestInitial}
        </span>
        <div className="prov-ui__booking-meta">
          <strong>{booking.guest}</strong>
          <span>{booking.service}</span>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <div className="prov-ui__booking-details">
        <span>{booking.date}</span>
        {booking.guests ? <span>{booking.guests} guests</span> : null}
        <strong>{booking.total ? `N$${booking.total.toLocaleString()}` : 'Free'}</strong>
      </div>
      <div className="prov-ui__booking-actions">
        {canConfirm ? (
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            onClick={onConfirm}
            disabled={confirmPending}
          >
            {confirmPending ? 'Confirming…' : 'Confirm'}
          </button>
        ) : null}
        {canCheckIn ? (
          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary"
            onClick={onCheckIn}
            disabled={checkInPending}
          >
            {checkInPending ? 'Checking in…' : 'Check in'}
          </button>
        ) : null}
        <Link
          to={messageUserPath(booking.guestUsername, 'provider')}
          state={{ from: '/provider/bookings', guestName: booking.guest }}
          className="prov-ui__btn prov-ui__btn--ghost"
        >
          <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
          Message
        </Link>
      </div>
    </article>
  )
}
