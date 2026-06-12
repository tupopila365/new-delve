import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { foodCoverSrc, foodOpenBadge, pickFeaturedFood } from '../utils/foodDisplay'

type Venue = {
  id: number
  name: string
  description?: string
  cuisine: string
  region: string
  city?: string | null
  owner_username?: string
  owner_display_name?: string | null
  price_level: number
  cover_image: string | null
  rating_avg?: string | null
  rating_count?: number | null
  is_open?: boolean | null
  tagline?: string | null
  popular_dish?: string | null
  closes_at?: string | null
}

function venueBlurb(v: Venue): string {
  return v.tagline?.trim() || v.description?.trim() || ''
}

const CUISINE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'local', label: 'Local', emoji: '🍲' },
  { value: 'grill', label: 'Grill', emoji: '🔥' },
  { value: 'seafood', label: 'Seafood', emoji: '🦞' },
  { value: 'cafe', label: 'Café', emoji: '☕' },
  { value: 'bakery', label: 'Bakery', emoji: '🥐' },
  { value: 'pizza', label: 'Pizza', emoji: '🍕' },
  { value: 'asian', label: 'Asian', emoji: '🍜' },
  { value: 'fast_food', label: 'Fast food', emoji: '🍔' },
  { value: 'bar', label: 'Bar', emoji: '🍺' },
  { value: 'other', label: 'Other', emoji: '🍽' },
]

const MOOD_FILTERS: { id: string; label: string }[] = [
  { id: 'open', label: 'Open now' },
  { id: 'cheap', label: 'Cheap eats' },
  { id: 'date', label: 'Date night' },
  { id: 'family', label: 'Family friendly' },
  { id: 'favourites', label: 'Local favourites' },
  { id: 'near', label: 'Near me' },
]

const SIDEBAR_CUISINES = ['Grill', 'Café', 'Seafood', 'Bakery', 'Pizza', 'Bar'] as const

const TOP_AREAS = [
  { city: 'Windhoek', region: 'Khomas' },
  { city: 'Swakopmund', region: 'Erongo' },
  { city: 'Walvis Bay', region: 'Erongo' },
] as const

function cuisineMeta(value: string) {
  return CUISINE_OPTIONS.find((c) => c.value === value) ?? { label: value, emoji: '🍽' }
}

function priceLabel(level: number): string {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)))
}

function onFoodImgError(e: React.SyntheticEvent<HTMLImageElement>, cuisine: string) {
  const img = e.currentTarget
  const fallback = foodCoverSrc(null, cuisine)
  if (img.src !== fallback) img.src = fallback
}

