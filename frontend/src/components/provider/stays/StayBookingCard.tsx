import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { BookingStatusBadge } from '../../booking'
import { messageUserPath } from '../../messages/messageProviderUtils'

export type StayProviderBooking = {
  id: number
  listing_title: string
  guest_display_name: string
  guest_username: string
  check_in: string
  check_out: string
  guests: number
  total_price: string
  status: string
}

type Props = {
  booking: StayProviderBooking
  nights: number
  canManage?: boolean
  statusActions?: { label: string; action: string }[]
  onAction?: (action: string) => void
  actionPending?: boolean
}

export function StayBookingCard({
  booking,
  nights,
  canManage,
  statusActions = [],
  onAction,
  actionPending,
}: Props) {
  return (
    <article className="prov-ui__booking">
      <div className="prov-ui__booking-top">
        <span className="prov-ui__booking-avatar" aria-hidden>
          {booking.guest_display_name.charAt(0)}
        </span>
        <div className="prov-ui__booking-meta">
          <strong>{booking.guest_display_name}</strong>
          <span>{booking.listing_title}</span>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <div className="prov-ui__booking-details">
        <span>
          {booking.check_in} → {booking.check_out} · {nights} night{nights === 1 ? '' : 's'}
        </span>
        <span>{booking.guests} guests</span>
        <strong>N${parseFloat(booking.total_price).toLocaleString()}</strong>
      </div>
      <div className="prov-ui__booking-actions">
        {canManage
          ? statusActions.map((a) => (
              <button
                key={a.action}
                type="button"
                className={a.action === 'confirm' ? 'prov-ui__btn prov-ui__btn--primary' : 'prov-ui__btn prov-ui__btn--ghost'}
                disabled={a.action === 'refund' || actionPending}
                title={a.action === 'refund' ? 'Refunds are handled by DELVE support during beta' : undefined}
                onClick={() => {
                  if (a.action === 'refund') return
                  onAction?.(a.action)
                }}
              >
                {a.label}
                {a.action === 'refund' ? ' (beta)' : ''}
              </button>
            ))
          : null}
        {booking.guest_username ? (
          <Link
            to={messageUserPath(booking.guest_username, 'provider')}
            state={{ from: '/provider/stays', guestName: booking.guest_display_name }}
            className="prov-ui__btn prov-ui__btn--ghost"
          >
            <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
            Message
          </Link>
        ) : null}
      </div>
    </article>
  )
}
