import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  BadgeDollarSign,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Landmark,
  Map,
  MapPin,
  Mountain,
  Plus,
  Route,
  Share2,
  Trees,
  UserRound,
  Users,
  Utensils,
  Waves,
  X,
  type LucideProps,
} from 'lucide-react'
import { mockTrips, type MockTrip } from '../data/mockTrips'
import { loadUserTrips } from '../data/userTrips'
import { apiFetch } from '../api/client'
import { mergeJourneyFeeds, type ApiJourney } from '../utils/journeyApi'
import {
  isBudgetTrip,
  isWeekendTrip,
  journeyCoverSrc,
  JOURNEY_DEFAULT_IMAGE,
  countryLabel,
  dayLabel,
} from '../utils/journeyDisplay'
import { useAuth } from '../auth/AuthContext'
import { useJourneyEngagement } from '../hooks/useJourneyEngagement'
import { JourneyListingCard } from '../components/journeys/JourneyListingCard'
import { JourneySectionHead } from '../components/journeys/JourneySectionHead'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { QuickFilterChips, SearchPanel } from '../components/marketplace'
import { EmptyState } from '../components/ui'
const RECENT_STORY_COUNT = 5

type FilterIcon = ComponentType<LucideProps>

type QuickFilter = {
  id: string
  label: string
  Icon: FilterIcon
  match: (trip: MockTrip) => boolean
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'weekend',
    label: 'Weekend trips',
    Icon: CalendarDays,
    match: (t) => isWeekendTrip(t),
  },
  {
    id: 'nature',
    label: 'Nature',
    Icon: Trees,
    match: (t) => t.tags.some((tag) => ['wildlife', 'hiking', 'dunes', 'etosha'].includes(tag)),
  },
  {
    id: 'culture',
    label: 'Culture',
    Icon: Landmark,
    match: (t) =>
      t.tags.includes('first-timer') ||
      t.stops.some((s) => /village|market|town/i.test(s.place_name) || /village|market|culture/i.test(s.notes)),
  },
  {
    id: 'food',
    label: 'Food',
    Icon: Utensils,
    match: (t) => t.tags.includes('food'),
  },
  {
    id: 'coast',
    label: 'Coast',
    Icon: Waves,
    match: (t) => t.tags.includes('coast') || t.tags.includes('kayaking'),
  },
  {
    id: 'adventure',
    label: 'Adventure',
    Icon: Mountain,
    match: (t) =>
      t.tags.some((tag) => ['4x4', 'hiking', 'kayaking', 'cross-border', 'dunes'].includes(tag)),
  },
  {
    id: 'family',
    label: 'Family friendly',
    Icon: Users,
    match: (t) => t.party === 'family' || t.tags.includes('family'),
  },
  {
    id: 'budget',
    label: 'Budget friendly',
    Icon: BadgeDollarSign,
    match: (t) => isBudgetTrip(t),
  },
]

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
  const { data: apiJourneys = [] } = useQuery({
    queryKey: ['journeys'],
    queryFn: () => apiFetch<ApiJourney[]>('/api/journeys/', { auth: false }),
  })

  const allTrips = useMemo(() => {
    const local = loadUserTrips()
    return mergeJourneyFeeds(apiJourneys, [...local, ...mockTrips])
  }, [apiJourneys])
  const engagement = useJourneyEngagement(allTrips)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<(typeof BUDGET_BUCKETS)[number] | null>(null)

  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null)
  const [storyShareMsg, setStoryShareMsg] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filtered = useMemo(() => {
    const quick = QUICK_FILTERS.find((f) => f.id === quickFilter)
    return allTrips.filter((t) => {
      if (quick && !quick.match(t)) return false
      if (selectedBucket) {
        if (t.total_cost < selectedBucket.min || t.total_cost >= selectedBucket.max) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const hay = [
          t.title,
          t.summary,
          t.author.display_name,
          t.author.username,
          ...t.stops.map((s) => s.place_name),
          ...t.stops.map((s) => s.region ?? ''),
          ...t.countries.map(countryLabel),
          ...t.tags,
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [allTrips, search, quickFilter, selectedBucket])

  const hasFilters = !!(quickFilter || selectedBucket || search)
  const showDiscoveryRails = !hasFilters

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

  const mostSaved = useMemo(
    () => [...allTrips].sort((a, b) => b.saves_count - a.saves_count)[0]?.saves_count ?? 0,
    [allTrips],
  )

  const newThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return allTrips.filter((t) => new Date(t.starts_on).getTime() >= weekAgo).length
  }, [allTrips])

  const activeCreators = useMemo(() => new Set(allTrips.map((t) => t.author.username)).size, [allTrips])

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'popular-styles',
        title: 'Popular journey styles',
        type: 'links',
        items: QUICK_FILTERS.map(({ id, label }) => ({
          label,
          active: quickFilter === id,
          onClick: () => setQuickFilter(quickFilter === id ? '' : id),
        })),
      },
      {
        id: 'journey-pulse',
        title: 'Journey pulse',
        type: 'stats',
        items: [
          { value: allTrips.length, label: 'journeys shared' },
          { value: newThisWeek || '—', label: 'new this week' },
          { value: mostSaved || '—', label: 'most saved' },
          { value: activeCreators, label: 'active creators' },
        ],
      },
      {
        id: 'top-destinations',
        title: 'Top destinations',
        type: 'links',
        items: TOP_DESTINATIONS.map((dest) => ({
          label: dest,
          onClick: () => {
            setSearchInput(dest)
            setSearch(dest)
          },
        })),
      },
    ]
  }, [allTrips.length, activeCreators, mostSaved, newThisWeek, quickFilter])

  useEffect(() => {
    if (activeStoryIdx == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveStoryIdx(null)
      if (e.key === 'ArrowRight')
        setActiveStoryIdx((i) => (i == null ? 0 : (i + 1) % recentStories.length))
      if (e.key === 'ArrowLeft')
        setActiveStoryIdx((i) => (i == null ? 0 : (i - 1 + recentStories.length) % recentStories.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeStoryIdx, recentStories.length])

  useEffect(() => {
    if (activeStoryIdx == null || recentStories.length === 0) return
    const t = window.setTimeout(() => {
      setActiveStoryIdx((i) => {
        if (i == null) return null
        return i >= recentStories.length - 1 ? null : i + 1
      })
    }, 12000)
    return () => window.clearTimeout(t)
  }, [activeStoryIdx, recentStories.length])

  useEffect(() => {
    if (!storyShareMsg) return
    const t = window.setTimeout(() => setStoryShareMsg(''), 1600)
    return () => window.clearTimeout(t)
  }, [storyShareMsg])

  const onShareStory = async (tripId: number) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/journeys/${tripId}`)
      setStoryShareMsg('Link copied')
    } catch {
      setStoryShareMsg('Copy failed')
    }
  }

  const clearAll = () => {
    setQuickFilter('')
    setSelectedBucket(null)
    setSearchInput('')
    setSearch('')
  }

  const handleQuickChip = (id: string) => {
    setQuickFilter((v) => (v === id ? '' : id))
  }

  const hint = resultsHint(filtered.length, {
    quick: quickFilter,
    search,
    bucket: selectedBucket?.label ?? null,
  })

  const quickChips = QUICK_FILTERS.map(({ id, label, Icon }) => ({
    id,
    label,
    Icon,
    active: quickFilter === id,
  }))

  return (
    <div className="jn-page ev-page disc-page mk-page">
      <SearchPanel
        id="jn-search"
        label="Search journeys"
        placeholder="Search Etosha, coast, weekend trip, food journey…"
        value={searchInput}
        onChange={setSearchInput}
        onClear={() => setSearchInput('')}
        className="jn-page__search-sync"
      />

      <QuickFilterChips
        chips={quickChips}
        onChipClick={handleQuickChip}
        ariaLabel="Journey style filters"
        className="jn-page__quick-chips"
      />

      <div className="jn-page__budget-sync" aria-hidden>
        <div className="jn-page__budget-chips" role="group" aria-label="Budget range">
          {BUDGET_BUCKETS.map((b) => {
            const active = selectedBucket?.label === b.label
            return (
              <button
                key={b.label}
                type="button"
                className={`acc-quick-chip ev-page__discover-chip${active ? ' acc-quick-chip--active' : ''}`}
                aria-pressed={active}
                onClick={() => setSelectedBucket(active ? null : b)}
              >
                <BadgeDollarSign className="jn-filter-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      {hasFilters && (
        <div className="jn-page__active-filters" aria-label="Active filters">
          {quickFilter && (
            <span className="jn-page__active-filter">
              {QUICK_FILTERS.find((f) => f.id === quickFilter)?.label}
            </span>
          )}
          {selectedBucket && (
            <span className="jn-page__active-filter">{selectedBucket.label}</span>
          )}
          {search && <span className="jn-page__active-filter">&ldquo;{search}&rdquo;</span>}
          <button type="button" className="jn-page__clear-filters" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      <p className="jn-page__results-hint" role="status">
        {hint}
      </p>

      {engagement.shareMsg ? (
        <p className="jn-page__toast" role="status">
          {engagement.shareMsg}
        </p>
      ) : null}

      {recentStories.length > 0 && (
        <section className="ev-page__story-rings jn-page__story-rings" aria-labelledby="jn-rings-title">
          <div className="ev-page__stories-head">
            <h2 id="jn-rings-title" className="ev-page__stories-title">
              Recent journeys
            </h2>
            <span className="ev-page__stories-sub">Tap to preview</span>
          </div>
          <div className="ev-page__story-rings-row">
            {recentStories.map((t, i) => (
              <button
                key={`jn-ring-${t.id}`}
                type="button"
                className="ev-story-ring"
                aria-label={`Open journey story: ${t.title}`}
                onClick={() => setActiveStoryIdx(i)}
              >
                <span className="ev-story-ring__avatar">
                  {journeyCoverSrc(t.cover_image) ? (
                    <img
                      src={journeyCoverSrc(t.cover_image)}
                      alt=""
                      onError={onJourneyImgError}
                    />
                  ) : (
                    <span className="ev-story-ring__placeholder" aria-hidden>
                      <Route size={18} strokeWidth={2.25} />
                    </span>
                  )}
                </span>
                <span className="ev-story-ring__label">{t.author.display_name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="disc-page__layout jn-page__layout">
        <main className="disc-page__main jn-page__main">
          {allTrips.length === 0 ? (
            <EmptyState
              iconElement={<Map size={28} strokeWidth={2} aria-hidden />}
              title="No journeys shared yet"
              sub="Travel stories, routes, and itineraries will appear here once travellers add them."
              cta={profile ? { label: 'Create journey', to: '/journeys/new' } : undefined}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              iconElement={<Route size={28} strokeWidth={2} aria-hidden />}
              title="No journeys found"
              sub="Try changing your destination, travel style, duration, or search term."
              cta={{ label: 'Show all journeys', onClick: clearAll }}
            />
          ) : (
            <>
              {showDiscoveryRails && curated && curated.weekendRail.length > 0 && (
                <JourneyRail
                  id="jn-weekend"
                  title="Weekend trips"
                  sub="Short loops and long weekends — easy inspiration for your next escape."
                  trips={curated.weekendRail}
                  engagement={engagement}
                />
              )}

              {showDiscoveryRails && curated && curated.budgetRail.length > 0 && (
                <JourneyRail
                  id="jn-budget"
                  title="Budget friendly"
                  sub="Full cost breakdowns and practical routes under N$5k."
                  trips={curated.budgetRail}
                  engagement={engagement}
                />
              )}

              <section className="jn-page__all" aria-labelledby="jn-all-title">
                <JourneySectionHead
                  id="jn-all-title"
                  title={hasFilters ? 'Matching journeys' : 'All journeys'}
                  subtitle="Browse routes with photos, stops, travel tips, and creator notes."
                  trailing={
                    <span className="journey-section-head__meta">
                      {filtered.length} {filtered.length === 1 ? 'journey' : 'journeys'}
                    </span>
                  }
                />
                <div className="jn-page__grid">
                  {filtered.map((t) => (
                    <JourneyListingCard
                      key={t.id}
                      trip={t}
                      liked={engagement.isLiked(t)}
                      saved={engagement.isSaved(t)}
                      onLike={(event) => engagement.toggleLike(t, event)}
                      onSave={(event) => engagement.toggleSave(t, event)}
                      onShare={(event) => engagement.shareJourney(t, event)}
                    />
                  ))}
                </div>
              </section>

              <section className="jn-bottom-cta" aria-labelledby="jn-cta-title">
                <h2 id="jn-cta-title" className="jn-bottom-cta__title">
                  Have a route others should know about?
                </h2>
                <p className="jn-bottom-cta__text">
                  Share your journey and help another traveller plan their next trip.
                </p>
                <Link
                  to={profile ? '/journeys/new' : '/login'}
                  className="btn btn-primary jn-bottom-cta__btn"
                >
                  <Plus size={16} strokeWidth={2.5} aria-hidden />
                  Create journey
                </Link>
              </section>
            </>
          )}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Journey discovery" />
      </div>

      {activeStoryIdx != null && recentStories[activeStoryIdx] && (() => {
        const trip = recentStories[activeStoryIdx]
        return (
          <div
            className="ev-story-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Journey story"
            onClick={() => setActiveStoryIdx(null)}
          >
            <div className="ev-story-viewer__card" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="ev-story-viewer__close"
                aria-label="Close"
                onClick={() => setActiveStoryIdx(null)}
              >
                <X size={20} strokeWidth={2.25} aria-hidden />
              </button>

              {journeyCoverSrc(trip.cover_image) ? (
                <img
                  className="ev-story-viewer__img"
                  src={journeyCoverSrc(trip.cover_image)}
                  alt={trip.title}
                  onError={onJourneyImgError}
                />
              ) : (
                <div className="ev-story-viewer__img ev-story-viewer__img--placeholder" aria-hidden>
                  <Route size={48} strokeWidth={1.75} />
                </div>
              )}

              <div className="ev-story-viewer__meta">
                <div className="ev-story-viewer__progress" aria-hidden>
                  <span
                    key={trip.id}
                    className="ev-story-viewer__progress-fill"
                    style={{ animationDuration: '12s' }}
                  />
                </div>

                <p className="ev-story-viewer__author-row">
                  <UserRound size={14} strokeWidth={2.25} aria-hidden />
                  <span className="ev-story-viewer__author">{trip.author.display_name}</span>
                </p>

                <p className="ev-story-viewer__title">{trip.title}</p>
                <p className="ev-story-viewer__sub">
                  {trip.countries.map(countryLabel).join(', ')}
                  {' · '}
                  {dayLabel(trip.days)}
                  {' · '}
                  {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
                </p>

                <div className="ev-story-viewer__social" role="group" aria-label="Story actions">
                  <button
                    type="button"
                    className="ev-story-viewer__share"
                    onClick={() => onShareStory(trip.id)}
                    aria-label="Share journey"
                  >
                    <Share2 size={15} strokeWidth={2.25} aria-hidden />
                    {storyShareMsg || 'Share'}
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary ev-story-viewer__cta"
                  onClick={() => {
                    setActiveStoryIdx(null)
                    navigate(`/journeys/${trip.id}`)
                  }}
                >
                  View journey
                  <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
                </button>
              </div>

              {recentStories.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--prev"
                    aria-label="Previous story"
                    onClick={() =>
                      setActiveStoryIdx((i) =>
                        i == null ? 0 : (i - 1 + recentStories.length) % recentStories.length,
                      )
                    }
                  >
                    <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--next"
                    aria-label="Next story"
                    onClick={() =>
                      setActiveStoryIdx((i) => (i == null ? 0 : (i + 1) % recentStories.length))
                    }
                  >
                    <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })()}
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
            onLike={(event) => engagement.toggleLike(t, event)}
            onSave={(event) => engagement.toggleSave(t, event)}
            onShare={(event) => engagement.shareJourney(t, event)}
          />
        ))}
      </div>
    </section>
  )
}
