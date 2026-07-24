/**
 * Niche 9 — Trust ranking helpers for Explore browse lists.
 * Verified businesses rise; unverified / junk supply sinks when expanding countries.
 */

export type ListingTrustFields = {
  owner_verified?: boolean | null
  is_featured_partner?: boolean | null
  partner_label?: string | null
  rating_count?: number | null
}

/** Score delta applied in Recommended sort (verified first, unverified demoted). */
export function listingTrustBoost(row: ListingTrustFields): number {
  if (row.owner_verified) return 5
  return -1.5
}

/** Browse-card trust chip — prefer verified, then featured, then popular. */
export function listingTrustLabel(row: ListingTrustFields): string | null {
  if (row.owner_verified) return 'Verified'
  if (row.is_featured_partner) return row.partner_label?.trim() || 'Featured'
  const count = row.rating_count ?? 0
  if (count >= 20) return 'Popular'
  return null
}
