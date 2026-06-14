import { BookingStatusBadge } from '../booking'

type Props = {
  status: string
  className?: string
}

export function StatusBadge({ status, className = '' }: Props) {
  return <BookingStatusBadge status={status} className={className} />
}
