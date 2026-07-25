import { useState } from 'react'
import { DealBadges } from './DealBadges'
import { DealClaimSheet } from './DealClaimSheet'
import { asListingDeals, type ListingDeal } from './types'
import './deals.css'

type Props = {
  deals?: ListingDeal[] | unknown
  maxBadges?: number
  title?: string
  className?: string
}

/** Detail-page strip: badges + shared how-to-claim sheet. */
export function ListingDealsStrip({
  deals: raw,
  maxBadges = 4,
  title = 'Deals & discounts',
  className = '',
}: Props) {
  const deals = asListingDeals(raw)
  const [active, setActive] = useState<ListingDeal | null>(null)
  if (!deals.length) return null

  return (
    <section className={`deal-strip ${className}`.trim()} aria-label={title}>
      <div className="deal-strip__head">
        <h2 className="deal-strip__title">{title}</h2>
        <p className="deal-strip__hint">Tap a badge to see who qualifies and how to claim it.</p>
      </div>
      <DealBadges deals={deals} max={maxBadges} onSelect={setActive} />
      <DealClaimSheet deal={active} onClose={() => setActive(null)} />
    </section>
  )
}
