/** Home country = profile identity (separate from Explore destination). */

export const HOME_COUNTRY_SKIP_PREFIX = 'delve_home_country_skipped:'

export function homeCountrySkipKey(username: string): string {
  return `${HOME_COUNTRY_SKIP_PREFIX}${username.trim().toLowerCase()}`
}

export function hasSkippedHomeCountry(username: string): boolean {
  try {
    return localStorage.getItem(homeCountrySkipKey(username)) === '1'
  } catch {
    return false
  }
}

export function markHomeCountrySkipped(username: string): void {
  try {
    localStorage.setItem(homeCountrySkipKey(username), '1')
  } catch {
    // ignore
  }
}

export function clearHomeCountrySkipped(username: string): void {
  try {
    localStorage.removeItem(homeCountrySkipKey(username))
  } catch {
    // ignore
  }
}

export function needsHomeCountryOnboarding(
  profile: { username: string; country_code?: string | null } | null | undefined,
): boolean {
  if (!profile?.username) return false
  if ((profile.country_code || '').trim()) return false
  return !hasSkippedHomeCountry(profile.username)
}
