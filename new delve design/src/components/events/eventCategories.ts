export const EVENT_CATEGORIES = [
  'Music',
  'Food',
  'Culture',
  'Nightlife',
  'Sports',
  'Outdoors',
  'Travel',
  'Community',
  'Networking',
  'Festivals',
  'Other',
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'popular', label: 'Popular' },
  { id: 'following', label: 'Following' },
] as const

export type QuickFilterId = (typeof QUICK_FILTERS)[number]['id']
