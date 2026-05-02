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
      <span className="gd-detail__response-icon" aria-hidden>
        ⚡
      </span>
      {label}
    </p>
  )
}
