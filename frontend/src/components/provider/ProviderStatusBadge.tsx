type Variant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

type Props = {
  status: string
  variant?: Variant
}

const STATUS_VARIANT: Record<string, Variant> = {
  published: 'success',
  confirmed: 'success',
  completed: 'success',
  checked_in: 'success',
  checked_out: 'success',
  paid: 'success',
  seated: 'success',
  accepted: 'success',
  pending: 'warning',
  requested: 'warning',
  reserved: 'warning',
  needs_update: 'warning',
  pending_review: 'info',
  draft: 'neutral',
  cancelled: 'danger',
  refunded: 'danger',
  declined: 'danger',
  suspended: 'danger',
  no_show: 'danger',
}

export function ProviderStatusBadge({ status, variant }: Props) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  const v = variant ?? STATUS_VARIANT[key] ?? 'neutral'
  const label = status.replace(/_/g, ' ')
  return <span className={`prov-status prov-status--${v}`}>{label}</span>
}
