import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Venue = {
  id: number
  name: string
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
}

const CUISINE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'local', label: 'Local', emoji: '🍖' },
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

function cuisineMeta(value: string) {
  return CUISINE_OPTIONS.find((c) => c.value === value) ?? { label: value, emoji: '🍽' }
}

function priceLabel(level: number): string {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)))
}

export function FoodList() {
  const { profile } = useAuth()
  const [cuisine, setCuisine] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
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
  const venues = data ?? []
  const featured = venues.slice(0, 6)
  const activeStory = activeStoryIdx != null ? featured[activeStoryIdx] : null

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

  const hasFilters = !!(cuisine || search)

  const clearAll = () => {
    setCuisine('')
    setSearchInput('')
    setSearch('')
  }

  return (
    <div className="fd-page acc-page">
      <header className="page-header fd-page__header acc-page__header">
        <div>
          <h1 className="display fd-page__title">Food &amp; drink</h1>
          <p className="page-sub fd-page__sub">
            A discovery feed for cafés, grills, seafood spots, and local favorites.
          </p>
        </div>
      </header>

      <section className="ev-page__discover card" aria-labelledby="fd-discover-title">
        <h2 id="fd-discover-title" className="ev-page__discover-title">
          Discover where to eat
        </h2>
        <p className="ev-page__discover-sub">
          Explore like a social feed — open stories, react, share, and save your next stop.
        </p>
        <div className="ev-page__discover-chips" role="group" aria-label="Quick cuisine picks">
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

      <div className="acc-page__search">
        <label className="visually-hidden" htmlFor="fd-search">
          Search venues
        </label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon" aria-hidden>⌕</span>
          <input
            id="fd-search"
            type="search"
            className="acc-page__search-input input"
            placeholder="Search by name, cuisine, or area…"
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

      {!isLoading && featured.length > 0 && (
        <section className="ev-page__story-rings" aria-labelledby="fd-story-rings-title">
          <div className="ev-page__stories-head">
            <h2 id="fd-story-rings-title" className="ev-page__stories-title">
              Stories
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
                    {f.cover_image ? (
                      <img src={mediaUrl(f.cover_image) || ''} alt="" />
                    ) : (
                      <span className="ev-story-ring__fallback" aria-hidden>
                        {meta.emoji}
                      </span>
                    )}
                  </span>
                  <span className="ev-story-ring__label">{f.name}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {!isLoading && featured.length > 0 && (
        <section className="ev-page__stories" aria-labelledby="fd-stories-title">
          <div className="ev-page__stories-head">
            <h2 id="fd-stories-title" className="ev-page__stories-title">
              Trending now
            </h2>
            <span className="ev-page__stories-sub">Swipe to explore</span>
          </div>
          <div className="ev-page__stories-row">
            {featured.map((f) => {
              const meta = cuisineMeta(f.cuisine)
              const location = f.city ? `${f.city}, ${f.region}` : f.region
              return (
                <Link key={`fd-story-${f.id}`} to={`/food/${f.id}`} className="ev-story">
                  <div className="ev-story__img-wrap">
                    {f.cover_image ? (
                      <img className="ev-story__img" src={mediaUrl(f.cover_image) || ''} alt="" />
                    ) : (
                      <div className="ev-story__img ev-story__img--placeholder">
                        <span aria-hidden>{meta.emoji}</span>
                      </div>
                    )}
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

      {/* Active filter summary */}
      {hasFilters && (
        <div className="fd-page__filter-summary">
          <span className="fd-page__filter-text">
            Filtered
            {cuisine ? ` · ${cuisineMeta(cuisine).label}` : ''}
            {search ? ` · "${search}"` : ''}
          </span>
          <button type="button" className="fd-page__filter-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="fd-page__skeleton-wrap" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton fd-page__skeleton-card" />
          ))}
        </div>
      )}

      {/* Count */}
      {!isLoading && venues.length > 0 && (
        <p className="fd-page__results-hint">
          {venues.length} {venues.length === 1 ? 'venue' : 'venues'}
        </p>
      )}

      {/* Grid */}
      <div className="fd-page__grid">
        {venues.map((f) => {
          const meta = cuisineMeta(f.cuisine)
          const saved = savedIds.has(f.id)
          const price = priceLabel(f.price_level)
          const location = f.city ? `${f.city}, ${f.region}` : f.region

          return (
            <Link key={f.id} to={`/food/${f.id}`} className="fd-card">
              <div className="fd-card__img-wrap">
                {f.cover_image ? (
                  <img
                    className="fd-card__img"
                    src={mediaUrl(f.cover_image) || ''}
                    alt=""
                  />
                ) : (
                  <div className="fd-card__img fd-card__img--placeholder">
                    <span aria-hidden>{meta.emoji}</span>
                  </div>
                )}
                {/* Save button */}
                <button
                  type="button"
                  className={`acc-media-card__save${saved ? ' acc-media-card__save--saved' : ''}`}
                  aria-label={saved ? 'Remove from saved' : 'Save venue'}
                  onClick={(e) => toggleSaved(f.id, e)}
                >
                  <IconHeart filled={saved} />
                </button>
                {/* Open badge */}
                {f.is_open === true && (
                  <span className="fd-card__open-badge">Open now</span>
                )}
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
                {f.tagline && <p className="fd-card__tagline">{f.tagline}</p>}
                <p className="fd-card__location">📍 {location}</p>
                {f.rating_avg != null && (
                  <p className="fd-card__rating">
                    ★ {parseFloat(f.rating_avg).toFixed(1)}
                    {f.rating_count ? (
                      <span className="fd-card__rating-count"> ({f.rating_count})</span>
                    ) : null}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Empty state */}
      {!isLoading && venues.length === 0 && (
        <div className="fd-page__empty">
          <p className="fd-page__empty-title">
            {hasFilters ? 'No venues match these filters' : 'No venues listed yet'}
          </p>
          <p className="fd-page__empty-text">
            {hasFilters
              ? 'Try a different cuisine or search term — new spots are added by local hosts regularly.'
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
                    onClick={() => { clearAll(); setCuisine(value) }}
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
            {activeStory.cover_image ? (
              <img
                className="ev-story-viewer__img"
                src={mediaUrl(activeStory.cover_image) || ''}
                alt={activeStory.name}
              />
            ) : (
              <div className="ev-story-viewer__img ev-story-viewer__img--placeholder">
                <span aria-hidden>{cuisineMeta(activeStory.cuisine).emoji}</span>
              </div>
            )}
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
