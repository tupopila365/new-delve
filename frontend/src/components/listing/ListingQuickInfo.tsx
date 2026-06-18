import type { ListingQuickChip } from './types'
import './listing-detail.css'

type Props = {
  chips: ListingQuickChip[]
  highlights?: string[]
  className?: string
}

export function ListingQuickInfo({ chips, highlights = [], className = '' }: Props) {
  if (chips.length === 0 && highlights.length === 0) return null

  return (
    <div className={`listing-quick-info ${className}`.trim()}>
      {chips.length > 0 ? (
        <p className="listing-quick-info__stats">
          {chips.map((chip) => (
            <span
              key={chip.id ?? chip.label}
              className={`listing-quick-info__stat${chip.accent ? ' listing-quick-info__stat--accent' : ''}`}
            >
              {chip.icon}
              {chip.label}
            </span>
          ))}
        </p>
      ) : null}
      {highlights.length > 0 ? (
        <p className="listing-quick-info__highlights">{highlights.join(' · ')}</p>
      ) : null}
    </div>
  )
}
