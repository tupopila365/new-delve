type Variant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

type Props = {
  status: string
  variant?: Variant
}

export function AdminStatusBadge({ status, variant = 'neutral' }: Props) {
  const label = status.replace(/_/g, ' ')
  return <span className={`adm-badge adm-badge--${variant}`}>{label}</span>
}
