import { useState, type ReactNode } from 'react'
import { DealBadges } from './DealBadges'
import { DealClaimSheet } from './DealClaimSheet'
import { asListingDeals, type ListingDeal } from './types'

type Props = {
  deals?: ListingDeal[] | unknown
  max?: number
  className?: string
  children?: ReactNode
}

/** Card overlay helper: badges that open the claim sheet without leaving the page. */
export function ListingDealBadges({ deals: raw, max = 2, className = '' }: Props) {
  const deals = asListingDeals(raw)
  const [active, setActive] = useState<ListingDeal | null>(null)
  if (!deals.length) return null

  return (
    <>
      <DealBadges deals={deals} max={max} onSelect={setActive} className={className} />
      <DealClaimSheet deal={active} onClose={() => setActive(null)} />
    </>
  )
}
