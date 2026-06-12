type Variant = 'verified' | 'open' | 'closed' | 'free' | 'popular' | 'budget' | 'new' | 'fast' | 'licensed' | 'default'

type Props = {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

export function MarketplaceBadge({ variant = 'default', children, className = '' }: Props) {
  return (
    <span className={`mk-badge mk-badge--${variant} ${className}`.trim()}>
      {children}
    </span>
  )
}
