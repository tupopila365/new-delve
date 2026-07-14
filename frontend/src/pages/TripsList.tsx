import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  Bookmark,
  CalendarDays,
  Map as MapIcon,
  Plus,
  Route,
  Search,
  Sparkles,
  Trees,
  UserRound,
  Waves,
} from 'lucide-react'
import type { MockTrip } from '../data/mockTrips'
import { apiFetch, asArray } from '../api/client'
import { mapApiJourneyToTrip, type ApiJourney } from '../utils/journeyApi'
import {
  isBudgetTrip,
  isWeekendTrip,
  journeyCoverSrc,
  JOURNEY_DEFAULT_IMAGE,
} from '../utils/journeyDisplay'
import { useAuth } from '../auth/AuthContext'
import { useJourneyEngagement } from '../hooks/useJourneyEngagement'
import { JourneyListingCard } from '../components/journeys/JourneyListingCard'
import { JourneySectionHead } from '../components/journeys/JourneySectionHead'
import { JourneyListDelversViewer } from '../components/journeys/JourneyDelversHighlights'
import { EmptyState, ListSkeleton } from '../components/ui'
import '../components/journeys/JourneysPageEnhancer.css'
const RECENT_STORY_COUNT = 5

const SOCIAL_MODES = [
  { id: '', label: 'For you', Icon: Sparkles },
  { id: 'weekend', label: 'Weekend', Icon: CalendarDays },
  { id: 'coast', label: 'Coast', Icon: Waves },
  { id: 'nature', label: 'Nature', Icon: Trees },
  { id: 'budget', label: 'Budget', Icon: BadgeDollarSign },
  { id: 'saved', label: 'Saved', Icon: Bookmark },
] as const

type SortMode = 'recent' | 'popular'

const BUDGET_BUCKETS = [
  { label: 'Under N$2k', min: 0, max: 2000 },
  { label: 'N$2–5k', min: 2000, max: 5000 },
  { label: 'N$5–12k', min: 5000, max: 12000 },
  { label: 'N$12k+', min: 12000, max: Infinity },
]

const TOP_DESTINATIONS = [
  'Etosha',
  'Swakopmund',
  'Sossusvlei',
  'Windhoek',
  'Walvis Bay',
  'Lüderitz',
] as const

function onJourneyImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null
  e.currentTarget.src = JOURNEY_DEFAULT_IMAGE
}

function resultsHint(count: number, filters: { quick: string; search: string; bucket: string | null }) {
  if (filters.search) {
    return `${count} journey${count === 1 ? '' : 's'} for "${filters.search}"`
  }
  if (filters.quick || filters.bucket) {
    return `${count} journey${count === 1 ? '' : 's'} match your filters`
  }
  return 'Explore travel stories and itineraries.'
}

