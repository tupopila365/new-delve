import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { EmptyState, ListSkeleton } from '../components/ui'
import { MarketplaceHero, QuickFilterChips } from '../components/marketplace'

type Ev = {
  id: number
  title: string
  category: string
  starts_at: string
  ends_at?: string | null
  venue: string
  region: string
  city?: string | null
  cover_image: string | null
  organizer_username?: string
  organizer_display_name?: string | null
  is_free?: boolean | null
  price?: string | null
}

const SIDEBAR_CATEGORIES: { label: string; value: string }[] = [
  { label: 'Music', value: 'music' },
  { label: 'Sports', value: 'sports' },
  { label: 'Culture', value: 'culture' },
  { label: 'Food & drink', value: 'food' },
  { label: 'Business', value: 'business' },
]

const TOP_AREAS = ['Windhoek', 'Swakopmund', 'Walvis Bay'] as const

const CATEGORY_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'sports', label: 'Sports', emoji: '🏆' },
  { value: 'culture', label: 'Culture', emoji: '🎭' },
  { value: 'business', label: 'Business', emoji: '💼' },
  { value: 'food', label: 'Food & drink', emoji: '🍽' },
  { value: 'other', label: 'Other', emoji: '✨' },
]

function categoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value) ?? { label: value, emoji: '✨' }
}

