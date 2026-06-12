import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Binoculars,
  Camera,
  Car,
  Flame,
  Footprints,
  Heart,
  Search,
  Sparkles,
  User,
  Users,
  Wallet,
  Waves,
  type LucideProps,
} from 'lucide-react'
import { mockTrips, type MockTrip } from '../data/mockTrips'
import { loadUserTrips } from '../data/userTrips'
import {
  isBudgetTrip,
  isWeekendTrip,
  journeyAccentBadge,
  journeyHook,
} from '../utils/journeyDisplay'
import { useAuth } from '../auth/AuthContext'

const JOURNEY_DEFAULT_IMAGE = '/images/default-journey.jpg'
const RECENT_STORY_COUNT = 5
const EXPLORE_PREVIEW_COUNT = 3

type FilterIcon = ComponentType<LucideProps>

const TAG_OPTIONS: { value: string; label: string; Icon: FilterIcon }[] = [
  { value: '4x4', label: '4×4 / Offroad', Icon: Car },
  { value: 'budget', label: 'Budget', Icon: Wallet },
  { value: 'solo', label: 'Solo', Icon: User },
  { value: 'family', label: 'Family', Icon: Users },
  { value: 'wildlife', label: 'Wildlife', Icon: Binoculars },
  { value: 'coast', label: 'Coast', Icon: Waves },
  { value: 'hiking', label: 'Hiking', Icon: Footprints },
  { value: 'photography', label: 'Photography', Icon: Camera },
]

const STORY_REACTIONS = [
  { id: 'love' as const, label: 'Love', Icon: Heart },
  { id: 'fire' as const, label: 'Fire', Icon: Flame },
  { id: 'wow' as const, label: 'Wow', Icon: Sparkles },
]

const BUDGET_BUCKETS = [
  { label: 'Under N$2k', min: 0, max: 2000 },
  { label: 'N$2–5k', min: 2000, max: 5000 },
  { label: 'N$5–12k', min: 5000, max: 12000 },
  { label: 'N$12k+', min: 12000, max: Infinity },
]

function dayLabel(n: number) {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

function routeLabel(trip: MockTrip) {
  const places = trip.stops.map((s) => s.place_name)
  if (places.length <= 2) return places.join(' → ')
  return `${places[0]} → … → ${places[places.length - 1]}`
}

function stopCountry(code: string) {
  const map: Record<string, string> = { NA: '🇳🇦', BW: '🇧🇼', ZA: '🇿🇦', ZM: '🇿🇲', ZW: '🇿🇼' }
  return map[code] ?? code
}

function journeyCoverSrc(cover: string | null | undefined) {
  return cover?.trim() ? cover : JOURNEY_DEFAULT_IMAGE
}

function onJourneyImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null
  e.currentTarget.src = JOURNEY_DEFAULT_IMAGE
}

