import { Clock } from 'lucide-react'

type Props = { hours: number }

export function GuideResponseBadge({ hours }: Props) {
  if (hours <= 0) return null
  const label =
    hours < 1
      ? 'Typically replies within the hour'
      : hours === 1
        ? 'Typically replies within 1 hour'
        : `Typically replies within ${hours} hours`
  return (
    <p className="gd-detail__response-badge" role="status">
      <Clock className="gd-detail__response-icon" size={15} strokeWidth={2.25} aria-hidden />
      {label}
    </p>
  )
}
