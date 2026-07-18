import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  CalendarDays,
  CalendarRange,
  Landmark,
  Music,
  Plus,
  Search,
  Sparkles,
  Ticket,
  UserRound,
  Utensils,
} from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EventListingCard } from '../components/events'
import { JourneySectionHead } from '../components/journeys/JourneySectionHead'
import { EmptyState, ListSkeleton } from '../components/ui'
import { useEventCategoryFollows } from '../hooks/useEventCategoryFollows'
import { useEventEngagement } from '../hooks/useEventEngagement'
import {
  CATEGORY_OPTIONS,
  categoryMeta,
  EVENT_DEFAULT_IMAGE,
  eventPreviewMedia,
  isUpcomingWeekendEvent,
  type EventListing,
} from '../utils/eventDisplay'
import '../components/journeys/JourneysPageEnhancer.css'
import '../components/events/EventsPageEnhancer.css'

const RECENT_RING_COUNT = 6

type SortMode = 'for_you' | 'soonest' | 'popular'

const WHEN_MODES = new Set(['today', 'weekend', 'free'])

const SOCIAL_MODES = [
  { id: '', label: 'For you', Icon: Sparkles },
  { id: 'today', label: 'Today', Icon: CalendarDays },
  { id: 'weekend', label: 'Weekend', Icon: CalendarRange },
  { id: 'free', label: 'Free', Icon: BadgeDollarSign },
  { id: 'music', label: 'Music', Icon: Music },
  { id: 'culture', label: 'Culture', Icon: Landmark },
  { id: 'food', label: 'Food', Icon: Utensils },
] as const

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay', 'Oshakati'] as const

function whenFilterLabel(when: string): string {
  if (when === 'today') return 'Today'
  if (when === 'weekend') return 'This weekend'
  if (when === 'free') return 'Free'
  return when
}

function resultsCopy(
  count: number,
  filters: { category: string; search: string; whenFilter: string },
): { countLabel: string; rest: string } {
  const noun = count === 1 ? 'event' : 'events'
  if (filters.search) {
    return { countLabel: String(count), rest: `${noun} for “${filters.search}”` }
  }
  if (filters.category || filters.whenFilter) {
    return { countLabel: String(count), rest: `${noun} match` }
  }
  return { countLabel: String(count), rest: noun }
}

function onPreviewImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null
  e.currentTarget.src = EVENT_DEFAULT_IMAGE
}