export function TripsList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const allTrips = useMemo(() => [...loadUserTrips(), ...mockTrips], [])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<(typeof BUDGET_BUCKETS)[number] | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null)
  const [storyReactions, setStoryReactions] = useState<Record<number, 'love' | 'fire' | 'wow' | null>>({})
  const [storyReactionCounts, setStoryReactionCounts] = useState<
    Record<number, { love: number; fire: number; wow: number }>
  >({})
  const [storyComments, setStoryComments] = useState<Record<number, string[]>>({})
  const [storyDraft, setStoryDraft] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [storyShareMsg, setStoryShareMsg] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filtered = useMemo(() => {
    return allTrips.filter((t) => {
      if (selectedTag && !t.tags.includes(selectedTag)) return false
      if (selectedBucket) {
        if (t.total_cost < selectedBucket.min || t.total_cost >= selectedBucket.max) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const hay = [
          t.title,
          t.summary,
          t.author.display_name,
          ...t.stops.map((s) => s.place_name),
          ...t.countries,
          ...t.tags,
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [allTrips, search, selectedTag, selectedBucket])

  const hasFilters = !!(selectedTag || selectedBucket || search)

  const recentStories = useMemo(() => filtered.slice(0, RECENT_STORY_COUNT), [filtered])

  const curated = useMemo(() => {
    if (filtered.length === 0) return null
    const featured = [...filtered].sort((a, b) => b.likes_count - a.likes_count)[0]
    const used = new Set<number>([featured.id])
    const remaining = () => filtered.filter((t) => !used.has(t.id))

    const explorePreview = remaining().slice(0, EXPLORE_PREVIEW_COUNT)
    explorePreview.forEach((t) => used.add(t.id))

    const weekendRail = remaining().filter((t) => isWeekendTrip(t)).slice(0, 6)
    weekendRail.forEach((t) => used.add(t.id))

    const budgetRail = remaining().filter((t) => isBudgetTrip(t)).slice(0, 6)

    return { featured, explorePreview, weekendRail, budgetRail }
  }, [filtered])

  const showDiscoveryRails = !hasFilters

  const hasStyleOrBudgetFilters = !!(selectedTag || selectedBucket)

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
    if (activeStoryIdx == null) {
      setStoryDraft('')
      setShowCommentInput(false)
      return
    }
    const id = recentStories[activeStoryIdx]?.id
    if (id == null) return
    setStoryReactionCounts((prev) => (prev[id] ? prev : { ...prev, [id]: { love: 0, fire: 0, wow: 0 } }))
  }, [activeStoryIdx, recentStories])

  useEffect(() => {
    if (!storyShareMsg) return
    const t = window.setTimeout(() => setStoryShareMsg(''), 1600)
    return () => window.clearTimeout(t)
  }, [storyShareMsg])

  const onReactStory = (tripId: number, r: 'love' | 'fire' | 'wow') => {
    const prev = storyReactions[tripId] ?? null
    const next = prev === r ? null : r
    setStoryReactions((s) => ({ ...s, [tripId]: next }))
    setStoryReactionCounts((s) => {
      const cur = s[tripId] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prev) out[prev] = Math.max(0, out[prev] - 1)
      if (next) out[next] += 1
      return { ...s, [tripId]: out }
    })
  }

  const onShareStory = async (tripId: number) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/journeys/${tripId}`)
      setStoryShareMsg('Link copied')
    } catch {
      setStoryShareMsg('Copy failed')
    }
  }

  const onCommentStory = (tripId: number) => {
    const body = storyDraft.trim()
    if (!body) return
    setStoryComments((prev) => ({
      ...prev,
      [tripId]: [`You: ${body}`, ...(prev[tripId] ?? [])].slice(0, 8),
    }))
    setStoryDraft('')
  }

  const clearAll = () => {
    setSelectedTag('')
    setSelectedBucket(null)
    setSearchInput('')
    setSearch('')
  }

  return (
    <div className="ev-page acc-page jn-page">
      <div className="jn-page__top">
      <header className="page-header ev-page__header acc-page__header jn-page__header">
        <div>
          <h1 className="display ev-page__title">Journeys</h1>
          <p className="page-sub ev-page__sub">
            Real travel diaries from real people — routes, prices, stops, and tips.
          </p>
        </div>
        <Link
          to={profile ? '/journeys/new' : '/login'}
          className="btn btn-primary jn-page__share-btn"
        >
          Share your journey
        </Link>
      </header>

      <div className="acc-page__search jn-page__search">
        <label className="visually-hidden" htmlFor="jn-search">
          Search trips
        </label>
        <div className="acc-page__search-inner">
          <Search className="acc-page__search-icon" size={18} strokeWidth={2} aria-hidden />
          <input
            id="jn-search"
            type="search"
            className="acc-page__search-input input"
            placeholder="Search by place, traveller, or tag…"
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
              ×
            </button>
          )}
        </div>
      </div>

      <div className="jn-page__filter-toggle-row">
        <button
          type="button"
          className="jn-page__filter-toggle"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="jn-discover-panel"
        >
          <Sparkles size={15} strokeWidth={2.25} aria-hidden />
          {showFilters ? 'Hide trip styles' : 'Find your kind of trip'}
        </button>
        {hasFilters && (
          <button type="button" className="jn-page__clear-filters" onClick={clearAll}>
            Clear all
          </button>
        )}
      </div>

      {hasFilters && (
        <div className="jn-page__active-filters" aria-label="Active filters">
          {selectedTag && (
            <span className="jn-page__active-filter">
              {TAG_OPTIONS.find((t) => t.value === selectedTag)?.label}
            </span>
          )}
          {selectedBucket && (
            <span className="jn-page__active-filter">{selectedBucket.label}</span>
          )}
          {search && <span className="jn-page__active-filter">&ldquo;{search}&rdquo;</span>}
        </div>
      )}

      {showFilters && (
        <section
          id="jn-discover-panel"
          className="ev-page__discover card jn-page__discover-panel"
          aria-labelledby="jn-discover-title"
        >
          <h2 id="jn-discover-title" className="ev-page__discover-title">
            Quick filters
          </h2>
          <p className="ev-page__discover-sub">Style and budget — combine with search above.</p>
          <div className="ev-page__discover-chips" role="group" aria-label="Trip style">
            <button
              type="button"
              className={`acc-quick-chip ev-page__discover-chip${!hasStyleOrBudgetFilters ? ' acc-quick-chip--active' : ''}`}
              aria-pressed={!hasStyleOrBudgetFilters}
              onClick={() => {
                setSelectedTag('')
                setSelectedBucket(null)
              }}
            >
              All
            </button>
            {TAG_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`acc-quick-chip ev-page__discover-chip${selectedTag === value ? ' acc-quick-chip--active' : ''}`}
                aria-pressed={selectedTag === value}
                onClick={() => setSelectedTag(selectedTag === value ? '' : value)}
              >
                <Icon className="jn-filter-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                {label}
              </button>
            ))}
          </div>
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
                  <Wallet className="jn-filter-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
                  {b.label}
                </button>
              )
            })}
          </div>
        </section>
      )}
      </div>

      {recentStories.length > 0 && (
        <section className="ev-page__story-rings" aria-labelledby="jn-rings-title">
          <div className="ev-page__stories-head">
            <h2 id="jn-rings-title" className="ev-page__stories-title">
              Recent journeys
            </h2>
            <span className="ev-page__stories-sub">Tap to open</span>
          </div>
          <div className="ev-page__story-rings-row">
            {recentStories.map((t, i) => (
              <button
                key={`jn-ring-${t.id}`}
                type="button"
                className="ev-story-ring"
                aria-label={`Open story: ${t.title}`}
                onClick={() => setActiveStoryIdx(i)}
              >
                <span className="ev-story-ring__avatar">
                  <img
                    src={journeyCoverSrc(t.cover_image)}
                    alt=""
                    onError={onJourneyImgError}
                  />
                </span>
                <span className="ev-story-ring__label">{t.author.display_name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {curated && (
        <>
          <FeaturedJourney trip={curated.featured} />

          {showDiscoveryRails && curated.explorePreview.length > 0 && (
            <section className="jn-page__explore" aria-labelledby="jn-explore-title">
              <div className="jn-page__section-head">
                <div>
                  <h2 id="jn-explore-title">Explore real routes</h2>
                  <p>
                    See where people went, what they spent, and what they would do differently.
                  </p>
                </div>
                <span>
                  {filtered.length} {filtered.length === 1 ? 'journey' : 'journeys'}
                </span>
              </div>
              <div className="jn-page__grid jn-page__grid--preview">
                {curated.explorePreview.map((t) => (
                  <JourneyCard key={`explore-${t.id}`} trip={t} />
                ))}
                <div className="jn-scroll-nudge">
                  <p className="jn-scroll-nudge__title">Not sure where to go?</p>
                  <p className="jn-scroll-nudge__text">
                    Try budget trips, beach weekends, or wildlife routes.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary jn-scroll-nudge__btn"
                    onClick={() => {
                      setShowFilters(true)
                      setSelectedTag('budget')
                    }}
                  >
                    Show me ideas
                  </button>
                </div>
              </div>
            </section>
          )}

          {showDiscoveryRails && curated.weekendRail.length > 0 && (
            <JourneyRail
              id="jn-weekend"
              title="Weekend escapes"
              sub="Short loops and long weekends — easy to scan."
              trips={curated.weekendRail}
            />
          )}

          {showDiscoveryRails && curated.budgetRail.length > 0 && (
            <JourneyRail
              id="jn-budget"
              title="Budget journeys"
              sub="Under N$5k with costs broken down."
              trips={curated.budgetRail}
            />
          )}

          <section className="jn-page__all" aria-labelledby="jn-all-title">
            <div className="jn-page__section-head">
              <div>
                <h2 id="jn-all-title">{hasFilters ? 'Matching journeys' : 'All journeys'}</h2>
                <p>Browse routes with prices, stops, travel tips, and local moments.</p>
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
              Share your journey and help another traveller plan better.
            </p>
            <Link
              to={profile ? '/journeys/new' : '/login'}
              className="btn btn-primary jn-bottom-cta__btn"
            >
              Share your journey
            </Link>
          </section>
        </>
      )}

      {filtered.length === 0 && (
        <div className="ev-page__empty">
          <p className="ev-page__empty-title">No journeys match</p>
          <p className="ev-page__empty-text">
            Try a different style, budget, or clear the filters to browse all journeys.
          </p>
          {hasFilters && (
            <button type="button" className="btn btn-primary ev-page__empty-btn" onClick={clearAll}>
              Show all journeys
            </button>
          )}
        </div>
      )}

      {activeStoryIdx != null && recentStories[activeStoryIdx] && (() => {
        const trip = recentStories[activeStoryIdx]
        const rc = storyReactionCounts[trip.id] ?? { love: 0, fire: 0, wow: 0 }
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
                ×
              </button>

              <img
                className="ev-story-viewer__img"
                src={journeyCoverSrc(trip.cover_image)}
                alt={trip.title}
                onError={onJourneyImgError}
              />

              <div className="ev-story-viewer__meta">
                <div className="ev-story-viewer__progress" aria-hidden>
                  <span
                    key={trip.id}
                    className="ev-story-viewer__progress-fill"
                    style={{ animationDuration: '12s' }}
                  />
                </div>

                <p className="ev-story-viewer__author-row">
                  <span className="ev-story-viewer__author">{trip.author.display_name}</span>
                </p>

                <p className="ev-story-viewer__title">{trip.title}</p>
                <p className="ev-story-viewer__sub">
                  {trip.countries.map((c) => stopCountry(c)).join(' ')}
                  {' · '}
                  {dayLabel(trip.days)}
                  {' · '}N${trip.total_cost.toLocaleString()}
                </p>

                <div className="ev-story-viewer__social" role="group" aria-label="Story actions">
                  {STORY_REACTIONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`ev-story-viewer__react${storyReactions[trip.id] === id ? ' ev-story-viewer__react--active' : ''}`}
                      onClick={() => onReactStory(trip.id, id)}
                      aria-label={`React with ${label}`}
                    >
                      <Icon size={16} strokeWidth={2.25} aria-hidden />
                      {rc[id]}
                    </button>
                  ))}
                  <button type="button" className="ev-story-viewer__share" onClick={() => onShareStory(trip.id)}>
                    {storyShareMsg || 'Share'}
                  </button>
                  <button
                    type="button"
                    className="ev-story-viewer__share"
                    onClick={() => setShowCommentInput((v) => !v)}
                  >
                    {showCommentInput ? 'Close' : 'Comment'}
                  </button>
                </div>

                {showCommentInput && (
                  <div className="ev-story-viewer__comment-box">
                    <input
                      className="input ev-story-viewer__comment-input"
                      placeholder="Write a comment…"
                      value={storyDraft}
                      onChange={(e) => setStoryDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onCommentStory(trip.id)
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-ghost ev-story-viewer__comment-send"
                      onClick={() => onCommentStory(trip.id)}
                      disabled={!storyDraft.trim()}
                    >
                      Send
                    </button>
                  </div>
                )}

                {(storyComments[trip.id] ?? []).length > 0 && (
                  <div className="ev-story-viewer__comments">
                    {(storyComments[trip.id] ?? []).map((c, i) => (
                      <p key={i} className="ev-story-viewer__comment-item">
                        {c}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary ev-story-viewer__cta"
                  onClick={() => {
                    setActiveStoryIdx(null)
                    navigate(`/journeys/${trip.id}`)
                  }}
                >
                  View full journey
                </button>
              </div>

              {recentStories.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--prev"
                    aria-label="Previous"
                    onClick={() =>
                      setActiveStoryIdx((i) =>
                        i == null ? 0 : (i - 1 + recentStories.length) % recentStories.length,
                      )
                    }
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--next"
                    aria-label="Next"
                    onClick={() =>
                      setActiveStoryIdx((i) => (i == null ? 0 : (i + 1) % recentStories.length))
                    }
                  >
                    ›
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

function FeaturedJourney({ trip }: { trip: MockTrip }) {
  return (
    <Link to={`/journeys/${trip.id}`} className="jn-featured">
      <img
        className="jn-featured__img"
        src={journeyCoverSrc(trip.cover_image)}
        alt=""
        loading="lazy"
        onError={onJourneyImgError}
      />
      <div className="jn-featured__overlay" aria-hidden />
      <div className="jn-featured__body">
        <span className="jn-featured__eyebrow">Featured journey</span>
        <h2 className="jn-featured__title">{trip.title}</h2>
        <p className="jn-featured__sub">
          {routeLabel(trip)} · {dayLabel(trip.days)} · N${trip.total_cost.toLocaleString()}
        </p>
        <span className="jn-featured__cta">
          See the route, prices, stops, and travel tips →
        </span>
      </div>
    </Link>
  )
}

function JourneyCard({ trip }: { trip: MockTrip }) {
  const accent = journeyAccentBadge(trip)
  return (
    <Link to={`/journeys/${trip.id}`} className="jn-card jn-card--browse card">
      <div className="jn-card__img-wrap">
        <span className="jn-card__badge">{dayLabel(trip.days)}</span>
        {accent && (
          <span className="jn-card__badge jn-card__badge--right">{accent}</span>
        )}
        <img
          className="jn-card__img"
          src={journeyCoverSrc(trip.cover_image)}
          alt=""
          loading="lazy"
          onError={onJourneyImgError}
        />
      </div>
      <div className="jn-card__body jn-card__body--browse">
        <h2 className="jn-card__title">{trip.title}</h2>
        <p className="jn-card__route">{routeLabel(trip)}</p>
        <p className="jn-card__meta-line">
          {dayLabel(trip.days)} · N${trip.total_cost.toLocaleString()}
        </p>
        <p className="jn-card__hook">{journeyHook(trip)}</p>
        <p className="jn-card__author-line">By {trip.author.display_name}</p>
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
