import { bookingStatusLabel, bookingStatusVariant, type BookingStatusVariant } from './bookingStatus'

type Props = {
  status: string
  label?: string
  variant?: BookingStatusVariant
  className?: string
}

export function BookingStatusBadge({ status, label, variant, className = '' }: Props) {
  const v = variant ?? bookingStatusVariant(status)
  const text = label ?? bookingStatusLabel(status)
  return (
    <span className={`bk-status bk-status--${v} ${className}`.trim()} role="status">
      {text}
    </span>
  )
}
