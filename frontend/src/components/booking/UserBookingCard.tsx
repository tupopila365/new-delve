import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Users } from 'lucide-react'
import { BOOKING_SERVICE_LABELS, type BookingServiceType } from './bookingStatus'
import { BookingStatusBadge } from './BookingStatusBadge'
import { MessageProviderLink } from '../messages'

type Props = {
  serviceType: BookingServiceType
  title: string
  provider?: string
  dateLabel?: string
  peopleLabel?: string
  location?: string
  status: string
  price?: string
  href?: string
  messageTo?: string
  messageUsername?: string
  onMessage?: () => void
  onCancel?: () => void
  cancelDisabled?: boolean
  cancelTitle?: string
  nextStep?: string
  viewLabel?: string
  messageLabel?: string
  className?: string
}

export function UserBookingCard({
  serviceType,
  title,
  provider,
  dateLabel,
  peopleLabel,
  location,
  status,
  price,
  href,
  messageTo,
  messageUsername,
  onMessage,
  onCancel,
  cancelDisabled,
  cancelTitle,
  nextStep,
  viewLabel = 'View details',
  messageLabel = 'Message provider',
  className = '',
}: Props) {
  const typeLabel = BOOKING_SERVICE_LABELS[serviceType]

  const mainContent = (
    <>
      <div className="bk-user-card__head">
        <span className={`bk-user-card__type bk-user-card__type--${serviceType}`}>{typeLabel}</span>
        <BookingStatusBadge status={status} />
      </div>
      <h3 className="bk-user-card__title">{title}</h3>
      {provider ? <p className="bk-user-card__provider">{provider}</p> : null}
      <ul className="bk-user-card__meta">
        {dateLabel ? (
          <li>
            <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
            {dateLabel}
          </li>
        ) : null}
        {peopleLabel ? (
          <li>
            <Users size={14} strokeWidth={2.25} aria-hidden />
            {peopleLabel}
          </li>
        ) : null}
        {location ? (
          <li>
            <MapPin size={14} strokeWidth={2.25} aria-hidden />
            {location}
          </li>
        ) : null}
      </ul>
      {price ? <p className="bk-user-card__price">{price}</p> : null}
      {nextStep ? <p className="bk-user-card__next">{nextStep}</p> : null}
    </>
  )

  return (
    <article className={`bk-user-card card ${className}`.trim()}>
      {href ? (
        <Link to={href} className="bk-user-card__main" aria-label={`${viewLabel}: ${title}`}>
          {mainContent}
        </Link>
      ) : (
        <div className="bk-user-card__main">{mainContent}</div>
      )}
      <div className="bk-user-card__actions">
        {href ? (
          <Link to={href} className="btn btn-ghost btn-sm">
            {viewLabel}
          </Link>
        ) : null}
        {messageUsername ? (
          <MessageProviderLink username={messageUsername} label={messageLabel} size="sm" variant="ghost" />
        ) : messageTo ? (
          <Link to={messageTo} className="btn btn-ghost btn-sm">
            {messageLabel}
          </Link>
        ) : onMessage ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onMessage}>
            {messageLabel}
          </button>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={cancelDisabled}
            title={cancelDisabled ? cancelTitle : undefined}
            onClick={onCancel}
          >
            Cancel request
          </button>
        ) : null}
      </div>
    </article>
  )
}
