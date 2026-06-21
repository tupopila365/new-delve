import type { StatusVariant } from '../api/types'

type Props = {
  status: string
  variant?: StatusVariant
}

const VARIANT_CLASS: Record<StatusVariant, string> = {
  success: 'da-badge--success',
  warning: 'da-badge--warning',
  danger: 'da-badge--danger',
  neutral: 'da-badge--neutral',
  info: 'da-badge--info',
}

export function DelveAdminStatusBadge({ status, variant = 'neutral' }: Props) {
  const label = status.replace(/_/g, ' ')
  return <span className={`da-badge ${VARIANT_CLASS[variant]}`}>{label}</span>
}
