export type AdminNavItem = {
  to: string
  label: string
  end?: boolean
}

export type AdminNavGroup = {
  id: string
  label: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', end: true },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [{ to: '/travelers', label: 'Travelers' }],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    items: [
      { to: '/businesses', label: 'Businesses' },
      { to: '/listings', label: 'Listings' },
      { to: '/deals', label: 'Deals' },
      { to: '/bookings', label: 'Bookings' },
    ],
  },
  {
    id: 'trust',
    label: 'Trust & Safety',
    items: [
      { to: '/moderation', label: 'Moderation', end: true },
      { to: '/moderation/reports', label: 'Reports' },
      { to: '/moderation/posts', label: 'Content' },
      { to: '/moderation/comments', label: 'Comments' },
      { to: '/moderation/communities', label: 'Communities' },
      { to: '/moderation/events', label: 'Events' },
      { to: '/moderation/journeys', label: 'Journeys' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { to: '/payments', label: 'Overview', end: true },
      { to: '/payments/settlements', label: 'Settlements' },
      { to: '/payments/refunds', label: 'Refunds' },
      { to: '/payments/disputes', label: 'Disputes' },
      { to: '/payments/reconciliation', label: 'Reconciliation' },
      { to: '/payments/reports', label: 'Reports' },
    ],
  },
]

export const PAGE_META: Record<string, { title: string; crumbs: string[] }> = {
  '/dashboard': { title: 'Dashboard', crumbs: ['Overview', 'Dashboard'] },
  '/travelers': { title: 'Travelers', crumbs: ['People', 'Travelers'] },
  '/businesses': { title: 'Businesses', crumbs: ['Marketplace', 'Businesses'] },
  '/listings': { title: 'Listings', crumbs: ['Marketplace', 'Listings'] },
  '/deals': { title: 'Deals', crumbs: ['Marketplace', 'Deals'] },
  '/bookings': { title: 'Bookings', crumbs: ['Marketplace', 'Bookings'] },
  '/payments': { title: 'Payments', crumbs: ['Finance', 'Payments', 'Overview'] },
  '/payments/settlements': { title: 'Settlements', crumbs: ['Finance', 'Payments', 'Settlements'] },
  '/payments/refunds': { title: 'Refunds', crumbs: ['Finance', 'Payments', 'Refunds'] },
  '/payments/disputes': { title: 'Disputes', crumbs: ['Finance', 'Payments', 'Disputes'] },
  '/payments/reconciliation': { title: 'Reconciliation', crumbs: ['Finance', 'Payments', 'Reconciliation'] },
  '/payments/reports': { title: 'Reports', crumbs: ['Finance', 'Payments', 'Reports'] },
  '/moderation': { title: 'Trust & Safety', crumbs: ['Trust & Safety', 'Moderation'] },
  '/moderation/reports': { title: 'Reports', crumbs: ['Trust & Safety', 'Reports'] },
  '/moderation/posts': { title: 'Posts', crumbs: ['Trust & Safety', 'Content'] },
  '/moderation/comments': { title: 'Comments', crumbs: ['Trust & Safety', 'Comments'] },
  '/moderation/communities': { title: 'Communities', crumbs: ['Trust & Safety', 'Communities'] },
  '/moderation/events': { title: 'Events', crumbs: ['Trust & Safety', 'Events'] },
  '/moderation/journeys': { title: 'Journeys', crumbs: ['Trust & Safety', 'Journeys'] },
}

export function resolvePageMeta(pathname: string) {
  if (PAGE_META[pathname]) return PAGE_META[pathname]
  if (pathname.startsWith('/travelers/')) return { title: 'Traveler', crumbs: ['People', 'Travelers', 'Detail'] }
  if (pathname.startsWith('/businesses/')) return { title: 'Business', crumbs: ['Marketplace', 'Businesses', 'Detail'] }
  if (pathname.startsWith('/listings/')) return { title: 'Listing', crumbs: ['Marketplace', 'Listings', 'Detail'] }
  if (pathname.startsWith('/bookings/')) return { title: 'Booking', crumbs: ['Marketplace', 'Bookings', 'Detail'] }
  if (pathname.startsWith('/moderation/reports/')) return { title: 'Moderation review', crumbs: ['Trust & Safety', 'Reports', 'Review'] }
  return { title: 'Delve Admin', crumbs: ['Delve Admin'] }
}
