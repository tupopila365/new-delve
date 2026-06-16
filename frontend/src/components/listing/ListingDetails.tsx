import { ListingSection } from './ListingSection'
import type { ListingDetailRow } from './types'
import './listing-detail.css'

type Props = {
  title?: string
  rows: ListingDetailRow[]
  description?: string | null
  className?: string
}

export function ListingDetails({
  title = 'About',
  rows,
  description,
  className = '',
}: Props) {
  if (!description?.trim() && rows.length === 0) return null

  return (
    <ListingSection title={title} className={`listing-details ${className}`.trim()}>
      {description?.trim() ? <p className="listing-details__text">{description.trim()}</p> : null}
      {rows.length > 0 ? (
        <dl className="listing-details__list">
          {rows.map((row) => (
            <div key={row.id ?? row.label} className="listing-details__row">
              <dt className="listing-details__label">
                {row.icon}
                {row.label}
              </dt>
              <dd className="listing-details__value">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </ListingSection>
  )
}
