type Props = {
  count: number
  className?: string
}

export function NavBadge({ count, className = '' }: Props) {
  if (count <= 0) return null
  const label = count > 99 ? '99+' : String(count)
  return (
    <span className={`nav-badge ${className}`.trim()} aria-label={`${count} notifications`}>
      {label}
    </span>
  )
}
