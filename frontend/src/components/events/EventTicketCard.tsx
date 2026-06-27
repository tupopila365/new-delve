import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Ticket,
  UserRound,
} from 'lucide-react'
import {
  admissionLabel,
  buildGoogleCalendarUrl,
  formatEventDateLong,
  openStreetMapSearchUrl,
  organizerLabel,
  type EventDetail,
} from '../../utils/eventListing'
import { externalTicketHref, resolveTicketingMode } from '../../utils/eventTicketing'
import './event-detail.css'

type Props = {
  event: EventDetail
  className?: string
  attending?: boolean
  rsvpPending?: boolean
  onRsvp?: () => void
  onCancelRsvp?: () => void
  onPay?: () => void
  payPending?: boolean
  bookingStatus?: string
  bookingTotal?: string | number | null
  mockPaymentRef?: string | null
  ticketQr?: { booking_ref: string; qr_payload: string } | null
}

export function EventTicketCard({
  event,
  className = '',
  attending = false,
  rsvpPending = false,
  onRsvp,
  onCancelRsvp,
  onPay,
  payPending = false,
  bookingStatus,
  bookingTotal,
  mockPaymentRef,
  ticketQr,
}: Props) {
  const ticketingMode = resolveTicketingMode(event)
  const start = formatEventDateLong(event.starts_at)
  const organizerName = organizerLabel(event)
  const organizerProfileHref = `/u/${encodeURIComponent(event.organizer_username ?? '')}`
  const cityLine = [event.city, event.region].filter(Boolean).join(', ')
  const hasLocation = Boolean(event.venue?.trim() || event.city || event.region)
  const gcalUrl = buildGoogleCalendarUrl(event)
  const mapUrl = openStreetMapSearchUrl(event.venue ?? '', event.city ?? '', event.region)
  const priceLabel = admissionLabel(event)
  const spotsLeft =
    event.capacity && event.rsvp_count != null
      ? Math.max(0, event.capacity - event.rsvp_count)
      : null

  const primaryAction = (() => {
    if (rsvpPending) {
      return (
        <button type="button" className="btn btn-primary btn-block" disabled>
          <Loader2 size={16} strokeWidth={2.25} className="spin" aria-hidden />
          Saving your spot…
        </button>
      )
    }
    if (attending) {
      if (bookingStatus === 'pending' && onPay) {
        return (
          <button type="button" className="btn btn-primary btn-block" onClick={onPay} disabled={payPending}>
            <Ticket size={16} strokeWidth={2.25} aria-hidden />
            {payPending ? 'Processing…' : `Pay N$${bookingTotal ?? event.price ?? ''} (mock)`}
          </button>
        )
      }
      return (
        <div className="event-ticket__rsvp-done">
          <p>
            <CheckCircle2 size={16} strokeWidth={2.25} aria-hidden />
            {bookingStatus === 'pending' ? 'Payment required' : "You're going"}
          </p>
          {mockPaymentRef ? (
            <p className="event-ticket__payment-ref">
              Paid · ref <code>{mockPaymentRef}</code>
            </p>
          ) : null}
          {onCancelRsvp ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelRsvp}>
              Cancel RSVP
            </button>
          ) : null}
        </div>
      )
    }
    if (ticketingMode === 'external') {
      return (
        <a
          href={externalTicketHref(event.id)}
          className="btn btn-primary btn-block"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Ticket size={16} strokeWidth={2.25} aria-hidden />
          Get tickets
        </a>
      )
    }
    if (ticketingMode === 'on_platform' && onRsvp) {
      return (
        <button type="button" className="btn btn-primary btn-block" onClick={onRsvp} disabled={rsvpPending}>
          <Ticket size={16} strokeWidth={2.25} aria-hidden />
          Reserve · N${event.price}
        </button>
      )
    }
    if (onRsvp) {
      return (
        <button type="button" className="btn btn-primary btn-block" onClick={onRsvp} disabled={rsvpPending}>
          <Ticket size={16} strokeWidth={2.25} aria-hidden />
          RSVP free
        </button>
      )
    }
    return (
      <Link to={organizerProfileHref} className="btn btn-primary btn-block">
        <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
        Contact organizer
      </Link>
    )
  })()

  return (
    <div className={`event-ticket ${className}`.trim()} id="event-ticket-panel">
      <p className="event-ticket__kicker">Get your spot</p>

      <p className={`event-ticket__price${event.is_free ? ' event-ticket__price--free' : ''}`}>
        {event.is_free ? (
          <>
            <BadgeDollarSign size={20} strokeWidth={2.25} aria-hidden />
            Free entry
          </>
        ) : event.price ? (
          <>
            <BadgeDollarSign size={20} strokeWidth={2.25} aria-hidden />
            N${event.price}
          </>
        ) : (
          <>
            <Info size={20} strokeWidth={2.25} aria-hidden />
            {priceLabel}
          </>
        )}
      </p>

      {start.valid ? (
        <div className="event-ticket__date-chip">
          <div className="event-ticket__date-chip-visual" aria-hidden>
            <span>{start.month}</span>
            <strong>{start.day}</strong>
          </div>
          <p className="event-ticket__date-chip-text">
            {start.weekday}
            <br />
            {start.time}
          </p>
        </div>
      ) : null}

      <div className="event-ticket__meta">
        {hasLocation ? (
          <span>
            <MapPin size={12} strokeWidth={2.25} aria-hidden />
            {event.venue || cityLine}
          </span>
        ) : null}
        <span>
          <UserRound size={12} strokeWidth={2.25} aria-hidden />
          {organizerName}
        </span>
        {event.capacity ? (
          <span>
            <Building2 size={12} strokeWidth={2.25} aria-hidden />
            {spotsLeft != null ? `${spotsLeft} spots left` : `Up to ${event.capacity}`}
          </span>
        ) : null}
        {event.rsvp_count ? (
          <span>
            <Clock size={12} strokeWidth={2.25} aria-hidden />
            {event.rsvp_count} attending
          </span>
        ) : null}
      </div>

      {primaryAction}

      {ticketQr && (bookingStatus === 'confirmed' || bookingStatus === 'checked_in') ? (
        <div className="event-ticket__qr">
          <p className="event-ticket__qr-ref">{ticketQr.booking_ref}</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(ticketQr.qr_payload)}`}
            alt={`Check-in QR for ${ticketQr.booking_ref}`}
            width={140}
            height={140}
            loading="lazy"
          />
          <p className="event-ticket__trust">Show this code at the door for check-in.</p>
        </div>
      ) : null}

      {ticketingMode === 'external' && onRsvp && !attending ? (
        <button type="button" className="btn btn-ghost btn-block" onClick={onRsvp} style={{ marginTop: 8 }}>
          RSVP on DELVE (I'm going)
        </button>
      ) : null}

      <div className="event-ticket__actions">
        <a href={gcalUrl} className="event-ticket__secondary" target="_blank" rel="noopener noreferrer">
          <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
          Calendar
        </a>
        {hasLocation ? (
          <a href={mapUrl} className="event-ticket__secondary" target="_blank" rel="noopener noreferrer">
            <Navigation size={14} strokeWidth={2.25} aria-hidden />
            Directions
          </a>
        ) : (
          <Link to="/messages" className="event-ticket__secondary">
            <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
            Message
          </Link>
        )}
      </div>

      <p className="event-ticket__trust">
        Event details are managed by the organizer. Confirm time, venue, and entry requirements before attending.
      </p>
    </div>
  )
}