export function EventsList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const categoryFollows = useEventCategoryFollows()
  const [mode, setMode] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('for_you')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [findOpen, setFindOpen] = useState(false)

  const category = WHEN_MODES.has(mode) || !mode ? '' : mode
  const whenFilter = WHEN_MODES.has(mode) ? mode : ''
  const followingActiveCategory = Boolean(category && categoryFollows.isFollowing(category))

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (category) p.set('category', category)
    if (search) p.set('search', search)
    if (whenFilter) p.set('when', whenFilter)
    if (sortMode === 'soonest') p.set('ordering', 'starts_at')
    if (sortMode === 'popular') p.set('ordering', '-likes_count')
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [category, search, whenFilter, sortMode])

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['events', qs, profile?.username ?? ''],
    queryFn: () => apiFetch<EventListing[]>(`/api/events/${qs}`, { auth: Boolean(profile) }),
  })

  const events = data ?? []
  const engagement = useEventEngagement(events)
  const hasFilters = !!(category || search || whenFilter)
  const showDiscoveryRails = !hasFilters && sortMode === 'for_you' && !isLoading

  const clearAll = () => {
    setMode('')
    setSearchInput('')
    setSearch('')
    setSortMode('for_you')
  }

  const results = resultsCopy(events.length, { category, search, whenFilter })
  const filterChips = [
    whenFilter ? whenFilterLabel(whenFilter) : null,
    category ? categoryMeta(category).label : null,
  ].filter(Boolean) as string[]

  const recentRings = useMemo(() => events.slice(0, RECENT_RING_COUNT), [events])

  const activeOrganizers = useMemo(() => {
    const seen = new Set<string>()
    const list: { username: string; name: string }[] = []
    for (const event of events) {
      const username = event.organizer_username?.trim()
      if (!username || seen.has(username)) continue
      seen.add(username)
      list.push({
        username,
        name: event.organizer_display_name?.trim() || username,
      })
      if (list.length >= 8) break
    }
    return list
  }, [events])

  const curated = useMemo(() => {
    if (events.length === 0) return null
    const used = new Set<number>()
    const remaining = () => events.filter((e) => !used.has(e.id))

    const weekendRail = remaining().filter((e) => isUpcomingWeekendEvent(e.starts_at)).slice(0, 6)
    weekendRail.forEach((e) => used.add(e.id))

    const freeRail = remaining().filter((e) => e.is_free).slice(0, 6)

    return { weekendRail, freeRail }
  }, [events])

  return (
    <div className="jn-page jn-page--social ev-page">
      <header className="jn-social-top">
        <div className="jn-social-top__copy">
          <p className="jn-social-top__eyebrow">Events</p>
          <h1 className="jn-social-top__title">What’s on around you</h1>
        </div>
        <button
          type="button"
          className={`jn-social-top__find${findOpen || search ? ' is-active' : ''}`}
          onClick={() => setFindOpen((v) => !v)}
          aria-expanded={findOpen}
        >
          <Search size={16} strokeWidth={2.35} aria-hidden />
          Find an event
        </button>
      </header>

      {findOpen ? (
        <section className="jn-find-sheet" aria-label="Find an event">
          <label className="jn-find-sheet__field">
            <span className="jn-find-sheet__label">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Market, music, Windhoek, meetup…"
              autoComplete="off"
            />
          </label>
          <div className="jn-find-sheet__dests" aria-label="Popular areas">
            {TOP_AREAS.map((city) => (
              <button
                key={city}
                type="button"
                className={`jn-find-sheet__chip${search === city ? ' is-active' : ''}`}
                onClick={() => {
                  setSearchInput(city)
                  setSearch(city)
                }}
              >
                {city}
              </button>
            ))}
          </div>
          <div className="jn-find-sheet__budgets" role="group" aria-label="Event interests">
            <span className="jn-find-sheet__label">Interests you follow</span>
            {CATEGORY_OPTIONS.filter((c) => c.value !== 'other').map(({ value, label }) => {
              const on = categoryFollows.isFollowing(value)
              return (
                <button
                  key={value}
                  type="button"
                  className={`jn-find-sheet__chip${on ? ' is-active' : ''}`}
                  aria-pressed={on}
                  disabled={categoryFollows.busyCategory === value}
                  onClick={() => categoryFollows.toggleFollow(value)}
                >
                  {on ? `Following ${label}` : `Follow ${label}`}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <div className="jn-modes" role="tablist" aria-label="Browse modes">
        {SOCIAL_MODES.map(({ id, label, Icon }) => {
          const active = mode === id
          const subscribed = Boolean(id && !WHEN_MODES.has(id) && categoryFollows.isFollowing(id))
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              className={`jn-modes__chip${active ? ' is-active' : ''}${subscribed ? ' jn-modes__chip--followed' : ''}`}
              onClick={() => setMode(active && id !== '' ? '' : id)}
            >
              <Icon size={15} strokeWidth={2.25} aria-hidden />
              {label}
            </button>
          )
        })}
      </div>

      {category ? (
        <div className="ev-page__interest-bar">
          <p>
            {followingActiveCategory
              ? `${categoryMeta(category).label} events show up first on For you.`
              : `Follow ${categoryMeta(category).label} to prioritize these on For you.`}
          </p>
          <button
            type="button"
            className={`ev-page__interest-btn${followingActiveCategory ? ' is-active' : ''}`}
            disabled={categoryFollows.busyCategory === category}
            onClick={() => categoryFollows.toggleFollow(category)}
          >
            {followingActiveCategory ? 'Following' : 'Follow'}
          </button>
        </div>
      ) : null}

      {hasFilters ? (
        <div className="jn-page__active-filters" aria-label="Active filters">
          <div className="jn-page__results-copy">
            <p className="jn-page__results-hint">
              <strong>{results.countLabel}</strong>
              <span>{results.rest}</span>
            </p>
            {filterChips.length > 0 ? (
              <div className="jn-page__results-chips">
                {filterChips.map((chip) => (
                  <span key={chip} className="jn-page__results-chip">
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" className="jn-page__clear-filters" onClick={clearAll}>
            Clear
          </button>
        </div>
      ) : null}

      {engagement.shareMsg ? (
        <p className="ev-page__toast" role="status">
          {engagement.shareMsg}
        </p>
      ) : null}

      {recentRings.length > 0 ? (
        <section className="jn-page__story-rings" aria-labelledby="ev-rings-title">
          <div className="jn-rings-head">
            <h2 id="ev-rings-title" className="jn-rings-head__title">
              Happening soon
            </h2>
          </div>
          <div className="jn-rings-row">
            {recentRings.map((event) => {
              const preview = eventPreviewMedia(event)
              const name =
                event.organizer_display_name?.trim()?.split(' ')[0] ||
                event.organizer_username ||
                'Event'
              return (
                <Link
                  key={`ev-ring-${event.id}`}
                  to={`/events/${event.id}`}
                  className="jn-ring"
                  aria-label={`Open event: ${event.title}`}
                >
                  <span className="jn-ring__avatar">
                    {preview.kind === 'image' ? (
                      <img src={preview.src} alt="" onError={onPreviewImgError} />
                    ) : (
                      <span className="jn-ring__placeholder" aria-hidden>
                        <Ticket size={18} strokeWidth={2.25} />
                      </span>
                    )}
                  </span>
                  <span className="jn-ring__label">{name}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      {activeOrganizers.length > 0 && !hasFilters ? (
        <section className="jn-creators" aria-labelledby="ev-creators-title">
          <div className="jn-rings-head">
            <h2 id="ev-creators-title" className="jn-rings-head__title">
              Organizers posting lately
            </h2>
          </div>
          <div className="jn-creators__row">
            {activeOrganizers.map((org) => (
              <Link key={org.username} to={`/u/${org.username}`} className="jn-creators__item">
                <span aria-hidden>
                  <UserRound size={18} strokeWidth={2.25} />
                </span>
                <span>@{org.username}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <main className={`jn-page__main${isFetching && !isLoading ? ' jn-page__main--refreshing' : ''}`}>
        {isLoading ? (
          <ListSkeleton count={4} />
        ) : isError ? (
          <EmptyState
            iconElement={<Ticket size={28} strokeWidth={2} aria-hidden />}
            title="Couldn’t load events"
            sub="Check your connection and try again."
            cta={{ label: 'Retry', onClick: () => void refetch() }}
          />
        ) : events.length === 0 ? (
          <EmptyState
            iconElement={<CalendarDays size={28} strokeWidth={2} aria-hidden />}
            title={hasFilters ? 'Nothing in this mode' : 'No upcoming events yet'}
            sub={
              hasFilters
                ? 'Try another vibe, clear filters, or search a place.'
                : 'Markets, meetups, concerts, and local gatherings will appear here once organizers share them.'
            }
            cta={
              hasFilters
                ? { label: 'Show everything', onClick: clearAll }
                : profile
                  ? { label: 'Create an event', to: '/events/new' }
                  : { label: 'Sign in to create', to: '/login' }
            }
          />
        ) : (
          <>
            {showDiscoveryRails && curated && curated.weekendRail.length > 0 ? (
              <EventRail
                id="ev-weekend"
                title="This weekend’s picks"
                sub="Short notice plans the community is saving."
                events={curated.weekendRail}
                engagement={engagement}
              />
            ) : null}

            {showDiscoveryRails && curated && curated.freeRail.length > 0 ? (
              <EventRail
                id="ev-free"
                title="Free & low-key"
                events={curated.freeRail}
                engagement={engagement}
              />
            ) : null}

            <section className="jn-page__all" aria-labelledby="ev-all-title">
              <JourneySectionHead
                id="ev-all-title"
                title={hasFilters ? 'Matching events' : 'On the feed'}
                subtitle={
                  hasFilters
                    ? `${results.countLabel} ${results.rest}${filterChips.length ? ` · ${filterChips.join(' · ')}` : ''}`
                    : undefined
                }
                trailing={
                  <div className="jn-sort" role="group" aria-label="Sort events">
                    <button
                      type="button"
                      className={sortMode === 'for_you' ? 'is-active' : ''}
                      onClick={() => setSortMode('for_you')}
                    >
                      For you
                    </button>
                    <button
                      type="button"
                      className={sortMode === 'soonest' ? 'is-active' : ''}
                      onClick={() => setSortMode('soonest')}
                    >
                      Soonest
                    </button>
                    <button
                      type="button"
                      className={sortMode === 'popular' ? 'is-active' : ''}
                      onClick={() => setSortMode('popular')}
                    >
                      Popular
                    </button>
                  </div>
                }
              />
              <div className="jn-page__feed">
                {events.map((event) => (
                  <EventListingCard
                    key={event.id}
                    event={event}
                    liked={engagement.isLiked(event)}
                    saved={engagement.isSaved(event)}
                    likeCount={engagement.likeCount(event)}
                    saveCount={engagement.saveCount(event)}
                    likeBusy={engagement.isLikeBusy(event.id)}
                    saveBusy={engagement.isSaveBusy(event.id)}
                    onLike={(clickEvent) => {
                      if (engagement.requiresAuth) {
                        navigate('/login')
                        return
                      }
                      engagement.toggleLike(event, clickEvent)
                    }}
                    onSave={(clickEvent) => {
                      if (engagement.requiresAuth) {
                        navigate('/login')
                        return
                      }
                      engagement.toggleSave(event, clickEvent)
                    }}
                    onShare={(clickEvent) => void engagement.shareEvent(event, clickEvent)}
                  />
                ))}
              </div>
            </section>

            <section className="jn-bottom-cta">
              <Link to={profile ? '/events/new' : '/login'} className="jn-bottom-cta__btn">
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                <span>{profile ? 'Share an event' : 'Sign in to host'}</span>
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function EventRail({
  id,
  title,
  sub,
  events,
  engagement,
}: {
  id: string
  title: string
  sub?: string
  events: EventListing[]
  engagement: ReturnType<typeof useEventEngagement>
}) {
  const navigate = useNavigate()
  return (
    <section className="jn-page__rail" aria-labelledby={id}>
      <JourneySectionHead id={id} title={title} subtitle={sub} variant="rail" />
      <div className="jn-rail-scroll h-scroll">
        {events.map((event) => (
          <EventListingCard
            key={`${id}-${event.id}`}
            event={event}
            variant="rail"
            liked={engagement.isLiked(event)}
            saved={engagement.isSaved(event)}
            likeCount={engagement.likeCount(event)}
            saveCount={engagement.saveCount(event)}
            likeBusy={engagement.isLikeBusy(event.id)}
            saveBusy={engagement.isSaveBusy(event.id)}
            onLike={(clickEvent) => {
              if (engagement.requiresAuth) {
                navigate('/login')
                return
              }
              engagement.toggleLike(event, clickEvent)
            }}
            onSave={(clickEvent) => {
              if (engagement.requiresAuth) {
                navigate('/login')
                return
              }
              engagement.toggleSave(event, clickEvent)
            }}
            onShare={(clickEvent) => void engagement.shareEvent(event, clickEvent)}
          />
        ))}
      </div>
    </section>
  )
}
