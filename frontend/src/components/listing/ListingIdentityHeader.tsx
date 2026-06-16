import type { ReactNode } from 'react'
import { Clock, Share2, Bookmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ListingSection } from './ListingSection'
import './listing-detail.css'

type Action = {
  id?: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  accent?: boolean
}

type Props = {
  name: string
  tagline?: string | null
  categoryLabel?: string | null
  rating?: string | number | null
  reviewCount?: number | null
  isOpen?: boolean | null
  hoursLabel?: string | null
  locationLabel?: string | null
  onShare?: () => void
  onSave?: () => void
  saved?: boolean
  actions?: Action[]
  className?: string
}

export function ListingIdentityHeader({
  name,
  tagline,
  categoryLabel,
  rating,
  reviewCount,
  isOpen,
  hoursLabel,
  locationLabel,
  onShare,
  onSave,
  saved = false,
  actions = [],
  className = '',
}: Props) {
  const ratingNum = rating != null ? parseFloat(String(rating)) : null
  const hasRating = ratingNum != null && !Number.isNaN(ratingNum)

  return (
    <ListingSection className={`listing-identity ${className}`.trim()}>
      <div className="listing-identity__top">
        <div className="listing-identity__copy">
          <h1 className="listing-identity__name">{name}</h1>
          {tagline ? <p className="listing-identity__tagline">{tagline}</p> : null}
          <div className="listing-identity__meta">
            {hasRating ? <span>★ {ratingNum!.toFixed(1)}</span> : null}
            {reviewCount ? <span>{reviewCount} reviews</span> : null}
            {locationLabel ? <span>{locationLabel}</span> : null}
          </div>
        </div>

        <div className="listing-identity__actions">
          {onShare ? (
            <button type="button" className="listing-identity__icon-btn" onClick={onShare} aria-label="Share">
              <Share2 size={16} strokeWidth={2.25} />
            </button>
          ) : null}
          {onSave ? (
            <button
              type="button"
              className={`listing-identity__icon-btn${saved ? ' listing-identity__icon-btn--on' : ''}`}
              onClick={onSave}
              aria-label={saved ? 'Saved' : 'Save'}
              aria-pressed={saved}
            >
              <Bookmark size={16} strokeWidth={2.25} />
            </button>
          ) : null}
          {actions.map((action) => {
            const cls = `listing-identity__icon-btn listing-identity__icon-btn--text${action.accent ? ' listing-identity__icon-btn--on' : ''}`
            if (action.href) {
              return (
                <Link key={action.id ?? action.label} className={cls} to={action.href}>
                  {action.icon}
                  {action.label}
                </Link>
              )
            }
            return (
              <button key={action.id ?? action.label} type="button" className={cls} onClick={action.onClick}>
                {action.icon}
                {action.label}
              </button>
            )
          })}
        </div>
      </div>

      {categoryLabel || isOpen != null || hoursLabel ? (
        <div className="listing-identity__chips">
          {categoryLabel ? <span className="listing-identity__chip">{categoryLabel}</span> : null}
          {isOpen != null ? (
            <span className={`listing-identity__chip${isOpen ? ' listing-identity__chip--open' : ' listing-identity__chip--closed'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          ) : null}
          {hoursLabel ? (
            <span className="listing-identity__chip">
              <Clock size={11} strokeWidth={2.25} aria-hidden />
              {hoursLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </ListingSection>
  )
}
