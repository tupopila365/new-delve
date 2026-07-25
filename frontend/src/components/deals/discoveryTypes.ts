export type DiscoveryDeal = {
  id: string | number
  offer_id?: number | null
  source: 'travel_offer' | 'listing_sale' | string
  title: string
  summary?: string
  offer_kind?: string
  eligibility?: string
  eligibility_display?: string
  price_label?: string
  badge: string
  badge_kind?: string
  how_to_claim?: string
  proof_required?: string
  business_id?: number
  business_name?: string
  business_city?: string
  business_region?: string
  cover_image?: string | null
  href: string
  vertical?: string
  categories?: string[]
  may_qualify?: boolean | null
  qualify_hint?: string | null
  age_label?: string | null
  party_label?: string | null
  sale_price?: string | null
  compare_at_price?: string | null
}

export type DealsDiscoveryResponse = {
  results: DiscoveryDeal[]
  count: number
}

export type DealsDiscoveryParams = {
  q?: string
  category?: string
  eligibility?: string
  kind?: string
  region?: string
  city?: string
  may_qualify?: boolean
  sales?: boolean
  limit?: number
}

export function buildDealsDiscoveryPath(params: DealsDiscoveryParams = {}): string {
  const qs = new URLSearchParams()
  if (params.q?.trim()) qs.set('q', params.q.trim())
  if (params.category) qs.set('category', params.category)
  if (params.eligibility) qs.set('eligibility', params.eligibility)
  if (params.kind) qs.set('kind', params.kind)
  if (params.region) qs.set('region', params.region)
  if (params.city) qs.set('city', params.city)
  if (params.may_qualify) qs.set('may_qualify', '1')
  if (params.sales === false) qs.set('sales', '0')
  if (params.limit) qs.set('limit', String(params.limit))
  const s = qs.toString()
  return s ? `/api/accounts/deals/?${s}` : '/api/accounts/deals/'
}
