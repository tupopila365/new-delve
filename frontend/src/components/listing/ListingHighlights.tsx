import { ListingSection } from './ListingSection'
import type { ListingLabelItem } from './types'
import './listing-detail.css'

type Props = {
  items: ListingLabelItem[]
  title?: string
  className?: string
}

export function ListingHighlights({
  items,
  title = 'Why guests love it',
  className = '',
}: Props) {
  if (items.length === 0) return null

  return (
    <ListingSection title={title} className={`listing-highlights ${className}`.trim()}>
      <div className="listing-highlights__grid">
        {items.map((item) => (
          <span key={item.id ?? item.label} className="listing-highlights__chip">
            {item.icon}
            {item.label}
          </span>
        ))}
      </div>
    </ListingSection>
  )
}
