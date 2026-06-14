import { Link } from 'react-router-dom'
import { CheckCircle, MessageCircle, UserRound } from 'lucide-react'
import { BookingStatusBadge } from './BookingStatusBadge'

type Props = {
  title: string
  subtitle?: string
  dateLabel?: string
  groupLabel?: string
  message?: string
  requestRef?: string | number
  guideProfileHref?: string
  guideId?: number | string
  packageHref?: string
  mode?: 'guide' | 'package'
  className?: string
}

export function GuideRequestSuccess({
  title,
  subtitle,
  dateLabel,
  groupLabel,
  message,
  requestRef,
  guideProfileHref,
  guideId,
  packageHref,
  mode = 'guide',
  className = '',
}: Props) {
  return (
    <div className={`gd-request-success card ${className}`.trim()} role="status">
      <CheckCircle className="gd-request-success__icon" size={40} strokeWidth={2} aria-hidden />
      <h3 className="gd-request-success__title">Request sent</h3>
      <BookingStatusBadge status="pending" label="Pending guide confirmation" className="gd-request-success__badge" />
      <p className="gd-request-success__text">
        The guide will review your request and confirm availability.
      </p>

      <dl className="gd-request-success__dl">
        <div>
          <dt>{mode === 'package' ? 'Experience' : 'Guide'}</dt>
          <dd>{title}</dd>
        </div>
        {subtitle ? (
          <div>
            <dt>Guide</dt>
            <dd>{subtitle}</dd>
          </div>
        ) : null}
        {dateLabel ? (
          <div>
            <dt>Preferred date</dt>
            <dd>{dateLabel}</dd>
          </div>
        ) : null}
        {groupLabel ? (
          <div>
            <dt>Group size</dt>
            <dd>{groupLabel}</dd>
          </div>
        ) : null}
        {message ? (
          <div className="gd-request-success__dl--full">
            <dt>Your message</dt>
            <dd>{message}</dd>
          </div>
        ) : null}
      </dl>

      {requestRef ? (
        <p className="gd-request-success__ref">
          Request reference <code>#{requestRef}</code>
        </p>
      ) : null}

      <div className="gd-request-success__actions">
        <Link to="/messages" className="btn btn-primary btn-block">
          <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
          Message guide
        </Link>
        {mode === 'package' && packageHref ? (
          <Link to={packageHref} className="btn btn-ghost btn-block">
            View experience
          </Link>
        ) : null}
        {(guideProfileHref || guideId) ? (
          <Link to={guideProfileHref ?? `/guides/${guideId}`} className="btn btn-ghost btn-block">
            <UserRound size={16} strokeWidth={2.25} aria-hidden />
            View guide profile
          </Link>
        ) : null}
        <Link to="/guides" className="btn btn-ghost btn-block">
          Browse more guides
        </Link>
        <Link to="/dashboard#bookings" className="btn btn-ghost btn-block">
          View my bookings
        </Link>
      </div>
    </div>
  )
}
