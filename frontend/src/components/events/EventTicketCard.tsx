import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Clock,
  Info,
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
import './event-detail.css'

type Props = {
  event: EventDetail
  className?: string
}

export function EventTicketCard({ event, className = '' }: Props) {
  const start = formatEventDateLong(event.starts_at)
  const organizerName = organizerLabel(event)
  const organizerProfileHref = `/u/${encodeURIComponent(event.organizer_username ?? '')}`
  const cityLine = [event.city, event.region].filter(Boolean).join(', ')
  const hasLocation = Boolean(event.venue?.trim() || event.city || event.region)
  const hasTicketing = Boolean(event.ticket_url?.trim())
  const gcalUrl = buildGoogleCalendarUrl(event)
  const mapUrl = openStreetMapSearchUrl(event.venue ?? '', event.city ?? '', event.region)
  const priceLabel = admissionLabel(event)

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
            Up to {event.capacity}
          </span>
        ) : null}
      </div>

      {hasTicketing ? (
        <a
          href={event.ticket_url!}
          className="btn btn-primary btn-block"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Ticket size={16} strokeWidth={2.25} aria-hidden />
          Get tickets
        </a>
      ) : (
        <Link to={organizerProfileHref} className="btn btn-primary btn-block">
          <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
          Contact organizer
        </Link>
      )}

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
