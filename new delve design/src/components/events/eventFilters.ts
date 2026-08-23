import type { EventDto } from '@delve/contracts'
import type { QuickFilterId } from './eventCategories'

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isToday(iso: string, now = new Date()) {
  const d = new Date(iso)
  return (
    d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
  )
}

function isThisWeekend(iso: string, now = new Date()) {
  const d = new Date(iso)
  const day = d.getDay()
  const todayStart = startOfDay(now).getTime()
  const eventStart = startOfDay(d).getTime()
  const diffDays = Math.round((eventStart - todayStart) / 86400000)
  if (diffDays < 0 || diffDays > 7) return false
  return day === 0 || day === 6
}

function matchesNearby(event: EventDto, nearbyCity: string | null) {
  if (!nearbyCity?.trim()) return true
  const q = nearbyCity.trim().toLowerCase()
  return (
    event.city?.toLowerCase().includes(q)
    || event.country?.toLowerCase().includes(q)
    || event.locationName?.toLowerCase().includes(q)
  )
}

export function applyDiscoverFilters(
  events: EventDto[],
  opts: {
    quickFilter: QuickFilterId
    category: string | null
    nearbyCity: string | null
    followingOnly?: boolean
  },
): EventDto[] {
  let rows = [...events]

  if (opts.category) {
    const cat = opts.category.toLowerCase()
    rows = rows.filter(e => (e.category || '').toLowerCase() === cat)
  }

  if (opts.quickFilter === 'today') {
    rows = rows.filter(e => isToday(e.startAt))
  } else if (opts.quickFilter === 'weekend') {
    rows = rows.filter(e => isThisWeekend(e.startAt))
  } else if (opts.quickFilter === 'nearby') {
    rows = rows.filter(e => matchesNearby(e, opts.nearbyCity))
  } else if (opts.quickFilter === 'popular') {
    rows.sort((a, b) => b.goingCount - a.goingCount || a.startAt.localeCompare(b.startAt))
  } else if (opts.quickFilter === 'following' && !opts.followingOnly) {
    // Without API following filter, we cannot know creator follow state client-side.
    rows = []
  }

  if (opts.quickFilter !== 'popular') {
    rows.sort((a, b) => a.startAt.localeCompare(b.startAt))
  }

  return rows
}

export function pickFeaturedEvent(events: EventDto[]): EventDto | null {
  if (!events.length) return null
  const upcoming = events.filter(
    e => e.status === 'PUBLISHED' && new Date(e.startAt).getTime() >= Date.now(),
  )
  const pool = upcoming.length ? upcoming : events
  return [...pool].sort((a, b) => b.goingCount - a.goingCount || a.startAt.localeCompare(b.startAt))[0] ?? null
}

export function formatEventDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return { date, time, combined: `${date} · ${time}` }
}

export function formatGoingLabel(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K Going`
  return `${count} Going`
}
