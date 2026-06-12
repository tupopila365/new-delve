export type TrustBadgeItem = string | { label: string; variant?: 'default' | 'urgency' | 'success' }

type Props = {
  items: TrustBadgeItem[]
  className?: string
}

function normalize(item: TrustBadgeItem): { label: string; variant: 'default' | 'urgency' | 'success' } {
  if (typeof item === 'string') return { label: item, variant: 'default' }
  return { label: item.label, variant: item.variant ?? 'default' }
}

export function TrustBadgeRow({ items, className = '' }: Props) {
  if (items.length === 0) return null

  return (
    <div className={`dl-detail__trust-row ${className}`.trim()}>
      {items.map((item) => {
        const { label, variant } = normalize(item)
        return (
          <span
            key={label}
            className={variant !== 'default' ? `dl-detail__trust-chip--${variant}` : undefined}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
