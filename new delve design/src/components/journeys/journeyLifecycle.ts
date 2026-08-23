import type { JourneyVisibility } from '@delve/contracts'

export type JourneyLifecycleStatus = 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED'

export function deriveJourneyLifecycle(opts: {
  visibility: JourneyVisibility
  startDate?: string | null | undefined
  endDate?: string | null | undefined
}): JourneyLifecycleStatus {
  if (opts.visibility === 'DRAFT') return 'DRAFT'
  const now = Date.now()
  const start = opts.startDate ? new Date(opts.startDate).getTime() : null
  const end = opts.endDate ? new Date(opts.endDate).getTime() : null
  if (start != null && start > now) return 'UPCOMING'
  if (end != null && end < now) return 'COMPLETED'
  if (start != null && start <= now && (end == null || end >= now)) return 'ACTIVE'
  return 'UPCOMING'
}

export function lifecycleLabel(status: JourneyLifecycleStatus) {
  if (status === 'DRAFT') return 'Draft'
  if (status === 'UPCOMING') return 'Upcoming'
  if (status === 'ACTIVE') return 'Active'
  return 'Completed'
}

export function formatStopRoute(stops: string[], max = 4) {
  if (!stops.length) return ''
  if (stops.length <= max) return stops.join(' → ')
  return `${stops.slice(0, max).join(' → ')}…`
}

export type JourneyDiscoverFilter = 'forYou' | 'following' | 'trending' | 'nearby'

export const JOURNEY_DISCOVER_FILTERS: { id: JourneyDiscoverFilter; label: string }[] = [
  { id: 'forYou', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
  { id: 'nearby', label: 'Nearby' },
]

export type MyJourneyFilter = 'all' | 'draft' | 'upcoming' | 'active' | 'completed'

export const MY_JOURNEY_FILTERS: { id: MyJourneyFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
]

export function filterMyJourneys<T extends { visibility: JourneyVisibility; startDate?: string | null; endDate?: string | null }>(
  rows: T[],
  filter: MyJourneyFilter,
): T[] {
  if (filter === 'all') return rows
  return rows.filter(row => {
    const status = deriveJourneyLifecycle(row)
    if (filter === 'draft') return status === 'DRAFT'
    if (filter === 'upcoming') return status === 'UPCOMING'
    if (filter === 'active') return status === 'ACTIVE'
    if (filter === 'completed') return status === 'COMPLETED'
    return true
  })
}
