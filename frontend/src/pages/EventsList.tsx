import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  BadgeDollarSign,
  CalendarDays,
  CalendarRange,
  Landmark,
  Music,
  Plus,
  Ticket,
  Utensils,
} from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EventListingCard, EventStoriesRow } from '../components/events'
import { JourneySectionHead } from '../components/journeys/JourneySectionHead'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { QuickFilterChips, SearchPanel } from '../components/marketplace'
import { EmptyState, ListSkeleton, PageBottomCta } from '../components/ui'
import { useEventEngagement } from '../hooks/useEventEngagement'
import { CATEGORY_OPTIONS, categoryMeta, type EventListing } from '../utils/eventDisplay'

const SIDEBAR_CATEGORIES = [
  { label: 'Music', value: 'music' },
  { label: 'Sports', value: 'sports' },
  { label: 'Culture', value: 'culture' },
  { label: 'Food & drink', value: 'food' },
  { label: 'Business', value: 'business' },
] as const

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay'] as const

function whenFilterLabel(when: string): string {
  if (when === 'today') return 'Today'
  if (when === 'weekend') return 'This weekend'
  if (when === 'free') return 'Free'
  return when
}

function resultsHint(
  count: number,
  filters: { category: string; search: string; whenFilter: string },
): string {
  if (filters.search) {
    return `${count} result${count === 1 ? '' : 's'} for "${filters.search}"`
  }
  if (filters.category || filters.whenFilter) {
    return `${count} event${count === 1 ? '' : 's'} match your filters`
  }
  return `${count} event${count === 1 ? '' : 's'} happening soon`
}

