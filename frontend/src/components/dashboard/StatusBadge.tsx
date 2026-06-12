type Props = {
  status: string
  className?: string
}

const VARIANTS: Record<string, string> = {
  pending: 'pending',
  requested: 'pending',
  confirmed: 'confirmed',
  completed: 'confirmed',
  checked_in: 'confirmed',
  reserved: 'confirmed',
  paid: 'confirmed',
  cancelled: 'cancelled',
  refunded: 'cancelled',
  declined: 'cancelled',
}

export function StatusBadge({ status, className = '' }: Props) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  const variant = VARIANTS[key] ?? 'default'
  return (
    <span className={`dash-status dash-status--${variant} ${className}`.trim()}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
