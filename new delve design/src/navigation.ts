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
  About: '/about',
  Investors: '/investors',
  Contact: '/contact',
  'Become a provider': '/become-a-provider',
}

export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function pathToNav(pathname: string): string {
  const path = normalizePath(pathname)
  const match = Object.entries(NAV_PATHS).find(([, value]) => value === path)
  return match?.[0] ?? 'Home'
}

export function navToPath(nav: string): string {
  return NAV_PATHS[nav] ?? '/'
}
