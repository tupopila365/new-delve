import type { ListingDeal } from './types'
import './deals.css'

type Props = {
  deals: ListingDeal[]
  max?: number
  onSelect?: (deal: ListingDeal) => void
  className?: string
}

export function DealBadges({ deals, max = 2, onSelect, className = '' }: Props) {
  if (!deals.length) return null
  const shown = deals.slice(0, max)
  const extra = deals.length - shown.length

  return (
    <div className={`deal-badges ${className}`.trim()} role="list" aria-label="Deals and discounts">
      {shown.map((deal) => (
        <button
          key={deal.id}
          type="button"
          role="listitem"
          className={`deal-badge deal-badge--${deal.badge_kind || 'discount'}${
            deal.may_qualify === true ? ' deal-badge--qualify' : ''
          }`}
          title={deal.qualify_hint || deal.eligibility_display || deal.title}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onSelect?.(deal)
          }}
        >
          {deal.badge}
          {deal.may_qualify === true ? <span className="deal-badge__dot" aria-hidden /> : null}
        </button>
      ))}
      {extra > 0 ? (
        <span className="deal-badge deal-badge--more" role="listitem">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}
