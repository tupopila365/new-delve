import type { Profile } from '../../auth/AuthContext'

/** Profile has enough signal to soft-match eligibility rates. */
export function profileCanPersonalizeDeals(
  profile: Pick<Profile, 'country_code' | 'birth_year'> | null | undefined,
): boolean {
  if (!profile) return false
  if (profile.birth_year != null && Number.isFinite(Number(profile.birth_year))) return true
  return Boolean((profile.country_code || '').trim())
}

/**
 * URL `may_qualify`: `1` on, `0` forced off, absent → on when profile can personalize.
 */
export function resolveMayQualifyParam(
  raw: string | null,
  canPersonalize: boolean,
): boolean {
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return canPersonalize
}

export function dealsSeeAllPath(mayQualify: boolean): string {
  return mayQualify ? '/deals?may_qualify=1' : '/deals'
}
