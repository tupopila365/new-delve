import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Calendar, LogIn, Plus, Search, X,
} from 'lucide-react'
import type { EventDto } from '@delve/contracts'
import { fetchEvents, searchEvents } from '../api/socialClient'
import { fetchOnboarding } from '../api/authClient'
import EventCard from '../components/events/EventCard'
import FeaturedEvent from '../components/events/FeaturedEvent'
import EventsPageSkeleton from '../components/events/EventsPageSkeleton'
import { EVENT_CATEGORIES, QUICK_FILTERS, type QuickFilterId } from '../components/events/eventCategories'
import { applyDiscoverFilters, pickFeaturedEvent } from '../components/events/eventFilters'

type Tab = 'discover' | 'hosting' | 'attending'

interface EventsPageProps {
  signedIn?: boolean
  onSignIn?: () => void
  onOpenEvent: (id: string) => void
  onCreateEvent?: () => void
  onOpenProfile?: (username: string) => void
  initialTab?: Tab
  refreshKey?: number
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export default function EventsPage({
  signedIn = false,
  onSignIn,
  onOpenEvent,
  onCreateEvent,
  onOpenProfile,
  initialTab = 'discover',
  refreshKey = 0,
}: EventsPageProps) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 320)
  const [quickFilter, setQuickFilter] = useState<QuickFilterId>('all')
  const [category, setCategory] = useState<string | null>(null)
  const [nearbyCity, setNearbyCity] = useState<string | null>(null)
  const [events, setEvents] = useState<EventDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState(false)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!signedIn) {
      setNearbyCity(null)
      return
    }
    let cancelled = false
    void fetchOnboarding()
      .then(profile => {
        if (!cancelled) setNearbyCity(profile.homeCity?.trim() || null)
      })
      .catch(() => {
        if (!cancelled) setNearbyCity(null)
      })
    return () => {
      cancelled = true
    }
  }, [signedIn, refreshKey])

  const load = useCallback(async () => {
    if ((tab === 'hosting' || tab === 'attending') && !signedIn) {
      setEvents([])
      setLoading(false)
      setSearchMode(false)
      return
    }
    if (tab === 'discover' && quickFilter === 'following' && !signedIn) {
      setEvents([])
      setLoading(false)
      setSearchMode(false)
      return
    }

    const useSearch = tab === 'discover' && debouncedSearch.length >= 2 && quickFilter !== 'following'
    setLoading(true)
    setError(null)
    setSearchMode(useSearch)

    try {
      let rows: EventDto[]
      if (useSearch) {
        rows = await searchEvents(debouncedSearch)
      } else if (tab === 'discover') {
        rows = await fetchEvents({
          category: category || undefined,
          following: quickFilter === 'following' ? true : undefined,
          sort: quickFilter === 'popular' ? 'popular' : undefined,
        })
      } else {
        rows = await fetchEvents({ mine: tab === 'hosting' ? 'hosting' : 'attending' })
      }
      setEvents(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [tab, debouncedSearch, quickFilter, category, signedIn])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const patchEvent = useCallback((updated: EventDto) => {
    setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)))
  }, [])

  const discoverFiltered = useMemo(() => {
    if (tab !== 'discover') return events
    return applyDiscoverFilters(events, {
      quickFilter,
      category,
      nearbyCity,
      followingOnly: quickFilter === 'following',
    })
  }, [events, tab, quickFilter, category, nearbyCity])

  const featured = useMemo(() => {
    if (tab !== 'discover' || loading || searchMode || debouncedSearch.length >= 2) return null
    if (discoverFiltered.length < 2) return null
    return pickFeaturedEvent(discoverFiltered)
  }, [tab, loading, searchMode, debouncedSearch, discoverFiltered])

  const listEvents = useMemo(() => {
    if (tab !== 'discover') return events
    return discoverFiltered
  }, [tab, events, discoverFiltered])

  const emptyCopy = useMemo(() => {
    if (tab === 'hosting') return 'You have not created any events yet.'
    if (tab === 'attending') return 'Events you RSVP to will show up here.'
    if (quickFilter === 'following' && !signedIn) return 'Sign in to see events from people you follow.'
    if (debouncedSearch.length >= 2) return `No events match "${debouncedSearch}".`
    if (category) return `No upcoming ${category.toLowerCase()} events yet.`
    if (quickFilter === 'today') return 'Nothing scheduled for today.'
    if (quickFilter === 'weekend') return 'Nothing on this weekend yet.'
    if (quickFilter === 'nearby') {
      return nearbyCity
        ? `No upcoming events near ${nearbyCity}.`
        : 'Add your home city in profile settings for nearby suggestions.'
    }
    if (quickFilter === 'following') return 'No upcoming events from people you follow.'
    return 'No upcoming events yet.'
  }, [tab, quickFilter, signedIn, debouncedSearch, category, nearbyCity])

  const chipStyle = (active: boolean) => ({
    border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'rgba(140,82,255,0.12)' : 'var(--surface)',
    color: active ? 'var(--primary)' : 'var(--fg)',
    cursor: 'pointer' as const,
  })

  return (
    <div className="pb-4">
      <div
        className="px-3 sm:px-0 py-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
              Events
            </h1>
            {tab === 'discover' && (
              <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                Discover what&apos;s happening around you
              </p>
            )}
          </div>
          {signedIn && onCreateEvent && (
            <button
              type="button"
              onClick={onCreateEvent}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white flex-shrink-0 min-h-[44px]"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={16} /> Create
            </button>
          )}
        </div>
      </div>

      <div
        className="px-3 sm:px-0 py-2 flex gap-2 overflow-x-auto scrollbar-none"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {([
          { key: 'discover' as const, label: 'Discover' },
          { key: 'hosting' as const, label: 'My events' },
          { key: 'attending' as const, label: 'My plans' },
        ]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap min-h-[44px]"
            style={{
              border: `1px solid ${tab === t.key ? 'var(--primary)' : 'var(--border)'}`,
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <>
          <div className="px-3 sm:px-0 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--fg-muted)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events, cities, venues…"
                className="w-full pl-9 pr-9 rounded-xl text-sm min-h-[44px]"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                  style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="px-3 sm:px-0 py-2 flex gap-2 overflow-x-auto scrollbar-none">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  if (f.id === 'following' && !signedIn) {
                    onSignIn?.()
                    return
                  }
                  setQuickFilter(f.id)
                }}
                className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
                style={chipStyle(quickFilter === f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="px-3 sm:px-0 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setCategory(null)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
              style={chipStyle(!category)}
            >
              All categories
            </button>
            {EVENT_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(prev => (prev === cat ? null : cat))}
                className="rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap min-h-[36px]"
                style={chipStyle(category === cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </>
      )}

      {(tab === 'hosting' || tab === 'attending') && !signedIn && (
        <div className="px-6 py-14 text-center">
          <p className="text-sm font-semibold m-0 mb-2" style={{ color: 'var(--fg)' }}>
            Sign in to see your events
          </p>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white min-h-[44px]"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <LogIn size={16} /> Sign in
            </button>
          )}
        </div>
      )}

      {loading && <EventsPageSkeleton />}

      {error && !loading && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm m-0 mb-3" style={{ color: 'var(--auth-danger)' }} role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold min-h-[44px]"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (tab === 'discover' || signedIn) && listEvents.length === 0 && !featured && (
        <div className="px-6 py-14 text-center">
          <Calendar size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 10px' }} />
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>{emptyCopy}</p>
          {tab === 'hosting' && signedIn && onCreateEvent && (
            <button
              type="button"
              onClick={onCreateEvent}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white min-h-[44px]"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={16} /> Create event
            </button>
          )}
        </div>
      )}

      {!loading && !error && (tab === 'discover' || signedIn) && (listEvents.length > 0 || featured) && (
        <div className="flex flex-col gap-3 p-3 sm:p-0 sm:pt-4">
          {tab === 'discover' && featured && (
            <FeaturedEvent
              event={featured}
              signedIn={signedIn}
              onSignIn={onSignIn}
              onOpen={onOpenEvent}
              onEventUpdated={patchEvent}
            />
          )}
          {listEvents.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              signedIn={signedIn}
              onSignIn={onSignIn}
              onOpen={onOpenEvent}
              onOpenProfile={onOpenProfile}
              onEventUpdated={patchEvent}
              compact={tab !== 'discover'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
