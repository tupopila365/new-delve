import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import type { ProviderBooking } from '../../data/providerData'
import { BookingStatusBadge } from '../booking'

type Props = {
  booking: ProviderBooking
  showActions?: boolean
}

export function ProviderBookingRow({ booking, showActions = true }: Props) {
  const canConfirm = ['requested', 'pending', 'reserved'].includes(booking.status)
  const canComplete = ['confirmed', 'checked_in', 'accepted', 'paid'].includes(booking.status)

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
          {canConfirm ? (
            <button type="button" className="btn btn-primary btn--sm" title="Confirm action coming soon">
              Confirm
            </button>
          ) : null}
          {canComplete ? (
            <button type="button" className="btn btn-ghost btn--sm" disabled title="Mark completed coming soon">
              Complete
            </button>
          ) : null}
          <Link to="/messages" className="btn btn-ghost btn--sm">
            Message
          </Link>
        </div>
      ) : null}
    </div>
  )
}
