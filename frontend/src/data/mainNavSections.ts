/** Desktop top nav + mobile section strip share these links */
export type MainNavLink = { to: string; label: string; end?: boolean }

/** Top-level primary navigation — keep uncrowded */
export const PRIMARY_NAV_SECTIONS: MainNavLink[] = [
  { to: '/', label: 'Explore', end: true },
  { to: '/accommodation', label: 'Stays' },
  { to: '/journeys', label: 'Journeys' },
  { to: '/delvers', label: 'Delvers' },
  { to: '/community', label: 'Community' },
]

/** Secondary categories — discoverable via More menu, Home, and Search */
export const SECONDARY_NAV_SECTIONS: MainNavLink[] = [
  { to: '/partners', label: 'Travel partners' },
  { to: '/food', label: 'Food & drink' },
  { to: '/guides', label: 'Guides' },
  { to: '/transport', label: 'Transport' },
  { to: '/events', label: 'Events' },
  { to: '/shop', label: 'Shops' },
  { to: '/coin-toss', label: 'Coin toss' },
]

/** @deprecated Use PRIMARY_NAV_SECTIONS + SECONDARY_NAV_SECTIONS */
export const MAIN_NAV_SECTIONS: MainNavLink[] = [
  ...PRIMARY_NAV_SECTIONS,
  ...SECONDARY_NAV_SECTIONS,
]
