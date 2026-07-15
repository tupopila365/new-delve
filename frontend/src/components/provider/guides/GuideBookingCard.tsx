import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { BookingStatusBadge } from '../../booking'
import { messageUserPath } from '../../messages/messageProviderUtils'

export type GuideProviderBooking = {
  id: number
  package_title: string
  package_id?: string
  guest_display_name: string
  guest_username: string
  date: string
  start_time?: string | null
  guests: number
  duration_hours: number
  meeting_point?: string
  notes?: string
  total_price: string
  status: string
  mock_payment_ref?: string
}

type Props = {
  booking: GuideProviderBooking
  canManage?: boolean
  statusActions?: { label: string; action: string }[]
  onAction?: (action: string) => void
  actionPending?: boolean
}

function formatStartTime(value: string | null | undefined) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  // "09:30:00" or "09:30"
  const m = trimmed.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return trimmed
  const h = Number(m[1])
  const min = m[2]
  if (!Number.isFinite(h)) return trimmed
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${min} ${suffix}`
}

export function GuideBookingCard({
  booking,
  canManage,
  statusActions = [],
  onAction,
  actionPending,
}: Props) {
  const timeLabel = formatStartTime(booking.start_time)
  const meeting = booking.meeting_point?.trim() || ''
  const notes = booking.notes?.trim() || ''

  return (
    <article className="prov-ui__booking">
      <div className="prov-ui__booking-top">
        <span className="prov-ui__booking-avatar" aria-hidden>
          {booking.guest_display_name.charAt(0)}
        </span>
        <div className="prov-ui__booking-meta">
          <strong>{booking.guest_display_name}</strong>
          <span>{booking.package_title}</span>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <div className="prov-ui__booking-details">
        <span>
          {booking.date}
          {timeLabel ? ` · ${timeLabel}` : ''} · {booking.duration_hours}h tour
        </span>
        <span>
          {booking.guests} guest{booking.guests === 1 ? '' : 's'}
        </span>
        <strong>N${parseFloat(booking.total_price).toLocaleString()}</strong>
      </div>
      {meeting || notes ? (
        <div className="prov-ui__booking-extra" style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.86 }}>
          {meeting ? <p style={{ margin: '0 0 4px' }}>Meet: {meeting}</p> : null}
          {notes ? <p style={{ margin: 0 }}>Notes: {notes}</p> : null}
        </div>
      ) : null}
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
            state={{ from: '/provider/guides', guestName: booking.guest_display_name }}
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