export function TripsList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<(typeof BUDGET_BUCKETS)[number] | null>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('recent')

  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const feedQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (quickFilter === 'saved') params.set('saved', '1')
    else if (quickFilter) params.set('mode', quickFilter)
    if (selectedBucket) {
      params.set('min_cost', String(selectedBucket.min))
      if (Number.isFinite(selectedBucket.max)) params.set('max_cost', String(selectedBucket.max))
    }
    params.set('sort', sortMode)
    return params.toString()
  }, [search, quickFilter, selectedBucket, sortMode])

  const needsAuth = Boolean(profile) || quickFilter === 'saved'

  const {
    data: apiJourneys = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['journeys', 'feed', feedQuery, needsAuth],
    queryFn: async () =>
      asArray<ApiJourney>(
        await apiFetch<ApiJourney[]>(`/api/journeys/?${feedQuery}`, { auth: needsAuth }),
      ),
  })

  const allTrips = useMemo(() => apiJourneys.map(mapApiJourneyToTrip), [apiJourneys])
  const engagement = useJourneyEngagement(allTrips)
  // Backend already applied search/mode/budget/sort — keep engagement live on this payload.
  const filtered = allTrips

  const hasFilters = !!(quickFilter || selectedBucket || search)
  const showDiscoveryRails = !hasFilters && sortMode === 'recent' && !isLoading

  const recentStories = useMemo(() => filtered.slice(0, RECENT_STORY_COUNT), [filtered])

  const curated = useMemo(() => {
    if (filtered.length === 0) return null
    const used = new Set<number>()
    const remaining = () => filtered.filter((t) => !used.has(t.id))

    const weekendRail = remaining().filter((t) => isWeekendTrip(t)).slice(0, 6)
    weekendRail.forEach((t) => used.add(t.id))

    const budgetRail = remaining().filter((t) => isBudgetTrip(t)).slice(0, 6)

    return { weekendRail, budgetRail }
  }, [filtered])

  const activeCreators = useMemo(
    () =>
      [...new Map(allTrips.map((t) => [t.author.username, t.author])).values()].slice(0, 8),
    [allTrips],
  )

  const clearAll = () => {
    setQuickFilter('')
    setSelectedBucket(null)
    setSearchInput('')
    setSearch('')
    setSortMode('recent')
  }

  const hint = resultsHint(filtered.length, {
    quick: quickFilter,
    search,
    bucket: selectedBucket?.label ?? null,
  })

  return (
    <div className="jn-page jn-page--social ev-page">
      <header className="jn-social-top">
        <div className="jn-social-top__copy">
          <p className="jn-social-top__eyebrow">Journeys</p>
          <h1 className="jn-social-top__title">What people are travelling</h1>
          <p className="jn-social-top__sub">Real routes, costs, and tips from travellers on the road.</p>
        </div>
        <button
          type="button"
          className={`jn-social-top__find${findOpen || search || selectedBucket ? ' is-active' : ''}`}
          onClick={() => setFindOpen((v) => !v)}
          aria-expanded={findOpen}
        >
          <Search size={16} strokeWidth={2.35} aria-hidden />
          Find a route
        </button>
      </header>

      {findOpen ? (
        <section className="jn-find-sheet" aria-label="Find a route">
          <label className="jn-find-sheet__field">
            <span className="jn-find-sheet__label">Search</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Etosha, coast, weekend, food…"
              autoComplete="off"
            />
          </label>
          <div className="jn-find-sheet__budgets" role="group" aria-label="Budget range">
            {BUDGET_BUCKETS.map((b) => {
              const active = selectedBucket?.label === b.label
              return (
                <button
                  key={b.label}
                  type="button"
                  className={`jn-find-sheet__chip${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSelectedBucket(active ? null : b)}
                >
                  {b.label}
                </button>
              )
            })}
          </div>
          {TOP_DESTINATIONS.length > 0 ? (
            <div className="jn-find-sheet__dests" aria-label="Popular places">
              {TOP_DESTINATIONS.slice(0, 6).map((dest) => (
                <button
                  key={dest}
                  type="button"
                  className="jn-find-sheet__chip"
                  onClick={() => {
                    setSearchInput(dest)
                    setSearch(dest)
                  }}
                >
                  {dest}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="jn-modes" role="tablist" aria-label="Browse modes">
        {SOCIAL_MODES.map(({ id, label, Icon }) => {
          const active = quickFilter === id
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              className={`jn-modes__chip${active ? ' is-active' : ''}`}
              onClick={() => {
                if (id === 'saved' && !profile) {
                  navigate('/login')
                  return
                }
                setQuickFilter(active && id !== '' ? '' : id)
              }}
            >
              <Icon size={15} strokeWidth={2.25} aria-hidden />
              {label}
            </button>
          )
        })}
      </div>

      {hasFilters ? (
        <div className="jn-page__active-filters" aria-label="Active filters">
          <span className="jn-page__results-hint">{hint}</span>
          <button type="button" className="jn-page__clear-filters" onClick={clearAll}>
            Clear
          </button>
        </div>
      ) : null}

      {engagement.shareMsg ? (
        <p className="jn-page__toast" role="status">
          {engagement.shareMsg}
        </p>
      ) : null}

      {recentStories.length > 0 && (
        <section className="jn-page__story-rings" aria-labelledby="jn-rings-title">
          <div className="jn-rings-head">
            <h2 id="jn-rings-title" className="jn-rings-head__title">
              Fresh from the road
            </h2>
            <span className="jn-rings-head__sub">Tap a traveller to preview</span>
          </div>
          <div className="jn-rings-row">
            {recentStories.map((t, i) => (
              <button
                key={`jn-ring-${t.id}`}
                type="button"
                className="jn-ring"
                aria-label={`Open journey story: ${t.title}`}
                onClick={() => setActiveStoryIdx(i)}
              >
                <span className="jn-ring__avatar">
                  {journeyCoverSrc(t.cover_image) ? (
                    <img
                      src={journeyCoverSrc(t.cover_image)}
                      alt=""
                      onError={onJourneyImgError}
                    />
                  ) : (
                    <span className="jn-ring__placeholder" aria-hidden>
                      <Route size={18} strokeWidth={2.25} />
                    </span>
                  )}
                </span>
                <span className="jn-ring__label">{t.author.display_name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {activeCreators.length > 0 && !hasFilters ? (
        <section className="jn-creators" aria-labelledby="jn-creators-title">
          <div className="jn-rings-head">
            <h2 id="jn-creators-title" className="jn-rings-head__title">
              Travellers active lately
            </h2>
          </div>
          <div className="jn-creators__row">
            {activeCreators.map((author) => (
              <Link key={author.username} to={`/u/${author.username}`} className="jn-creators__item">
                {author.avatar ? (
                  <img src={author.avatar} alt="" loading="lazy" />
                ) : (
                  <span aria-hidden>
                    <UserRound size={18} strokeWidth={2.25} />
                  </span>
                )}
                <span>@{author.username}</span>
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
              iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
              title="Couldn’t load journeys"
              sub="Check your connection and try again."
              cta={{ label: 'Retry', onClick: () => void refetch() }}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              iconElement={<MapIcon size={28} strokeWidth={2} aria-hidden />}
              title={hasFilters ? 'Nothing in this mode' : 'No journeys shared yet'}
              sub={
                hasFilters
                  ? 'Try another vibe, clear filters, or search a place.'
                  : 'Travel stories, routes, and itineraries will appear here once travellers add them.'
              }
              cta={
                hasFilters
                  ? { label: 'Show everything', onClick: clearAll }
                  : profile
                    ? { label: 'Share your journey', to: '/journeys/new' }
                    : undefined
              }
            />
          ) : (
            <>
              {showDiscoveryRails && curated && curated.weekendRail.length > 0 && (
                <JourneyRail
                  id="jn-weekend"
                  title="Short escapes people loved"
                  sub="Long weekends and tight loops from the community."
                  trips={curated.weekendRail}
                  engagement={engagement}
                />
              )}

              {showDiscoveryRails && curated && curated.budgetRail.length > 0 && (
                <JourneyRail
                  id="jn-budget"
                  title="Trips that won’t wreck the wallet"
                  sub="Full cost breakdowns under N$5k."
                  trips={curated.budgetRail}
                  engagement={engagement}
                />
              )}

              <section className="jn-page__all" aria-labelledby="jn-all-title">
                <JourneySectionHead
                  id="jn-all-title"
                  title={hasFilters ? 'Matching journeys' : 'On the feed'}
                  subtitle={
                    hasFilters
                      ? hint
                      : 'Double-tap a cover to like · save the ones you’ll actually do.'
                  }
                  trailing={
                    <div className="jn-sort" role="group" aria-label="Sort journeys">
                      <button
                        type="button"
                        className={sortMode === 'recent' ? 'is-active' : ''}
                        onClick={() => setSortMode('recent')}
                      >
                        Recent
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
                  {filtered.map((t) => (
                    <JourneyListingCard
                      key={t.id}
                      trip={t}
                      liked={engagement.isLiked(t)}
                      saved={engagement.isSaved(t)}
                      likeCount={engagement.likeCount(t)}
                      saveCount={engagement.saveCount(t)}
                      likeBusy={engagement.isLikeBusy(t.id)}
                      saveBusy={engagement.isSaveBusy(t.id)}
                      onLike={(event) => engagement.toggleLike(t, event)}
                      onSave={(event) => engagement.toggleSave(t, event)}
                      onShare={(event) => void engagement.shareJourney(t, event)}
                    />
                  ))}
                </div>
              </section>

              <section className="jn-bottom-cta">
                <Link
                  to={profile ? '/journeys/new' : '/login'}
                  className="jn-bottom-cta__btn"
                >
                  <Plus size={18} strokeWidth={2.5} aria-hidden />
                  <span>Share your journey</span>
                </Link>
              </section>
            </>
          )}
      </main>

      <JourneyListDelversViewer
        trips={recentStories}
        activeIndex={activeStoryIdx}
        onActiveIndex={setActiveStoryIdx}
      />
    </div>
  )
}

function JourneyRail({
  id,
  title,
  sub,
  trips,
  engagement,
}: {
  id: string
  title: string
  sub: string
  trips: MockTrip[]
  engagement: ReturnType<typeof useJourneyEngagement>
}) {
  return (
    <section className="jn-page__rail" aria-labelledby={id}>
      <JourneySectionHead id={id} title={title} subtitle={sub} variant="rail" />
      <div className="jn-rail-scroll h-scroll">
        {trips.map((t) => (
          <JourneyListingCard
            key={`${id}-${t.id}`}
            trip={t}
            variant="rail"
            liked={engagement.isLiked(t)}
            saved={engagement.isSaved(t)}
            likeCount={engagement.likeCount(t)}
            saveCount={engagement.saveCount(t)}
            likeBusy={engagement.isLikeBusy(t.id)}
            saveBusy={engagement.isSaveBusy(t.id)}
            onLike={(event) => engagement.toggleLike(t, event)}
            onSave={(event) => engagement.toggleSave(t, event)}
            onShare={(event) => void engagement.shareJourney(t, event)}
          />
        ))}
      </div>
    </section>
  )
}
