/** Traveler app nav labels ↔ URL paths */

export const NAV_PATHS: Record<string, string> = {
  Home: '/',
  Explore: '/explore',
  Search: '/search',
  Deals: '/deals',
  Transport: '/transport',
  Journeys: '/journeys',
  Delvers: '/delvers',
  Communities: '/communities',
  Services: '/services',
  Account: '/account',
  Profile: '/profile',
  Messages: '/messages',
  Saved: '/saved',
  Notifications: '/notifications',
  Bookings: '/bookings',
  Provider: '/provider',
  'Provider business': '/provider/business',
  About: '/about',
  Investors: '/investors',
  Contact: '/contact',
  'Become a provider': '/become-a-provider',
  'Verify email': '/verify-email',
  Onboarding: '/onboarding',
  'Account settings': '/account/settings',
  'Email change': '/account/email-change',
}

export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/** `/business/:slug` → slug, else null. */
export function parseBusinessSlug(pathname: string): string | null {
  const match = normalizePath(pathname).match(/^\/business\/([^/]+)$/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function businessPath(slug: string): string {
  return `/business/${encodeURIComponent(slug)}`
}

export function pathToNav(pathname: string): string {
  const path = normalizePath(pathname)
  if (parseBusinessSlug(path)) return 'Business'
  const match = Object.entries(NAV_PATHS).find(([, value]) => value === path)
  return match?.[0] ?? 'Home'
}

export function navToPath(nav: string): string {
  return NAV_PATHS[nav] ?? '/'
}
