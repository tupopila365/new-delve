/**
 * Worldwide area / city filter options for marketplace lists.
 * Prefer live listing places, then Explore-country town centres + regions — never a Namibia-only hardcode.
 */

import { regionsForCountry } from './exploreDestination'
import { townCentresForCountry } from './exploreNearPoint'

export function popularAreasForCountry(country: string, limit = 12): string[] {
  const code = (country || '').trim().toUpperCase()
  const towns = townCentresForCountry(code).map((t) => t.label)
  const regions = [...regionsForCountry(code)]
  const out: string[] = []
  const seen = new Set<string>()
  for (const label of [...towns, ...regions]) {
    const key = label.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(label.trim())
    if (out.length >= limit) break
  }
  return out
}

/** Rank unique place labels from listing rows (city / region / multi-region). */
export function collectListingAreas(
  rows: Iterable<{
    city?: string | null
    region?: string | null
    regions?: string[] | null
  }>,
  limit = 12,
): string[] {
  const counts = new Map<string, { label: string; n: number }>()
  for (const row of rows) {
    const candidates = [row.city, row.region, ...(row.regions ?? [])]
    for (const raw of candidates) {
      const label = (raw || '').trim()
      if (!label) continue
      const key = label.toLowerCase()
      const cur = counts.get(key)
      if (cur) cur.n += 1
      else counts.set(key, { label, n: 1 })
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((c) => c.label)
}

/**
 * Dropdown options for “All areas / All cities”.
 * Listing-derived places first; fill with popular places for the active Explore country.
 */
export function buildAreaFilterOptions(opts: {
  country: string
  listingAreas?: string[]
  limit?: number
}): string[] {
  const limit = opts.limit ?? 12
  const out: string[] = []
  const seen = new Set<string>()
  const push = (label: string) => {
    const t = label.trim()
    if (!t) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }
  for (const a of opts.listingAreas ?? []) {
    push(a)
    if (out.length >= limit) return out
  }
  for (const a of popularAreasForCountry(opts.country, limit)) {
    push(a)
    if (out.length >= limit) break
  }
  return out
}

/** Town-centre labels for the Explore country — safe to send as `city=` API filters. */
export function isCityAreaForCountry(country: string, area: string): boolean {
  const needle = area.trim().toLowerCase()
  if (!needle) return false
  return townCentresForCountry(country).some((t) => t.label.toLowerCase() === needle)
}
