/** Desktop top nav + mobile section strip share these links */
export type MainNavLink = { to: string; label: string; end?: boolean }

export const MAIN_NAV_SECTIONS: MainNavLink[] = [
  { to: '/accommodation', label: 'Stays' },
  { to: '/transport', label: 'Transport' },
  { to: '/events', label: 'Events' },
  { to: '/food', label: 'Food & drink' },
  { to: '/guides', label: 'Guides' },
  { to: '/delvers', label: 'Delvers' },
  { to: '/journeys', label: 'Journeys' },
  { to: '/community', label: 'Community' },
]
