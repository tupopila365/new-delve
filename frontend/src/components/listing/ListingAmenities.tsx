import { ListingSection } from './ListingSection'
import type { ListingLabelItem } from './types'
import './listing-detail.css'

type Props = {
  items: ListingLabelItem[]
  title?: string
  maxVisible?: number
  className?: string
}

export function ListingAmenities({
  items,
  title = 'Amenities',
  maxVisible = 24,
  className = '',
}: Props) {
  if (items.length === 0) return null

  const visible = items.slice(0, maxVisible)
  const extra = items.length - visible.length

  return (
    <ListingSection title={title} className={`listing-amenities ${className}`.trim()}>
      <div className="listing-amenities__grid">
        {visible.map((item) => (
          <span key={item.id ?? item.label} className="listing-amenities__chip">
            {item.icon}
            {item.label}
          </span>
        ))}
      </div>
      {extra > 0 ? <p className="listing-amenities__more">+{extra} more</p> : null}
    </ListingSection>
  )
}
