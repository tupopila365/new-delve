import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BedDouble,
  CalendarDays,
  Check,
  Clock3,
  MessageCircle,
  Users,
  X,
} from 'lucide-react'
import { BookingStatusBadge } from '../../booking'
import { messageUserPath } from '../../messages/messageProviderUtils'
import { useDisplayMoney } from '../../../hooks/useDisplayMoney'

export type StayProviderBooking = {
  id: number
  listing_title: string
  guest_display_name: string
  guest_username: string
  check_in: string
  check_out: string
  guests: number
  total_price: string
  room_type_name?: string
  special_requests?: string
  status: string
  platform_fee?: string
  seller_payout?: string
  payout_status?: string
  hold_expires_at?: string | null
  expired_at?: string | null
  paid_at?: string | null
  payout_released_at?: string | null
  mock_payment_ref?: string | null
}

type Props = {
  booking: StayProviderBooking
  nights: number
  canManage?: boolean
  statusActions?: { label: string; action: string }[]
  onAction?: (action: string) => void
  actionPending?: boolean
  pendingAction?: string | null
}

const friendlyDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const deadlineDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function relativeTime(deadline: string, now: number) {
  const remainingMinutes = Math.ceil((new Date(deadline).getTime() - now) / 60000)
  if (remainingMinutes <= 0) return null

  const days = Math.floor(remainingMinutes / 1440)
  const hours = Math.floor((remainingMinutes % 1440) / 60)
  const minutes = remainingMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function hasMoneyValue(value: string | undefined): value is string {
  return value != null && value.trim() !== '' && Number.isFinite(Number(value))
}

function pendingActionLabel(action: string, isDecline: boolean) {
  if (isDecline) return 'Declining…'
  if (action === 'confirm') return 'Confirming…'
  if (action === 'check_in') return 'Checking in…'
  if (action === 'check_out') return 'Checking out…'
  return 'Updating…'
}

export function StayBookingCard({
  booking,
  nights,
  canManage,
  statusActions = [],
  onAction,
  actionPending,
  pendingAction,
}: Props) {
  const { format } = useDisplayMoney()
  const [now, setNow] = useState(() => Date.now())
  const titleId = `stay-booking-${booking.id}-title`
  const isPaid = Boolean(
    booking.paid_at ||
      booking.mock_payment_ref ||
      booking.payout_status === 'held' ||
      booking.payout_status === 'released',
  )
  const paymentState =
    booking.payout_status === 'refunded'
      ? { label: 'Refunded', tone: 'refunded' }
      : booking.payout_status === 'released' || booking.payout_released_at
        ? { label: 'Payout released', tone: 'released' }
        : isPaid
          ? { label: 'Paid · held by Delve', tone: 'paid' }
          : { label: 'Awaiting payment', tone: 'unpaid' }
  const remaining = booking.hold_expires_at
    ? relativeTime(booking.hold_expires_at, now)
    : null
  const isExpired = booking.status === 'expired' || Boolean(booking.expired_at)
  const showResponseDeadline = booking.status === 'pending'
  const showPaymentDeadline =
    booking.status === 'confirmed' && !isPaid && booking.hold_expires_at
  const showUrgency = isExpired || showResponseDeadline || showPaymentDeadline

  useEffect(() => {
    if (!booking.hold_expires_at || isExpired) return
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [booking.hold_expires_at, isExpired])

  return (
    <article
      id={`booking-${booking.id}`}
      className={`prov-ui__booking stay-booking${booking.status === 'pending' ? ' stay-booking--pending' : ''}`}
      aria-labelledby={titleId}
    >
      <div className="prov-ui__booking-top">
        <span className="prov-ui__booking-avatar" aria-hidden>
          {booking.guest_display_name.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <div className="prov-ui__booking-meta">
          <h3 id={titleId}>{booking.guest_display_name}</h3>
          <span>{booking.listing_title}</span>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {showUrgency ? (
        <div
          className={`stay-booking__urgency${isExpired ? ' stay-booking__urgency--expired' : ''}`}
        >
          <Clock3 size={17} strokeWidth={2.25} aria-hidden />
          <div>
            <strong>
              {isExpired
                ? 'Request expired · inventory released'
                : showResponseDeadline
                  ? remaining
                    ? `Respond in ${remaining}`
                    : booking.hold_expires_at
                      ? 'Response window elapsed'
                      : 'Response required'
                  : remaining
                    ? `Guest payment due in ${remaining}`
                    : 'Guest payment window elapsed'}
            </strong>
            {booking.hold_expires_at && !isExpired ? (
              <span>
                Deadline{' '}
                <time
                  dateTime={booking.hold_expires_at}
                  title={new Date(booking.hold_expires_at).toLocaleString()}
                >
                  {deadlineDate.format(new Date(booking.hold_expires_at))}
                </time>
              </span>
            ) : isExpired ? (
              <span>This request no longer blocks the selected dates.</span>
            ) : (
              <span>Confirm or decline to update the guest.</span>
            )}
          </div>
        </div>
      ) : null}

      <dl className="stay-booking__facts">
        <div className="stay-booking__fact stay-booking__fact--room">
          <dt>
            <BedDouble size={16} strokeWidth={2.2} aria-hidden />
            Selected room
          </dt>
          <dd>{booking.room_type_name?.trim() || 'Room not specified'}</dd>
        </div>
        <div className="stay-booking__fact">
          <dt>
            <CalendarDays size={16} strokeWidth={2.2} aria-hidden />
            Stay dates
          </dt>
          <dd>
            <time dateTime={booking.check_in}>
              {friendlyDate.format(parseDateOnly(booking.check_in))}
            </time>
            <span aria-hidden> – </span>
            <time dateTime={booking.check_out}>
              {friendlyDate.format(parseDateOnly(booking.check_out))}
            </time>
            <small>
              {nights} night{nights === 1 ? '' : 's'}
            </small>
          </dd>
        </div>
        <div className="stay-booking__fact">
          <dt>
            <Users size={16} strokeWidth={2.2} aria-hidden />
            Guests
          </dt>
          <dd>
            {booking.guests} guest{booking.guests === 1 ? '' : 's'}
          </dd>
        </div>
      </dl>

      <section className="stay-booking__finance" aria-label="Booking payment summary">
        <dl>
          <div>
            <dt>Guest total</dt>
            <dd>{format(booking.total_price)}</dd>
          </div>
          <div>
            <dt>Delve fee</dt>
            <dd>
              {hasMoneyValue(booking.platform_fee) ? (
                format(booking.platform_fee)
              ) : (
                <span className="stay-booking__money-unavailable">Not available</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Expected payout</dt>
            <dd>
              {hasMoneyValue(booking.seller_payout) ? (
                format(booking.seller_payout)
              ) : (
                <span className="stay-booking__money-unavailable">Not available</span>
              )}
            </dd>
          </div>
        </dl>
        <p className={`stay-booking__payment stay-booking__payment--${paymentState.tone}`}>
          {paymentState.label}
        </p>
      </section>

      <section className="stay-booking__request" aria-label="Special requests">
        <strong>Special requests</strong>
        <p>{booking.special_requests?.trim() || 'No special requests'}</p>
      </section>

      <div className="prov-ui__booking-actions stay-booking__actions">
        {booking.guest_username ? (
          <Link
            to={messageUserPath(booking.guest_username, 'provider', {
              type: 'booking_stay',
              id: booking.id,
              label: booking.listing_title,
            })}
            state={{ from: '/provider/stays', guestName: booking.guest_display_name }}
            className="prov-ui__btn prov-ui__btn--ghost stay-booking__message"
            aria-label={`Message ${booking.guest_display_name}`}
          >
            <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
            Message guest
          </Link>
        ) : null}
        {canManage
          ? statusActions.map((action) => {
              const isRefund = action.action === 'refund'
              const isDecline = booking.status === 'pending' && action.action === 'cancel'
              const label = isDecline ? 'Decline' : action.label
              const isPendingAction = Boolean(
                actionPending && pendingAction === action.action,
              )

              return (
                <button
                  key={action.action}
                  type="button"
                  className={`prov-ui__btn ${
                    action.action === 'confirm'
                      ? 'prov-ui__btn--primary stay-booking__confirm'
                      : `prov-ui__btn--ghost${isDecline ? ' stay-booking__decline' : ''}`
                  }`}
                  disabled={isRefund || actionPending}
                  title={
                    isRefund ? 'Refunds are handled by DELVE support during beta' : undefined
                  }
                  onClick={() => {
                    if (isRefund) return
                    onAction?.(action.action)
                  }}
                >
                  {action.action === 'confirm' ? <Check size={16} aria-hidden /> : null}
                  {isDecline ? <X size={16} aria-hidden /> : null}
                  {isPendingAction
                    ? pendingActionLabel(action.action, isDecline)
                    : label}
                  {isRefund ? ' (beta)' : ''}
                </button>
              )
            })
          : null}
      </div>
    </article>
  )
}
