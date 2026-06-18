import type { ReactNode } from 'react'
import { CheckCircle } from 'lucide-react'
import { BookingDetailsList, type BookingDetailItem } from './BookingDetailsList'
import { BookingStatusBadge } from './BookingStatusBadge'
import './booking-detail.css'

type Props = {
  title?: string
  status?: string
  statusLabel?: string
  message?: string
  details?: BookingDetailItem[]
  reference?: string | number | null
  actions?: ReactNode
  className?: string
}

export function BookingSentPanel({
  title = 'Request sent',
  status = 'pending',
  statusLabel = 'Pending confirmation',
  message = 'The provider will review your request and confirm the details.',
  details = [],
  reference,
  actions,
  className = '',
}: Props) {
  return (
    <div className={`bk-sent-panel card ${className}`.trim()} role="status">
      <CheckCircle className="bk-sent-panel__icon" size={44} strokeWidth={2} aria-hidden />
      <h2 className="bk-sent-panel__title">{title}</h2>
      <BookingStatusBadge status={status} label={statusLabel} className="bk-sent-panel__badge" />
      <p className="bk-sent-panel__text">{message}</p>

      {details.length > 0 ? <BookingDetailsList items={details} className="bk-sent-panel__details" /> : null}

      {reference != null ? (
        <p className="bk-sent-panel__ref">
          Request reference <code>#{reference}</code>
        </p>
      ) : null}

      {actions ? <div className="bk-sent-panel__actions">{actions}</div> : null}
    </div>
  )
}