export function EventsList() {
  const { profile } = useAuth()
  const [category, setCategory] = useState('')
  const [whenFilter, setWhenFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (category) p.set('category', category)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [category, search])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', qs],
    queryFn: () => apiFetch<EventListing[]>(`/api/events/${qs}`, { auth: false }),
  })

  const events = data ?? []
  const engagement = useEventEngagement(events)

  const displayEvents = useMemo(() => {
    let list = events
    const now = new Date()
    if (whenFilter === 'today') {
      list = list.filter((e) => {
        const d = new Date(e.starts_at)
        return !Number.isNaN(d.getTime()) && d.toDateString() === now.toDateString()
      })
    }
    if (whenFilter === 'weekend') {
      const day = now.getDay()
      const daysUntilSat = (6 - day + 7) % 7
      const sat = new Date(now)
      sat.setDate(now.getDate() + daysUntilSat)
      sat.setHours(0, 0, 0, 0)
      const sun = new Date(sat)
      sun.setDate(sat.getDate() + 1)
      const mon = new Date(sun)
      mon.setDate(sun.getDate() + 1)
      list = list.filter((e) => {
        const d = new Date(e.starts_at)
        return !Number.isNaN(d.getTime()) && d >= sat && d < mon
      })
    }
    if (whenFilter === 'free') list = list.filter((e) => e.is_free)
    return list
  }, [events, whenFilter])

  const hasFilters = !!(category || search || whenFilter)

  const clearAll = () => {
    setCategory('')
    setWhenFilter('')
    setSearchInput('')
    setSearch('')
  }

  const freeCount = useMemo(() => events.filter((e) => e.is_free).length, [events])

  const thisWeekCount = useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    return events.filter((e) => {
      const t = new Date(e.starts_at).getTime()
      return !Number.isNaN(t) && t >= now && t <= now + weekMs
    }).length
  }, [events])

  const storyEvents = useMemo(() => displayEvents.slice(0, 6), [displayEvents])

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'popular-categories',
        title: 'Popular event types',
        type: 'links',
        items: SIDEBAR_CATEGORIES.map(({ label, value }) => ({
          label,
          active: category === value,
          onClick: () => setCategory(category === value ? '' : value),
        })),
      },
      {
        id: 'events-pulse',
        title: 'Events pulse',
        type: 'stats',
        items: [
          { value: events.length ? events.length : '—', label: 'upcoming events' },
          { value: freeCount ? freeCount : '—', label: 'free events' },
          { value: thisWeekCount ? thisWeekCount : '—', label: 'this week' },
        ],
      },
      {
        id: 'top-areas',
        title: 'Top areas',
        type: 'links',
        items: TOP_AREAS.map((city) => ({
          label: city,
          onClick: () => {
            setSearchInput(city)
            setSearch(city)
          },
        })),
      },
    ]
  }, [category, events.length, freeCount, thisWeekCount])

  const handleQuickChip = (id: string) => {
    if (id === 'today' || id === 'weekend' || id === 'free') {
      setWhenFilter((v) => (v === id ? '' : id))
      return
    }
    setCategory((c) => (c === id ? '' : id))
  }

  return (
    <div className="ev-page ev-page--refined disc-page mk-page">
      <SearchPanel
        id="ev-search"
        label="Search events"
        placeholder="Search market, music, Windhoek, food, meetup…"
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
        className="ev-page__search-sync"
      />

      <QuickFilterChips
        className="ev-page__quick-chips"
        ariaLabel="Event quick filters"
        chips={[
          { id: 'today', label: 'Today', Icon: CalendarDays, active: whenFilter === 'today' },
          { id: 'weekend', label: 'This weekend', Icon: CalendarRange, active: whenFilter === 'weekend' },
          { id: 'free', label: 'Free', Icon: BadgeDollarSign, active: whenFilter === 'free' },
          { id: 'music', label: 'Music', Icon: Music, active: category === 'music' },
          { id: 'culture', label: 'Culture', Icon: Landmark, active: category === 'culture' },
          { id: 'food', label: 'Food', Icon: Utensils, active: category === 'food' },
        ]}
        onChipClick={handleQuickChip}
      />

      <div className="ev-page__category-sync" aria-hidden>
        {CATEGORY_OPTIONS.map(({ value, label }) => (
          <button key={value} type="button" onClick={() => setCategory(category === value ? '' : value)}>
            {label}
          </button>
        ))}
      </div>

      {!isLoading && !isError && storyEvents.length > 0 ? (
        <EventStoriesRow events={storyEvents} />
      ) : null}

      <div className="disc-page__layout ev-page__layout">
        <main className="disc-page__main ev-page__main">
          {profile ? (
            <div className="ev-page__create-row">
              <Link to="/events/new" className="btn btn-primary ev-page__create-btn">
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                Create event
              </Link>
            </div>
          ) : null}

          {hasFilters && (
            <div className="ev-page__filter-summary">
              <span className="ev-page__filter-summary-text">
                Filtered
                {category ? ` · ${categoryMeta(category).label}` : ''}
                {search ? ` · "${search}"` : ''}
                {whenFilter ? ` · ${whenFilterLabel(whenFilter)}` : ''}
              </span>
              <button type="button" className="ev-page__filter-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {isError && (
            <EmptyState
              iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
              title="We couldn't load events"
              sub="Please check your connection and try again."
              cta={{ label: 'Try again', onClick: () => void refetch() }}
            />
          )}

          {isLoading && !isError && <ListSkeleton count={3} />}

          {!isLoading && !isError && displayEvents.length > 0 && (
            <p className="ev-page__results-hint" role="status">
              {resultsHint(displayEvents.length, { category, search, whenFilter })}
            </p>
          )}

          {!isLoading && !isError && displayEvents.length === 0 ? (
            <EmptyState
              iconElement={
                hasFilters ? (
                  <Ticket size={28} strokeWidth={2} aria-hidden />
                ) : (
                  <CalendarDays size={28} strokeWidth={2} aria-hidden />
                )
              }
              title={hasFilters ? 'No events found' : 'No upcoming events yet'}
              sub={
                hasFilters
                  ? 'Try changing your city, category, date, or search term.'
                  : 'Markets, meetups, concerts, workshops, and local gatherings will appear here once organizers add them.'
              }
              action={
                hasFilters ? (
                  <button type="button" className="btn btn-primary ui-empty__cta" onClick={clearAll}>
                    Show all events
                  </button>
                ) : profile ? (
                  <Link to="/events/new" className="btn btn-primary ui-empty__cta">
                    Create event
                  </Link>
                ) : undefined
              }
            />
          ) : null}

          {!isLoading && !isError && displayEvents.length > 0 ? (
            <section className="ev-page__all" aria-labelledby="ev-all-title">
              <JourneySectionHead
                id="ev-all-title"
                title={hasFilters ? 'Matching events' : 'All events'}
                subtitle="Date, venue, price, category, and organizer details on every card."
                trailing={
                  <span className="journey-section-head__meta">
                    {displayEvents.length} {displayEvents.length === 1 ? 'event' : 'events'}
                  </span>
                }
              />
              <div className="ev-page__grid">
                {displayEvents.map((event) => (
                  <EventListingCard
                    key={event.id}
                    event={event}
                    liked={engagement.isLiked(event)}
                    saved={engagement.isSaved(event)}
                    likeCount={engagement.likeCount(event)}
                    onLike={(clickEvent) => engagement.toggleLike(event, clickEvent)}
                    onSave={(clickEvent) => engagement.toggleSave(event, clickEvent)}
                    onShare={(clickEvent) => engagement.shareEvent(event, clickEvent)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {!isLoading && !isError && displayEvents.length > 0 ? (
            <PageBottomCta
              title="Hosting something local?"
              description="Share your market, workshop, concert, or meetup so travellers can find it."
              action={{
                label: profile ? 'Create event' : 'Sign in to create',
                to: profile ? '/events/new' : '/login',
                icon: <Plus size={16} strokeWidth={2.5} aria-hidden />,
              }}
            />
          ) : null}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Events discovery" />
      </div>

      {engagement.shareMsg ? (
        <p className="ev-page__toast" role="status">
          {engagement.shareMsg}
        </p>
      ) : null}
    </div>
  )
}
