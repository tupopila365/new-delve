import type { ReactNode } from 'react'
import { BookingInlineCard } from './BookingInlineCard'
import { BookingPriceSummary, type PriceLine } from './BookingPriceSummary'
import { BookingTrustNote } from './BookingTrustNote'
import { UserBookingErrorState } from './UserBookingErrorState'
import './booking-detail.css'

type Props = {
  kicker?: string
  priceTitle: ReactNode
  meta?: ReactNode
  fields: ReactNode
  priceLines?: PriceLine[]
  total?: { label: string; value: string }
  estimateNote?: string
  error?: string | null
  onDismissError?: () => void
  primaryAction: ReactNode
  secondaryAction?: ReactNode
  trustCopy?: string
  authHint?: string | null
  className?: string
}

export function BookingReservePanel({
  kicker,
  priceTitle,
  meta,
  fields,
  priceLines,
  total,
  estimateNote,
  error,
  onDismissError,
  primaryAction,
  secondaryAction,
  trustCopy = 'The provider will review your request before anything is final.',
  authHint,
  className = '',
}: Props) {
  return (
    <BookingInlineCard
      kicker={kicker}
      title={priceTitle}
      meta={meta}
      className={className}
      footer={<BookingTrustNote>{trustCopy}</BookingTrustNote>}
    >
      {fields}

      {priceLines && priceLines.length > 0 ? (
        <BookingPriceSummary lines={priceLines} total={total} estimateNote={estimateNote} />
      ) : null}

      {error ? (
        <UserBookingErrorState message={error} onDismiss={onDismissError} className="bk-reserve-panel__error" />
      ) : null}

      <div className="bk-reserve-panel__actions">
        {primaryAction}
        {secondaryAction}
      </div>

      {authHint ? <p className="bk-reserve-panel__hint">{authHint}</p> : null}
    </BookingInlineCard>
  )
}
