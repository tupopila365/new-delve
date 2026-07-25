export type ListingDealSource = 'travel_offer' | 'listing_sale' | string

export type ListingDeal = {
  id: number | string
  business_id: number
  title: string
  summary?: string
  offer_kind: string
  eligibility: string
  eligibility_display?: string
  price_label?: string
  badge: string
  badge_kind: 'sale' | 'eligibility' | 'package' | 'discount' | string
  how_to_claim?: string
  proof_required?: string
  details?: string
  terms_note?: string
  starts_on?: string | null
  ends_on?: string | null
  /** Phase 2 */
  source?: ListingDealSource
  sale_id?: number
  sale_price?: string | null
  compare_at_price?: string | null
  listing_href?: string
  vertical?: string
  listing_id?: number
  /** Phase 3 */
  min_age?: number | null
  max_age?: number | null
  min_party_size?: number | null
  max_party_size?: number | null
  age_label?: string | null
  party_label?: string | null
  may_qualify?: boolean | null
  qualify_hint?: string | null
}

export function asListingDeals(raw: unknown): ListingDeal[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (d): d is ListingDeal =>
      Boolean(d && typeof d === 'object' && 'id' in d && 'badge' in d && 'title' in d),
  )
}

/** First active listing-level sale in a deals array (Phase 2). */
export function listingSaleDeal(deals?: ListingDeal[] | unknown): ListingDeal | null {
  const list = asListingDeals(deals)
  return list.find((d) => d.source === 'listing_sale') ?? null
}

/** True when a listing carries any active sale or open-rate / travel offer. */
export function listingHasActiveDeals(deals?: ListingDeal[] | unknown): boolean {
  return asListingDeals(deals).length > 0
}