function formatEventDate(iso: string): { day: string; month: string; time: string; full: string } {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-NA', { day: 'numeric' }),
    month: d.toLocaleDateString('en-NA', { month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' }),
  }
}

export function EventsList() {
  const { profile } = useAuth()
  const [category, setCategory] = useState('')
  const [whenFilter, setWhenFilter] = useState('')
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
    if (category) p.set('category', category)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [category, search])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['events', qs],
    queryFn: () => apiFetch<Ev[]>(`/api/events/${qs}`, { auth: false }),
  })
  const events = data ?? []

  const displayEvents = useMemo(() => {
    let list = events
    const now = new Date()
    if (whenFilter === 'today') {
      list = list.filter((e) => {
        const d = new Date(e.starts_at)
        return d.toDateString() === now.toDateString()
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
        return d >= sat && d < mon
      })
    }
    if (whenFilter === 'free') list = list.filter((e) => e.is_free)
    return list
  }, [events, whenFilter])

  const featured = displayEvents.slice(0, 5)
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

  const onReactStory = (eventId: number, reaction: 'love' | 'fire' | 'wow') => {
    const prevReaction = storyReactions[eventId] ?? null
    const nextReaction = prevReaction === reaction ? null : reaction
    setStoryReactions((prev) => ({ ...prev, [eventId]: nextReaction }))
    setStoryReactionCounts((prev) => {
      const cur = prev[eventId] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prevReaction) out[prevReaction] = Math.max(0, out[prevReaction] - 1)
      if (nextReaction) out[nextReaction] += 1
      return { ...prev, [eventId]: out }
    })
  }

  const onShareStory = async (eventId: number) => {
    const url = `${window.location.origin}/events/${eventId}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const onCommentStory = (eventId: number) => {
    const body = storyDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'You'
    setStoryComments((prev) => ({
      ...prev,
      [eventId]: [`${author}: ${body}`, ...(prev[eventId] ?? [])].slice(0, 8),
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
      return t >= now && t <= now + weekMs
    }).length
  }, [events])

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'popular-categories',
        title: 'Popular categories',
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

  return (
    <div className="ev-page acc-page disc-page mk-page">
      <MarketplaceHero
        title="Events happening around you"
        subtitle="Discover concerts, markets, sports, culture, food events, meetups, and local experiences."
        action={
          profile ? (
            <Link to="/events/new" className="btn btn-primary ev-page__create-btn">
              + Create event
            </Link>
          ) : undefined
        }
      />

      <QuickFilterChips
        ariaLabel="Event quick filters"
        chips={[
          { id: 'today', label: 'Today', emoji: '📅', active: whenFilter === 'today' },
          { id: 'weekend', label: 'This weekend', emoji: '🎉', active: whenFilter === 'weekend' },
          { id: 'free', label: 'Free', emoji: '🎟', active: whenFilter === 'free' },
          { id: 'music', label: 'Music', emoji: '🎵', active: category === 'music' },
          { id: 'culture', label: 'Culture', emoji: '🎭', active: category === 'culture' },
          { id: 'food', label: 'Food', emoji: '🍽', active: category === 'food' },
        ]}
        onChipClick={(id) => {
          if (id === 'today' || id === 'weekend' || id === 'free') {
            setWhenFilter((v) => (v === id ? '' : id))
            return
          }
          setCategory((c) => (c === id ? '' : id))
        }}
      />

      <section className="ev-page__discover card" aria-labelledby="ev-discover-title">
        <h2 id="ev-discover-title" className="ev-page__discover-title">
          Discover what&apos;s on
        </h2>
        <p className="ev-page__discover-sub">
          Browse like a social feed — save ideas, filter quickly, and jump into plans.
        </p>
        <div className="ev-page__discover-chips" role="group" aria-label="Quick discovery picks">
          {CATEGORY_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={`discover-${value}`}
              type="button"
              className={`acc-quick-chip ev-page__discover-chip${category === value ? ' acc-quick-chip--active' : ''}`}
              onClick={() => setCategory(category === value ? '' : value)}
            >
              <span aria-hidden>{emoji}</span> {label}
            </button>
          ))}
        </div>
      </section>

      <div className="acc-page__search">
        <label className="visually-hidden" htmlFor="ev-search">
          Search events
        </label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon" aria-hidden>⌕</span>
          <input
            id="ev-search"
            type="search"
            className="acc-page__search-input input"
            placeholder="Search events, venues, organisers…"
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

      <div className="disc-page__layout">
        <main className="disc-page__main">
      {!isLoading && featured.length > 0 && (
        <section className="ev-page__story-rings" aria-labelledby="ev-story-rings-title">
          <div className="ev-page__stories-head">
            <h2 id="ev-story-rings-title" className="ev-page__stories-title">
              Stories
            </h2>
            <span className="ev-page__stories-sub">Tap to open</span>
          </div>
          <div className="ev-page__story-rings-row">
            {featured.map((e, i) => {
              const cat = categoryLabel(e.category)
              return (
                <button
                  key={`ring-${e.id}`}
                  type="button"
                  className="ev-story-ring"
                  onClick={() => setActiveStoryIdx(i)}
                  aria-label={`Open story for ${e.title}`}
                >
                  <span className="ev-story-ring__avatar">
                    {e.cover_image ? (
                      <img src={mediaUrl(e.cover_image) || ''} alt="" />
                    ) : (
                      <span className="ev-story-ring__fallback" aria-hidden>
                        {cat.emoji}
                      </span>
                    )}
                  </span>
                  <span className="ev-story-ring__label">{e.title}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {!isLoading && featured.length > 0 && (
        <section className="ev-page__stories" aria-labelledby="ev-stories-title">
          <div className="ev-page__stories-head">
            <h2 id="ev-stories-title" className="ev-page__stories-title">
              Trending now
            </h2>
            <span className="ev-page__stories-sub">Swipe to explore</span>
          </div>
          <div className="ev-page__stories-row">
            {featured.map((e) => {
              const cat = categoryLabel(e.category)
              const when = formatEventDate(e.starts_at)
              return (
                <Link key={`story-${e.id}`} to={`/events/${e.id}`} className="ev-story">
                  <div className="ev-story__img-wrap">
                    {e.cover_image ? (
                      <img className="ev-story__img" src={mediaUrl(e.cover_image) || ''} alt="" />
                    ) : (
                      <div className="ev-story__img ev-story__img--placeholder">
                        <span aria-hidden>{cat.emoji}</span>
                      </div>
                    )}
                  </div>
                  <div className="ev-story__meta">
                    <p className="ev-story__title">{e.title}</p>
                    <p className="ev-story__sub">
                      {cat.emoji} {cat.label} · {when.full}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Active filter summary + clear */}
      {hasFilters && (
        <div className="ev-page__filter-summary">
          <span className="ev-page__filter-summary-text">
            Filtered
            {category ? ` · ${categoryLabel(category).label}` : ''}
            {search ? ` · "${search}"` : ''}
          </span>
          <button type="button" className="ev-page__filter-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {isError && (
        <EmptyState
          icon="🎟"
          title="We couldn't load events"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      )}

      {/* Loading */}
      {isLoading && !isError && <ListSkeleton count={3} />}

      {/* Results count */}
      {!isLoading && !isError && displayEvents.length > 0 && (
        <p className="ev-page__results-hint">
          {displayEvents.length} {displayEvents.length === 1 ? 'event' : 'events'}
        </p>
      )}

      {/* Events grid */}
      <div className="ev-page__grid">
        {displayEvents.map((e) => {
          const { day, month, time, full } = formatEventDate(e.starts_at)
          const cat = categoryLabel(e.category)
          const saved = savedIds.has(e.id)
          return (
            <Link key={e.id} to={`/events/${e.id}`} className="ev-card">
              {/* Image with date badge */}
              <div className="ev-card__img-wrap">
                {e.cover_image ? (
                  <img
                    className="ev-card__img"
                    src={mediaUrl(e.cover_image) || ''}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="ev-card__img ev-card__img--placeholder">
                    <span aria-hidden>{cat.emoji}</span>
                  </div>
                )}
                {/* Date badge */}
                <div className="ev-card__date-badge" aria-hidden>
                  <span className="ev-card__date-month">{month}</span>
                  <span className="ev-card__date-day">{day}</span>
                </div>
                {/* Save button */}
                <button
                  type="button"
                  className={`acc-media-card__save${saved ? ' acc-media-card__save--saved' : ''}`}
                  aria-label={saved ? 'Remove from saved' : 'Save event'}
                  onClick={(e2) => toggleSaved(e.id, e2)}
                >
                  <IconBookmark filled={saved} />
                </button>
                {/* Free badge */}
                {e.is_free && (
                  <span className="ev-card__free-badge">Free</span>
                )}
              </div>

              {/* Card body */}
              <div className="ev-card__body">
                <p className="ev-card__cat">
                  <span aria-hidden>{cat.emoji}</span> {cat.label}
                </p>
                <h2 className="ev-card__title">{e.title}</h2>
                <p className="ev-card__time">
                  {full} · {time}
                </p>
                <p className="ev-card__venue">
                  📍 {e.venue || 'Venue TBA'}
                  {(e.city || e.region) ? `, ${e.city || e.region}` : ''}
                </p>
                {e.price && !e.is_free ? (
                  <p className="ev-card__price">From N${e.price}</p>
                ) : null}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Empty state */}
      {!isLoading && displayEvents.length === 0 && (
        <EmptyState
          icon="🎟"
          title={hasFilters ? 'No events match these filters' : 'No upcoming events yet'}
          sub={
            hasFilters
              ? 'Try another category or search term — new events are added regularly.'
              : "Check back soon — organisers post events here as they're confirmed."
          }
          action={
            hasFilters ? (
              <>
                <div className="ev-page__empty-cats">
                  {CATEGORY_OPTIONS.slice(0, 3).map(({ value, label, emoji }) => (
                    <button
                      key={value}
                      type="button"
                      className="acc-quick-chip"
                      onClick={() => {
                        clearAll()
                        setCategory(value)
                      }}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn btn-primary ui-empty__cta" onClick={clearAll}>
                  Show all events
                </button>
              </>
            ) : undefined
          }
        />
      )}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Events discovery" />
      </div>

      {activeStory && (
        <div
          className="ev-story-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Event story"
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
                alt={activeStory.title}
              />
            ) : (
              <div className="ev-story-viewer__img ev-story-viewer__img--placeholder">
                <span aria-hidden>{categoryLabel(activeStory.category).emoji}</span>
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
                {activeStory.organizer_username ? (
                  <Link
                    className="ev-story-viewer__author"
                    to={`/u/${activeStory.organizer_username}`}
                  >
                    @{activeStory.organizer_display_name?.trim() || activeStory.organizer_username}
                  </Link>
                ) : (
                  <span className="ev-story-viewer__author">@event-host</span>
                )}
              </p>
              <p className="ev-story-viewer__title">{activeStory.title}</p>
              <p className="ev-story-viewer__sub">
                {formatEventDate(activeStory.starts_at).full} · {activeStory.venue}
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
                <button
                  type="button"
                  className="ev-story-viewer__share"
                  onClick={() => onShareStory(activeStory.id)}
                >
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
              <Link className="btn btn-primary ev-story-viewer__cta" to={`/events/${activeStory.id}`}>
                Open event details
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

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
