import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeDollarSign,
  Bookmark,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  Landmark,
  Map,
  MapPin,
  MessageCircle,
  Mountain,
  Plus,
  Route,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
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
import {
  isBudgetTrip,
  isWeekendTrip,
  journeyAccentBadge,
} from '../utils/journeyDisplay'
import { useAuth } from '../auth/AuthContext'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { MarketplaceHero, QuickFilterChips } from '../components/marketplace'
import { EmptyState } from '../components/ui'

const JOURNEY_DEFAULT_IMAGE = '/images/default-journey.jpg'
const RECENT_STORY_COUNT = 5
const FEATURED_COUNT = 3
const STOP_PREVIEW_COUNT = 3

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

const COUNTRY_NAMES: Record<string, string> = {
  NA: 'Namibia',
  BW: 'Botswana',
  ZA: 'South Africa',
  ZM: 'Zambia',
  ZW: 'Zimbabwe',
}

function dayLabel(n: number) {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

function countryLabel(code: string) {
  return COUNTRY_NAMES[code] ?? code
}

function routeLabel(trip: MockTrip) {
  const places = trip.stops.map((s) => s.place_name)
  if (places.length === 0) return trip.countries.map(countryLabel).join(', ')
  if (places.length <= 2) return places.join(' to ')
  return `${places[0]} to ${places[places.length - 1]}`
}

function stopsPreview(trip: MockTrip) {
  const places = trip.stops.map((s) => s.place_name)
  if (places.length === 0) return null
  if (places.length <= STOP_PREVIEW_COUNT) return places
  const shown = places.slice(0, STOP_PREVIEW_COUNT)
  const remaining = places.length - STOP_PREVIEW_COUNT
  return { shown, remaining }
}

function journeyCoverSrc(cover: string | null | undefined) {
  return cover?.trim() ? cover : ''
}

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

function styleBadges(trip: MockTrip): string[] {
  const accent = journeyAccentBadge(trip)
  const badges: string[] = []
  if (accent) badges.push(accent)
  if (trip.tags.includes('photography') && !badges.includes('Photography')) badges.push('Photography')
  if (trip.tags.includes('4x4') && !badges.some((b) => b.includes('4'))) badges.push('4x4 route')
  return badges.slice(0, 2)
}

export function TripsList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const allTrips = useMemo(() => [...loadUserTrips(), ...mockTrips], [])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<(typeof BUDGET_BUCKETS)[number] | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

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

  const featuredJourneys = useMemo(() => {
    if (filtered.length === 0) return []
    return [...filtered].sort((a, b) => b.saves_count - a.saves_count || b.likes_count - a.likes_count).slice(0, FEATURED_COUNT)
  }, [filtered])

  const curated = useMemo(() => {
    if (filtered.length === 0) return null
    const used = new Set<number>(featuredJourneys.map((t) => t.id))
    const remaining = () => filtered.filter((t) => !used.has(t.id))

    const weekendRail = remaining().filter((t) => isWeekendTrip(t)).slice(0, 6)
    weekendRail.forEach((t) => used.add(t.id))

    const budgetRail = remaining().filter((t) => isBudgetTrip(t)).slice(0, 6)

    return { weekendRail, budgetRail }
  }, [filtered, featuredJourneys])

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
    <div className="jn-page ev-page acc-page disc-page mk-page">
      <div className="jn-page__top">
        <MarketplaceHero
          className="jn-page__header"
          title="Explore journeys"
          subtitle="Discover real travel stories, itineraries, routes, and saved experiences from travellers and locals."
          support="Find inspiration by destination, travel style, duration, and mood."
          action={
            <Link
              to={profile ? '/journeys/new' : '/login'}
              className="btn btn-primary jn-page__create-btn"
            >
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              Create journey
            </Link>
          }
        />

        <div className="acc-page__search jn-page__search">
          <label className="visually-hidden" htmlFor="jn-search">
            Search journeys
          </label>
          <div className="acc-page__search-inner">
            <Search className="acc-page__search-icon" size={18} strokeWidth={2} aria-hidden />
            <input
              id="jn-search"
              type="search"
              className="acc-page__search-input input"
              placeholder="Search Etosha, coast, weekend trip, food journey…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
            {searchInput && (
              <button
                type="button"
                className="acc-page__search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            )}
          </div>
        </div>

        <QuickFilterChips
          chips={quickChips}
          onChipClick={handleQuickChip}
          ariaLabel="Journey style filters"
          className="jn-page__quick-chips"
        />

        <div className="jn-page__filter-toggle-row">
          <button
            type="button"
            className="jn-page__filter-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            aria-controls="jn-advanced-panel"
          >
            <SlidersHorizontal size={15} strokeWidth={2.25} aria-hidden />
            {showAdvanced ? 'Hide budget filters' : 'Budget filters'}
          </button>
          {hasFilters && (
            <button type="button" className="jn-page__clear-filters" onClick={clearAll}>
              Clear all
            </button>
          )}
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
          </div>
        )}

        {showAdvanced && (
          <section
            id="jn-advanced-panel"
            className="ev-page__discover card jn-page__discover-panel"
            aria-labelledby="jn-advanced-title"
          >
            <h2 id="jn-advanced-title" className="ev-page__discover-title">
              Budget range
            </h2>
            <p className="ev-page__discover-sub">Filter by total trip cost — combine with search and style filters.</p>
            <div
              className="ev-page__discover-chips jn-page__budget-chips"
              role="group"
              aria-label="Budget range"
            >
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
          </section>
        )}
      </div>

      <p className="jn-page__results-hint" role="status">
        {hint}
      </p>

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
              {featuredJourneys.length > 0 && (
                <section className="jn-page__featured" aria-labelledby="jn-featured-title">
                  <div className="jn-page__section-head">
                    <div>
                      <h2 id="jn-featured-title">Featured journeys</h2>
                      <p>Routes and stories travellers are saving for their next trip.</p>
                    </div>
                    <span className="jn-page__featured-badge">
                      <Sparkles size={13} strokeWidth={2.25} aria-hidden />
                      Featured
                    </span>
                  </div>
                  <div className={`jn-page__featured-grid${featuredJourneys.length === 1 ? ' jn-page__featured-grid--solo' : ''}`}>
                    {featuredJourneys.map((t, i) => (
                      <FeaturedJourney key={t.id} trip={t} prominent={i === 0} />
                    ))}
                  </div>
                </section>
              )}

              {showDiscoveryRails && curated && curated.weekendRail.length > 0 && (
                <JourneyRail
                  id="jn-weekend"
                  title="Weekend trips"
                  sub="Short loops and long weekends — easy inspiration for your next escape."
                  trips={curated.weekendRail}
                />
              )}

              {showDiscoveryRails && curated && curated.budgetRail.length > 0 && (
                <JourneyRail
                  id="jn-budget"
                  title="Budget friendly"
                  sub="Full cost breakdowns and practical routes under N$5k."
                  trips={curated.budgetRail}
                />
              )}

              <section className="jn-page__all" aria-labelledby="jn-all-title">
                <div className="jn-page__section-head">
                  <div>
                    <h2 id="jn-all-title">{hasFilters ? 'Matching journeys' : 'All journeys'}</h2>
                    <p>Browse routes with photos, stops, travel tips, and creator notes.</p>
                  </div>
                  <span>
                    {filtered.length} {filtered.length === 1 ? 'journey' : 'journeys'}
                  </span>
                </div>
                <div className="jn-page__grid">
                  {filtered.map((t) => (
                    <JourneyCard key={t.id} trip={t} />
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

function FeaturedJourney({ trip, prominent = false }: { trip: MockTrip; prominent?: boolean }) {
  const accent = journeyAccentBadge(trip)
  const cover = journeyCoverSrc(trip.cover_image)

  return (
    <Link
      to={`/journeys/${trip.id}`}
      className={`jn-featured${prominent ? ' jn-featured--prominent' : ' jn-featured--compact'}`}
    >
      {cover ? (
        <img
          className="jn-featured__img"
          src={cover}
          alt={trip.title}
          loading="lazy"
          onError={onJourneyImgError}
        />
      ) : (
        <div className="jn-featured__img jn-featured__img--placeholder" aria-hidden>
          <Route size={prominent ? 40 : 28} strokeWidth={1.75} />
        </div>
      )}
      <div className="jn-featured__overlay" aria-hidden />
      <div className="jn-featured__body">
        <span className="jn-featured__eyebrow">
          <Sparkles size={12} strokeWidth={2.25} aria-hidden />
          Featured journey
        </span>
        <h3 className="jn-featured__title">{trip.title}</h3>
        <p className="jn-featured__sub">
          <MapPin size={13} strokeWidth={2.25} aria-hidden />
          {routeLabel(trip)}
          {' · '}
          {dayLabel(trip.days)}
          {trip.stops.length > 0 && (
            <>
              {' · '}
              {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
            </>
          )}
        </p>
        <p className="jn-featured__creator">
          <UserRound size={13} strokeWidth={2.25} aria-hidden />
          Created by {trip.author.display_name}
        </p>
        {accent ? <span className="jn-featured__badge">{accent}</span> : null}
        <span className="jn-featured__cta">
          View journey
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
        </span>
        {(trip.likes_count > 0 || trip.saves_count > 0) && (
          <div className="jn-featured__social" aria-label="Journey engagement">
            {trip.likes_count > 0 && (
              <span>
                <Heart size={12} strokeWidth={2.25} aria-hidden />
                {trip.likes_count}
              </span>
            )}
            {trip.saves_count > 0 && (
              <span>
                <Bookmark size={12} strokeWidth={2.25} aria-hidden />
                {trip.saves_count}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

function JourneyCard({ trip }: { trip: MockTrip }) {
  const accent = journeyAccentBadge(trip)
  const badges = styleBadges(trip)
  const cover = journeyCoverSrc(trip.cover_image)
  const stops = stopsPreview(trip)

  return (
    <Link to={`/journeys/${trip.id}`} className="jn-card jn-card--browse card">
      <div className="jn-card__img-wrap">
        {accent ? <span className="jn-card__badge jn-card__badge--style">{accent}</span> : null}
        <span className="jn-card__badge jn-card__badge--right">
          <CalendarDays size={11} strokeWidth={2.5} aria-hidden />
          {dayLabel(trip.days)}
        </span>
        {cover ? (
          <img
            className="jn-card__img"
            src={cover}
            alt={trip.title}
            loading="lazy"
            onError={onJourneyImgError}
          />
        ) : (
          <div className="jn-card__img jn-card__placeholder" aria-hidden>
            <Map size={32} strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="jn-card__body jn-card__body--browse">
        {badges.length > 0 && (
          <div className="jn-card__style-row">
            {badges.map((b) => (
              <span key={b} className="jn-card__style-badge">
                {b}
              </span>
            ))}
          </div>
        )}
        <h3 className="jn-card__title">{trip.title}</h3>
        <p className="jn-card__route">
          <Route size={13} strokeWidth={2.25} aria-hidden />
          {routeLabel(trip)}
        </p>
        <p className="jn-card__summary">{trip.summary}</p>

        {stops && (
          <p className="jn-card__stops">
            <MapPin size={12} strokeWidth={2.25} aria-hidden />
            {Array.isArray(stops) ? (
              stops.join(' · ')
            ) : (
              <>
                {stops.shown.join(' · ')}
                <span className="jn-card__stops-more"> +{stops.remaining} more stops</span>
              </>
            )}
          </p>
        )}

        <div className="jn-card__meta-row">
          <span className="jn-card__meta-item">
            <UserRound size={12} strokeWidth={2.25} aria-hidden />
            Created by {trip.author.display_name}
          </span>
          {trip.stops.length > 0 && (
            <span className="jn-card__meta-item">
              <MapPin size={12} strokeWidth={2.25} aria-hidden />
              {trip.stops.length} {trip.stops.length === 1 ? 'stop' : 'stops'}
            </span>
          )}
        </div>

        {(trip.likes_count > 0 || trip.comments_count > 0 || trip.saves_count > 0) && (
          <div className="jn-card__social" aria-label="Journey engagement">
            {trip.likes_count > 0 && (
              <span>
                <Heart size={12} strokeWidth={2.25} aria-hidden />
                {trip.likes_count}
              </span>
            )}
            {trip.saves_count > 0 && (
              <span>
                <Bookmark size={12} strokeWidth={2.25} aria-hidden />
                {trip.saves_count}
              </span>
            )}
            {trip.comments_count > 0 && (
              <span>
                <MessageCircle size={12} strokeWidth={2.25} aria-hidden />
                {trip.comments_count}
              </span>
            )}
            {trip.tags.includes('photography') && (
              <span className="jn-card__social-photo" aria-label="Includes photos">
                <Camera size={12} strokeWidth={2.25} aria-hidden />
              </span>
            )}
          </div>
        )}

        <span className="jn-card__cta">
          View journey
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function JourneyRail({
  id,
  title,
  sub,
  trips,
}: {
  id: string
  title: string
  sub: string
  trips: MockTrip[]
}) {
  return (
    <section className="jn-page__rail" aria-labelledby={id}>
      <div className="jn-page__section-head jn-page__section-head--rail">
        <div>
          <h2 id={id}>{title}</h2>
          <p>{sub}</p>
        </div>
      </div>
      <div className="jn-rail-scroll h-scroll">
        {trips.map((t) => (
          <JourneyCard key={`${id}-${t.id}`} trip={t} />
        ))}
      </div>
    </section>
  )
}
