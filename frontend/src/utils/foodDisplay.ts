import { mediaUrl } from '../api/client'

const FOOD_IMAGE_BY_CUISINE: Record<string, string> = {
  cafe: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
  grill: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
  seafood: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
  bar: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
  local: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  asian: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  fast_food: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  other: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
}

const DEFAULT_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80'

export function foodCoverSrc(coverImage: string | null | undefined, cuisine: string): string {
  const resolved = mediaUrl(coverImage)
  if (resolved) return resolved
  return FOOD_IMAGE_BY_CUISINE[cuisine] ?? DEFAULT_FOOD_IMAGE
}

export function foodOpenBadge(isOpen: boolean | null | undefined, closesAt?: string | null): string {
  if (isOpen === true) return closesAt ? `Open · Closes ${closesAt}` : 'Open now'
  if (isOpen === false) return 'Closed'
  return ''
}

export function pickFeaturedFood<T extends { rating_avg?: string | null }>(venues: T[]): T | null {
  if (!venues.length) return null
  return venues.reduce((best, v) => {
    const r = parseFloat(v.rating_avg ?? '0')
    const br = parseFloat(best.rating_avg ?? '0')
    return r > br ? v : best
  })
}