export function FoodList() {
  const { profile } = useAuth()
  const [cuisine, setCuisine] = useState('')
  const [mood, setMood] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null)
  const [storyReactions, setStoryReactions] = useState<Record<number, 'love' | 'fire' | 'wow' | null>>({})
  const [storyReactionCounts, setStoryReactionCounts] = useState<
    Record<number, { love: number; fire: number; wow: number }>
  >({})
  const [storyComments, setStoryComments] = useState<Record<number, string[]>>({})
  const [storyDraft, setStoryDraft] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (cuisine) p.set('cuisine', cuisine)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [cuisine, search])

  const { data, isLoading } = useQuery({
    queryKey: ['food', qs],
    queryFn: () => apiFetch<Venue[]>(`/api/food/venues/${qs}`, { auth: false }),
  })

  const venues = useMemo(() => {
    let list = data ?? []
    if (mood === 'open') list = list.filter((v) => v.is_open === true)
    if (mood === 'cheap') list = list.filter((v) => (v.price_level || 1) <= 1)
    if (mood === 'date') list = list.filter((v) => (v.price_level || 1) >= 3 || v.cuisine === 'bar')
    if (mood === 'family') list = list.filter((v) => (v.price_level || 2) <= 2)
    if (mood === 'favourites') list = list.filter((v) => (v.rating_count ?? 0) >= 80)
    if (mood === 'near') {
      list = list.filter((v) => v.region === 'Khomas' || v.region === 'Erongo')
    }
    return list
  }, [data, mood])

  const featured = useMemo(() => venues.slice(0, 6), [venues])
  const showRichSections = featured.length >= 4
  const topPick = useMemo(() => pickFeaturedFood(venues), [venues])
  const gridVenues = useMemo(() => {
    if (!topPick) return venues
    return venues.filter((v) => v.id !== topPick.id)
  }, [venues, topPick])
  const activeStory = activeStoryIdx != null ? featured[activeStoryIdx] : null

  const openNowCount = useMemo(() => (data ?? []).filter((v) => v.is_open === true).length, [data])

  useEffect(() => {
    if (activeStoryIdx == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveStoryIdx(null)
      if (e.key === 'ArrowRight' && featured.length > 0) {
        setActiveStoryIdx((idx) => (idx == null ? 0 : (idx + 1) % featured.length))
      }
      if (e.key === 'ArrowLeft' && featured.length > 0) {
        setActiveStoryIdx((idx) => (idx == null ? 0 : (idx - 1 + featured.length) % featured.length))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeStoryIdx, featured.length])

  useEffect(() => {
    if (activeStoryIdx == null || featured.length === 0) return
    const t = window.setTimeout(() => {
      setActiveStoryIdx((idx) => {
        if (idx == null) return null
        if (idx >= featured.length - 1) return null
        return idx + 1
      })
    }, 15000)
    return () => window.clearTimeout(t)
  }, [activeStoryIdx, featured.length])

  useEffect(() => {
    if (!shareMsg) return
    const t = window.setTimeout(() => setShareMsg(''), 1600)
    return () => window.clearTimeout(t)
  }, [shareMsg])

  useEffect(() => {
    if (!activeStory) {
      setStoryDraft('')
      setShowCommentInput(false)
      return
    }
    const id = activeStory.id
    setStoryReactionCounts((prev) => {
      if (prev[id]) return prev
      return { ...prev, [id]: { love: 0, fire: 0, wow: 0 } }
    })
  }, [activeStory])

  const onReactStory = (venueId: number, reaction: 'love' | 'fire' | 'wow') => {
    const prevReaction = storyReactions[venueId] ?? null
    const nextReaction = prevReaction === reaction ? null : reaction
    setStoryReactions((prev) => ({ ...prev, [venueId]: nextReaction }))
    setStoryReactionCounts((prev) => {
      const cur = prev[venueId] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prevReaction) out[prevReaction] = Math.max(0, out[prevReaction] - 1)
      if (nextReaction) out[nextReaction] += 1
      return { ...prev, [venueId]: out }
    })
  }

  const onShareStory = async (venueId: number) => {
    const url = `${window.location.origin}/food/${venueId}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const onCommentStory = (venueId: number) => {
    const body = storyDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'You'
    setStoryComments((prev) => ({
      ...prev,
      [venueId]: [`${author}: ${body}`, ...(prev[venueId] ?? [])].slice(0, 8),
    }))
    setStoryDraft('')
  }

  const toggleSaved = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasFilters = !!(cuisine || search || mood)

  const clearAll = () => {
    setCuisine('')
    setMood('')
    setSearchInput('')
    setSearch('')
  }

  const resultsDetail =
    hasFilters && search
      ? `${venues.length} ${venues.length === 1 ? 'place' : 'places'} matched to your search`
      : hasFilters
        ? `${venues.length} ${venues.length === 1 ? 'place' : 'places'} matched to your filters`
        : `${venues.length} ${venues.length === 1 ? 'place' : 'places'} to try`

  return (
    <div className="fd-page acc-page">
      <section className="fd-hero">
        <header className="page-header fd-page__header acc-page__header">
          <div>
            <h1 className="display fd-page__title">Food &amp; drink</h1>
            <p className="page-sub fd-page__sub">
              Discover cafés, grills, seafood, and local favourites — save spots worth trying on your trip.
            </p>
          </div>
        </header>

        <div className="fd-hero__search-row">
          <div className="acc-page__search fd-hero__search">
            <label className="visually-hidden" htmlFor="fd-search">
              Search venues
            </label>
            <div className="acc-page__search-inner">
              <span className="acc-page__search-icon" aria-hidden>
                ⌕
              </span>
              <input
                id="fd-search"
                type="search"
                className="acc-page__search-input input"
                placeholder="Search food, cafés, grills…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoComplete="off"
                enterKeyHint="search"
              />
              {searchInput ? (
                <button
                  type="button"
                  className="acc-page__search-clear"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="fd-filter-toggle"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            {showFilters ? 'Hide filters' : 'Filters'}
          </button>
        </div>

        {(cuisine || mood) && (
          <div className="fd-active-filters" role="group" aria-label="Active filters">
            {cuisine ? (
              <button
                type="button"
                className="fd-active-filter"
                onClick={() => setCuisine('')}
              >
                {cuisineMeta(cuisine).label} ×
              </button>
            ) : null}
            {mood ? (
              <button type="button" className="fd-active-filter" onClick={() => setMood('')}>
                {MOOD_FILTERS.find((m) => m.id === mood)?.label ?? mood} ×
              </button>
            ) : null}
          </div>
        )}
      </section>

      <div className="fd-moods" role="group" aria-label="Mood filters">
        {MOOD_FILTERS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`fd-mood-chip${mood === m.id ? ' fd-mood-chip--active' : ''}`}
            onClick={() => setMood(mood === m.id ? '' : m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {showFilters && (
        <section className="ev-page__discover card fd-filters-panel" aria-labelledby="fd-discover-title">
          <h2 id="fd-discover-title" className="ev-page__discover-title">
            Match your taste
          </h2>
          <p className="ev-page__discover-sub">Filter by cuisine — combine with mood chips above.</p>
          <div className="ev-page__discover-chips" role="group" aria-label="Cuisines">
            {CUISINE_OPTIONS.map(({ value, label, emoji }) => (
              <button
                key={`fd-discover-${value}`}
                type="button"
                className={`acc-quick-chip ev-page__discover-chip${cuisine === value ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setCuisine(cuisine === value ? '' : value)}
              >
                <span aria-hidden>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="fd-page__layout">
        <main className="fd-page__main">
          {!isLoading && showRichSections && (
            <section className="ev-page__story-rings" aria-labelledby="fd-story-rings-title">
              <div className="ev-page__stories-head">
                <h2 id="fd-story-rings-title" className="ev-page__stories-title">
                  Meet the kitchens
                </h2>
                <span className="ev-page__stories-sub">Tap to open</span>
              </div>
              <div className="ev-page__story-rings-row">
                {featured.map((f, i) => {
                  const meta = cuisineMeta(f.cuisine)
                  return (
                    <button
                      key={`fd-ring-${f.id}`}
                      type="button"
                      className="ev-story-ring"
                      onClick={() => setActiveStoryIdx(i)}
                      aria-label={`Open story for ${f.name}`}
                    >
                      <span className="ev-story-ring__avatar">
                        <img
                          src={foodCoverSrc(f.cover_image, f.cuisine)}
                          alt=""
                          onError={(e) => onFoodImgError(e, f.cuisine)}
                        />
                      </span>
                      <span className="ev-story-ring__label">{f.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {!isLoading && showRichSections && (
            <section className="ev-page__stories" aria-labelledby="fd-stories-title">
              <div className="ev-page__stories-head">
                <h2 id="fd-stories-title" className="ev-page__stories-title">
                  Places worth trying
                </h2>
                <span className="ev-page__stories-sub">Fresh picks from local food spots</span>
              </div>
              <div className="ev-page__stories-row">
                {featured.map((f) => {
                  const meta = cuisineMeta(f.cuisine)
                  const location = f.city ? `${f.city}, ${f.region}` : f.region
                  return (
                    <Link key={`fd-story-${f.id}`} to={`/food/${f.id}`} className="ev-story">
                      <div className="ev-story__img-wrap">
                        <img
                          className="ev-story__img"
                          src={foodCoverSrc(f.cover_image, f.cuisine)}
                          alt=""
                          onError={(e) => onFoodImgError(e, f.cuisine)}
                        />
                      </div>
                      <div className="ev-story__meta">
                        <p className="ev-story__title">{f.name}</p>
                        <p className="ev-story__sub">
                          {meta.emoji} {meta.label} · {location}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {hasFilters && (
            <div className="fd-page__filter-summary">
              <span className="fd-page__filter-text">
                Filtered
                {cuisine ? ` · ${cuisineMeta(cuisine).label}` : ''}
                {mood ? ` · ${MOOD_FILTERS.find((m) => m.id === mood)?.label}` : ''}
                {search ? ` · "${search}"` : ''}
              </span>
              <button type="button" className="fd-page__filter-clear" onClick={clearAll}>
                Clear all
              </button>
            </div>
          )}

          {isLoading && (
            <div className="fd-page__skeleton-wrap" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton fd-page__skeleton-card" />
              ))}
            </div>
          )}

          {!isLoading && venues.length > 0 && (
            <p className="fd-page__results-hint">
              <span className="fd-page__results-label">Popular near you</span>
              <span className="fd-page__results-detail">{resultsDetail}</span>
            </p>
          )}

          {!isLoading && topPick && <FoodFeaturedCard venue={topPick} saved={savedIds.has(topPick.id)} onToggleSave={toggleSaved} />}

          <div className="fd-page__grid">
            {gridVenues.map((f) => (
              <FoodVenueCard key={f.id} venue={f} saved={savedIds.has(f.id)} onToggleSave={toggleSaved} />
            ))}
          </div>

          {!isLoading && venues.length === 0 && (
            <div className="fd-page__empty">
              <p className="fd-page__empty-title">
                {hasFilters ? 'No venues match these filters' : 'No venues listed yet'}
              </p>
              <p className="fd-page__empty-text">
                {hasFilters
                  ? 'Try another cuisine, mood, or search term — new spots are added by local hosts regularly.'
                  : 'Local restaurants and cafés will appear here once they join DELVE.'}
              </p>
              {hasFilters && (
                <>
                  <div className="fd-page__empty-cuisines">
                    {CUISINE_OPTIONS.slice(0, 4).map(({ value, label, emoji }) => (
                      <button
                        key={value}
                        type="button"
                        className="acc-quick-chip"
                        onClick={() => {
                          clearAll()
                          setCuisine(value)
                        }}
                      >
                        {emoji} {label}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="btn btn-primary fd-page__empty-btn" onClick={clearAll}>
                    Show all venues
                  </button>
                </>
              )}
            </div>
          )}
        </main>

        <FoodSidebar
          openCount={openNowCount}
          cuisine={cuisine}
          onCuisineSelect={(v) => setCuisine(cuisine === v ? '' : v)}
          onAreaSelect={(city) => {
            setSearchInput(city)
            setSearch(city)
          }}
        />
      </div>

      {shareMsg ? (
        <p className="fd-page__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      {activeStory && (
        <div
          className="ev-story-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Food story"
          onClick={() => setActiveStoryIdx(null)}
        >
          <div className="ev-story-viewer__card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ev-story-viewer__close"
              aria-label="Close story"
              onClick={() => setActiveStoryIdx(null)}
            >
              ×
            </button>
            <img
              className="ev-story-viewer__img"
              src={foodCoverSrc(activeStory.cover_image, activeStory.cuisine)}
              alt={activeStory.name}
              onError={(e) => onFoodImgError(e, activeStory.cuisine)}
            />
            <div className="ev-story-viewer__meta">
              <div className="ev-story-viewer__progress" aria-hidden>
                <span
                  key={activeStory.id}
                  className="ev-story-viewer__progress-fill"
                  style={{ animationDuration: '15s' }}
                />
              </div>
              <p className="ev-story-viewer__author-row">
                {activeStory.owner_username ? (
                  <Link className="ev-story-viewer__author" to={`/u/${activeStory.owner_username}`}>
                    @{activeStory.owner_display_name?.trim() || activeStory.owner_username}
                  </Link>
                ) : (
                  <span className="ev-story-viewer__author">@food-host</span>
                )}
              </p>
              <p className="ev-story-viewer__title">{activeStory.name}</p>
              <p className="ev-story-viewer__sub">
                {cuisineMeta(activeStory.cuisine).label} · {activeStory.city || activeStory.region}
              </p>
              <div className="ev-story-viewer__social" role="group" aria-label="Story actions">
                <button
                  type="button"
                  className={`ev-story-viewer__react${storyReactions[activeStory.id] === 'love' ? ' ev-story-viewer__react--active' : ''}`}
                  onClick={() => onReactStory(activeStory.id, 'love')}
                  aria-label="React with love"
                >
                  ❤️ {storyReactionCounts[activeStory.id]?.love ?? 0}
                </button>
                <button
                  type="button"
                  className={`ev-story-viewer__react${storyReactions[activeStory.id] === 'fire' ? ' ev-story-viewer__react--active' : ''}`}
                  onClick={() => onReactStory(activeStory.id, 'fire')}
                  aria-label="React with fire"
                >
                  🔥 {storyReactionCounts[activeStory.id]?.fire ?? 0}
                </button>
                <button
                  type="button"
                  className={`ev-story-viewer__react${storyReactions[activeStory.id] === 'wow' ? ' ev-story-viewer__react--active' : ''}`}
                  onClick={() => onReactStory(activeStory.id, 'wow')}
                  aria-label="React with wow"
                >
                  😮 {storyReactionCounts[activeStory.id]?.wow ?? 0}
                </button>
                <button type="button" className="ev-story-viewer__share" onClick={() => onShareStory(activeStory.id)}>
                  Share
                </button>
                <button
                  type="button"
                  className="ev-story-viewer__share"
                  onClick={() => setShowCommentInput((v) => !v)}
                >
                  {showCommentInput ? 'Close comment' : 'Comment'}
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
                      if (e.key === 'Enter') onCommentStory(activeStory.id)
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-ghost ev-story-viewer__comment-send"
                    onClick={() => onCommentStory(activeStory.id)}
                    disabled={!storyDraft.trim()}
                  >
                    Send
                  </button>
                </div>
              )}
              {shareMsg && <p className="ev-story-viewer__share-msg">{shareMsg}</p>}
              {(storyComments[activeStory.id] ?? []).length > 0 && (
                <div className="ev-story-viewer__comments">
                  {(storyComments[activeStory.id] ?? []).map((c, idx) => (
                    <p key={`${activeStory.id}-c-${idx}`} className="ev-story-viewer__comment-item">
                      {c}
                    </p>
                  ))}
                </div>
              )}
              <Link className="btn btn-primary ev-story-viewer__cta" to={`/food/${activeStory.id}`}>
                Open venue details
              </Link>
            </div>
            {featured.length > 1 && (
              <>
                <button
                  type="button"
                  className="ev-story-viewer__nav ev-story-viewer__nav--prev"
                  aria-label="Previous story"
                  onClick={() =>
                    setActiveStoryIdx((idx) =>
                      idx == null ? 0 : (idx - 1 + featured.length) % featured.length,
                    )
                  }
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="ev-story-viewer__nav ev-story-viewer__nav--next"
                  aria-label="Next story"
                  onClick={() => setActiveStoryIdx((idx) => (idx == null ? 0 : (idx + 1) % featured.length))}
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FoodVenueCard({
  venue: f,
  saved,
  onToggleSave,
}: {
  venue: Venue
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const meta = cuisineMeta(f.cuisine)
  const price = priceLabel(f.price_level)
  const location = f.city ? `${f.city}, ${f.region}` : f.region
  const openLabel = foodOpenBadge(f.is_open, f.closes_at)

  return (
    <Link to={`/food/${f.id}`} className="fd-card">
      <div className="fd-card__img-wrap">
        <img
          className="fd-card__img"
          src={foodCoverSrc(f.cover_image, f.cuisine)}
          alt=""
          loading="lazy"
          onError={(e) => onFoodImgError(e, f.cuisine)}
        />
        <button
          type="button"
          className={`acc-media-card__save${saved ? ' acc-media-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save venue'}
          onClick={(e) => onToggleSave(f.id, e)}
        >
          <IconHeart filled={saved} />
        </button>
        {openLabel ? (
          <span className={`fd-card__open-badge${f.is_open === false ? ' fd-card__open-badge--closed' : ''}`}>
            {openLabel}
          </span>
        ) : null}
      </div>
      <div className="fd-card__body">
        <div className="fd-card__top-row">
          <span className="fd-card__cuisine">
            <span aria-hidden>{meta.emoji}</span> {meta.label}
          </span>
          <span className="fd-card__price" aria-label={`Price level: ${price}`}>
            {price}
          </span>
        </div>
        <h2 className="fd-card__name">{f.name}</h2>
        <p className="fd-card__location">📍 {location}</p>
        {f.rating_avg != null && (
          <p className="fd-card__rating">
            ★ {parseFloat(f.rating_avg).toFixed(1)}
            {f.rating_count ? <span className="fd-card__rating-count"> ({f.rating_count})</span> : null}
          </p>
        )}
        {f.popular_dish ? (
          <p className="fd-card__dish">
            Known for: <strong>{f.popular_dish}</strong>
          </p>
        ) : null}
        {venueBlurb(f) ? <p className="fd-card__tagline">{venueBlurb(f)}</p> : null}
        <div className="fd-card__footer">
          <p className="fd-card__rate-row">
            <span className="fd-card__rate-from">From</span>
            <strong className="fd-card__rate-amount">{price}</strong>
            <span className="fd-card__rate-unit"> typical</span>
          </p>
          <span className="fd-card__book">View place</span>
        </div>
      </div>
    </Link>
  )
}

function FoodFeaturedCard({
  venue: f,
  saved,
  onToggleSave,
}: {
  venue: Venue
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const meta = cuisineMeta(f.cuisine)
  const location = f.city ? `${f.city}, ${f.region}` : f.region
  const price = priceLabel(f.price_level)
  const langs = meta.label

  return (
    <Link to={`/food/${f.id}`} className="fd-featured">
      <div className="fd-featured__media">
        <img
          src={foodCoverSrc(f.cover_image, f.cuisine)}
          alt=""
          loading="lazy"
          onError={(e) => onFoodImgError(e, f.cuisine)}
        />
        <button
          type="button"
          className={`acc-media-card__save fd-featured__save${saved ? ' acc-media-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save venue'}
          onClick={(e) => onToggleSave(f.id, e)}
        >
          <IconHeart filled={saved} />
        </button>
        {f.is_open === true ? <span className="fd-card__open-badge">Open now</span> : null}
      </div>
      <div className="fd-featured__body">
        <span className="fd-featured__badge">Featured today</span>
        <h2 className="fd-featured__name">{f.name}</h2>
        <p className="fd-featured__meta">
          {meta.emoji} {langs} · {location}
          {f.rating_avg ? ` · ★ ${parseFloat(f.rating_avg).toFixed(1)}` : ''}
        </p>
        <p className="fd-featured__desc">
          {venueBlurb(f) || f.popular_dish || 'A local favourite worth booking ahead.'}
        </p>
        <p className="fd-featured__price">
          {price} · {f.is_open === true ? 'Open now' : 'Check hours'}
        </p>
        <span className="fd-featured__cta">View place →</span>
      </div>
    </Link>
  )
}

function FoodSidebar({
  openCount,
  cuisine,
  onCuisineSelect,
  onAreaSelect,
}: {
  openCount: number
  cuisine: string
  onCuisineSelect: (value: string) => void
  onAreaSelect: (city: string) => void
}) {
  const cuisineMap: Record<string, string> = {
    Grill: 'grill',
    'Café': 'cafe',
    Seafood: 'seafood',
    Bakery: 'bakery',
    Pizza: 'pizza',
    Bar: 'bar',
  }

  return (
    <aside className="fd-page__sidebar" aria-label="Food discovery">
      <section className="fd-side-card">
        <h2 className="fd-side-card__title">Popular cuisines</h2>
        <ul className="fd-side-card__list">
          {SIDEBAR_CUISINES.map((label) => {
            const value = cuisineMap[label]
            return (
              <li key={label}>
                <button
                  type="button"
                  className={`fd-side-card__link${cuisine === value ? ' fd-side-card__link--active' : ''}`}
                  onClick={() => onCuisineSelect(value)}
                >
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="fd-side-card">
        <h2 className="fd-side-card__title">Food pulse</h2>
        <ul className="fd-side-card__stats">
          <li>
            <span className="fd-side-card__stat-n">{openCount || 12}</span>
            <span className="fd-side-card__stat-l">places open now</span>
          </li>
          <li>
            <span className="fd-side-card__stat-n">8</span>
            <span className="fd-side-card__stat-l">local favourites</span>
          </li>
          <li>
            <span className="fd-side-card__stat-n">3</span>
            <span className="fd-side-card__stat-l">new this week</span>
          </li>
        </ul>
      </section>

      <section className="fd-side-card">
        <h2 className="fd-side-card__title">Top areas</h2>
        <ul className="fd-side-card__list">
          {TOP_AREAS.map((a) => (
            <li key={a.city}>
              <button type="button" className="fd-side-card__link" onClick={() => onAreaSelect(a.city)}>
                {a.city}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
