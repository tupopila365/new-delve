import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mockTrips, type MockTrip } from '../data/mockTrips'

const TAG_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: '4x4', label: '4×4 / Offroad', emoji: '🚙' },
  { value: 'budget', label: 'Budget', emoji: '💸' },
  { value: 'solo', label: 'Solo', emoji: '🧭' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'wildlife', label: 'Wildlife', emoji: '🐘' },
  { value: 'coast', label: 'Coast', emoji: '🌊' },
  { value: 'hiking', label: 'Hiking', emoji: '🥾' },
  { value: 'photography', label: 'Photography', emoji: '📷' },
]

const BUDGET_BUCKETS = [
  { label: 'Under N$2k', min: 0, max: 2000 },
  { label: 'N$2–5k', min: 2000, max: 5000 },
  { label: 'N$5–12k', min: 5000, max: 12000 },
  { label: 'N$12k+', min: 12000, max: Infinity },
]

const PARTY_EMOJI: Record<string, string> = { solo:'🧭', couple:'💑', family:'👨‍👩‍👧', group:'🙌' }

function partyLabel(p: MockTrip['party']) {
  return { label: p, emoji: PARTY_EMOJI[p] ?? '👤' }
}

function dayLabel(n: number) {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

function perDayLabel(trip: MockTrip) {
  if (!trip.days) return null
  return Math.round(trip.total_cost / trip.days)
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

export function TripsList() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<(typeof BUDGET_BUCKETS)[number] | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set(
    mockTrips.filter((t) => t.liked_by_me).map((t) => t.id),
  ))
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>(
    Object.fromEntries(mockTrips.map((t) => [t.id, t.likes_count])),
  )

  // Story viewer state
  const [activeStoryIdx, setActiveStoryIdx]     = useState<number | null>(null)
  const [storyReactions, setStoryReactions]     = useState<Record<number, 'love'|'fire'|'wow'|null>>({})
  const [storyReactionCounts, setStoryReactionCounts] = useState<Record<number,{love:number;fire:number;wow:number}>>({})
  const [storyComments, setStoryComments]       = useState<Record<number, string[]>>({})
  const [storyDraft, setStoryDraft]             = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [storyShareMsg, setStoryShareMsg]       = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const filtered = useMemo(() => {
    return mockTrips.filter((t) => {
      if (selectedTag && !t.tags.includes(selectedTag)) return false
      if (selectedBucket) {
        if (t.total_cost < selectedBucket.min || t.total_cost >= selectedBucket.max) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const hay = [
          t.title, t.summary, t.author.display_name,
          ...t.stops.map((s) => s.place_name),
          ...t.countries,
          ...t.tags,
        ].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [search, selectedTag, selectedBucket])

  const featured = useMemo(() => filtered.slice(0, 5), [filtered])

  // Keyboard navigation for story viewer
  useEffect(() => {
    if (activeStoryIdx == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     setActiveStoryIdx(null)
      if (e.key === 'ArrowRight') setActiveStoryIdx(i => i == null ? 0 : (i + 1) % featured.length)
      if (e.key === 'ArrowLeft')  setActiveStoryIdx(i => i == null ? 0 : (i - 1 + featured.length) % featured.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoryIdx])

  // Auto-advance story after 12 s
  useEffect(() => {
    if (activeStoryIdx == null || featured.length === 0) return
    const t = window.setTimeout(() => {
      setActiveStoryIdx(i => {
        if (i == null) return null
        return i >= featured.length - 1 ? null : i + 1
      })
    }, 12000)
    return () => window.clearTimeout(t)
  }, [activeStoryIdx, featured.length])

  // Reset comment input when story changes
  useEffect(() => {
    if (activeStoryIdx == null) { setStoryDraft(''); setShowCommentInput(false); return }
    const id = featured[activeStoryIdx]?.id
    if (id == null) return
    setStoryReactionCounts(prev => prev[id] ? prev : { ...prev, [id]: { love:0, fire:0, wow:0 } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoryIdx])

  // Share msg timeout
  useEffect(() => {
    if (!storyShareMsg) return
    const t = window.setTimeout(() => setStoryShareMsg(''), 1600)
    return () => window.clearTimeout(t)
  }, [storyShareMsg])

  const onReactStory = (tripId: number, r: 'love'|'fire'|'wow') => {
    const prev = storyReactions[tripId] ?? null
    const next = prev === r ? null : r
    setStoryReactions(s => ({ ...s, [tripId]: next }))
    setStoryReactionCounts(s => {
      const cur = s[tripId] ?? { love:0, fire:0, wow:0 }
      const out = { ...cur }
      if (prev) out[prev] = Math.max(0, out[prev] - 1)
      if (next) out[next] += 1
      return { ...s, [tripId]: out }
    })
  }

  const onShareStory = async (tripId: number) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/journeys/${tripId}`); setStoryShareMsg('Link copied') }
    catch { setStoryShareMsg('Copy failed') }
  }

  const onCommentStory = (tripId: number) => {
    const body = storyDraft.trim()
    if (!body) return
    setStoryComments(prev => ({ ...prev, [tripId]: [`You: ${body}`, ...(prev[tripId] ?? [])].slice(0, 8) }))
    setStoryDraft('')
  }

  const hasFilters = !!(selectedTag || selectedBucket || search)

  const clearAll = () => {
    setSelectedTag('')
    setSelectedBucket(null)
    setSearchInput('')
    setSearch('')
  }

  const toggleSave = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSavedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLikedIds((prev) => {
      const next = new Set(prev)
      const wasLiked = next.has(id)
      wasLiked ? next.delete(id) : next.add(id)
      setLikeCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + (wasLiked ? -1 : 1) }))
      return next
    })
  }

  return (
    <div className="ev-page acc-page jn-page">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="page-header ev-page__header acc-page__header">
        <div>
          <h1 className="display ev-page__title">Journeys</h1>
          <p className="page-sub ev-page__sub">
            Real travel diaries from real people — places, prices, moments.
          </p>
        </div>
      </header>

      {/* ── Discover card ──────────────────────────────── */}
      <section className="ev-page__discover card" aria-labelledby="jn-discover-title">
        <h2 id="jn-discover-title" className="ev-page__discover-title">What kind of trip?</h2>
        <p className="ev-page__discover-sub">
          Filter by style, budget, or party size — or search a place below.
        </p>
        <div className="ev-page__discover-chips" role="group" aria-label="Trip style">
          {TAG_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              type="button"
              className={`acc-quick-chip ev-page__discover-chip${selectedTag === value ? ' acc-quick-chip--active' : ''}`}
              aria-pressed={selectedTag === value}
              onClick={() => setSelectedTag(selectedTag === value ? '' : value)}
            >
              <span aria-hidden>{emoji}</span> {label}
            </button>
          ))}
        </div>
        <div className="ev-page__discover-chips jn-page__budget-chips" role="group" aria-label="Budget range" style={{ marginTop: 12, borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
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
                💸 {b.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="acc-page__search">
        <label className="visually-hidden" htmlFor="jn-search">Search trips</label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon" aria-hidden>⌕</span>
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
            <button type="button" className="acc-page__search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">×</button>
          )}
        </div>
      </div>


      {/* ── Filter summary ─────────────────────────────── */}
      {hasFilters && (
        <div className="ev-page__filter-summary">
          <span className="ev-page__filter-summary-text">
            Filtered
            {selectedTag ? ` · ${TAG_OPTIONS.find((t) => t.value === selectedTag)?.label}` : ''}
            {selectedBucket ? ` · ${selectedBucket.label}` : ''}
            {search ? ` · "${search}"` : ''}
          </span>
          <button type="button" className="ev-page__filter-clear" onClick={clearAll}>Clear all</button>
        </div>
      )}

      {/* ── Stories rings ──────────────────────────────── */}
      {featured.length > 0 && (
        <section className="ev-page__story-rings" aria-labelledby="jn-rings-title">
          <div className="ev-page__stories-head">
            <h2 id="jn-rings-title" className="ev-page__stories-title">Recent journeys</h2>
            <span className="ev-page__stories-sub">Tap to open</span>
          </div>
          <div className="ev-page__story-rings-row">
            {featured.map((t, i) => (
              <button
                key={`jn-ring-${t.id}`}
                type="button"
                className="ev-story-ring"
                aria-label={`Open story: ${t.title}`}
                onClick={() => setActiveStoryIdx(i)}
              >
                <span className="ev-story-ring__avatar">
                  {t.cover_image ? (
                    <img src={t.cover_image} alt="" />
                  ) : (
                    <span className="ev-story-ring__fallback" aria-hidden>🗺</span>
                  )}
                </span>
                <span className="ev-story-ring__label">{t.author.display_name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending now rail ──────────────────────────── */}
      {featured.length > 0 && (
        <section className="ev-page__stories" aria-labelledby="jn-trending-title">
          <div className="ev-page__stories-head">
            <h2 id="jn-trending-title" className="ev-page__stories-title">Trending diaries</h2>
            <span className="ev-page__stories-sub">Swipe to explore</span>
          </div>
          <div className="ev-page__stories-row">
            {featured.map((t) => (
              <Link key={`jn-trend-${t.id}`} to={`/journeys/${t.id}`} className="ev-story">
                <div className="ev-story__img-wrap">
                  {t.cover_image ? (
                    <img className="ev-story__img" src={t.cover_image} alt="" />
                  ) : (
                    <div className="ev-story__img ev-story__img--placeholder"><span aria-hidden>🗺</span></div>
                  )}
                </div>
                <div className="ev-story__meta">
                  <p className="ev-story__title">{t.title}</p>
                  <p className="ev-story__sub">
                    {t.countries.map(stopCountry).join(' ')} · {dayLabel(t.days)} · N${t.total_cost.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Results hint ───────────────────────────────── */}
      {filtered.length > 0 && (
        <p className="ev-page__results-hint">
          {filtered.length} {filtered.length === 1 ? 'diary' : 'diaries'}
        </p>
      )}

      {/* ── Trip cards ─────────────────────────────────── */}
      <div className="jn-page__grid">
        {filtered.map((t) => {
          const liked = likedIds.has(t.id)
          const saved = savedIds.has(t.id)
          const party = partyLabel(t.party)
          const perDay = perDayLabel(t)
          return (
            <Link key={t.id} to={`/journeys/${t.id}`} className="jn-card card">
              {/* Cover */}
              <div className="jn-card__img-wrap">
                {t.cover_image ? (
                  <img className="jn-card__img" src={t.cover_image} alt="" />
                ) : (
                  <div className="jn-card__img jn-card__placeholder"><span aria-hidden>🗺</span></div>
                )}
                {/* Countries */}
                <div className="jn-card__country-row">
                  {t.countries.map((c) => (
                    <span key={c} className="jn-card__country-flag">{stopCountry(c)}</span>
                  ))}
                </div>
                {/* Save */}
                <button
                  type="button"
                  className={`acc-media-card__save${saved ? ' acc-media-card__save--saved' : ''}`}
                  aria-label={saved ? 'Remove from saved' : 'Save journey'}
                  onClick={(e) => toggleSave(t.id, e)}
                >
                  <IconBookmark filled={saved} />
                </button>
              </div>

              {/* Body */}
              <div className="jn-card__body">
                {/* Author */}
                <div className="jn-card__author">
                  {t.author.avatar ? (
                    <img className="jn-card__avatar" src={t.author.avatar} alt="" />
                  ) : (
                    <span className="jn-card__avatar jn-card__avatar--init">
                      {t.author.display_name.charAt(0)}
                    </span>
                  )}
                  <span className="jn-card__author-name">{t.author.display_name}</span>
                </div>

                <h2 className="jn-card__title">{t.title}</h2>

                {/* Route */}
                <p className="jn-card__route">📍 {routeLabel(t)}</p>

                {/* Meta pills */}
                <div className="jn-card__pills">
                  <span className="jn-card__pill">
                    {party.emoji} {party.label}
                  </span>
                  <span className="jn-card__pill">🗓 {dayLabel(t.days)}</span>
                  {t.transport_modes.slice(0, 2).map((m) => (
                    <span key={m} className="jn-card__pill">{modeEmoji(m)} {m}</span>
                  ))}
                </div>

                {/* Tags */}
                {t.tags.length > 0 && (
                  <div className="jn-card__tags">
                    {t.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="jn-card__tag">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Cost */}
                <div className="jn-card__cost-row">
                  <div>
                    <span className="jn-card__cost-total">N${t.total_cost.toLocaleString()}</span>
                    <span className="jn-card__cost-label"> total</span>
                  </div>
                  {perDay != null && (
                    <span className="jn-card__cost-per">≈ N${perDay.toLocaleString()}/day</span>
                  )}
                </div>

                {/* Social */}
                <div className="jn-card__social">
                  <button
                    type="button"
                    className={`jn-card__action${liked ? ' jn-card__action--active' : ''}`}
                    aria-label={liked ? 'Unlike' : 'Like'}
                    onClick={(e) => toggleLike(t.id, e)}
                  >
                    <IconHeart filled={liked} />
                    <span>{likeCounts[t.id] ?? t.likes_count}</span>
                  </button>
                  <span className="jn-card__action jn-card__action--muted">
                    <IconComment />
                    <span>{t.comments_count}</span>
                  </span>
                  <span className="jn-card__action jn-card__action--muted">
                    <IconSave />
                    <span>{t.saves_count + (saved ? 1 : 0)}</span>
                  </span>
                  <span className="jn-card__stop-count">
                    {t.stops.length} {t.stops.length === 1 ? 'stop' : 'stops'}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Empty state ────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="ev-page__empty">
          <p className="ev-page__empty-title">No journeys match</p>
          <p className="ev-page__empty-text">
            Try a different style, budget, or clear the filters to browse all diaries.
          </p>
          {hasFilters && (
            <button type="button" className="btn btn-primary ev-page__empty-btn" onClick={clearAll}>
              Show all journeys
            </button>
          )}
        </div>
      )}

      {/* ── Story viewer overlay ────────────────────────── */}
      {activeStoryIdx != null && featured[activeStoryIdx] && (() => {
        const trip = featured[activeStoryIdx]
        const rc   = storyReactionCounts[trip.id] ?? { love:0, fire:0, wow:0 }
        return (
          <div
            className="ev-story-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Journey story"
            onClick={() => setActiveStoryIdx(null)}
          >
            <div className="ev-story-viewer__card" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className="ev-story-viewer__close"
                aria-label="Close"
                onClick={() => setActiveStoryIdx(null)}
              >×</button>

              {trip.cover_image ? (
                <img
                  className="ev-story-viewer__img"
                  src={trip.cover_image}
                  alt={trip.title}
                />
              ) : (
                <div className="ev-story-viewer__img ev-story-viewer__img--placeholder">
                  <span aria-hidden>🗺</span>
                </div>
              )}

              <div className="ev-story-viewer__meta">
                <div className="ev-story-viewer__progress" aria-hidden>
                  <span key={trip.id} className="ev-story-viewer__progress-fill" style={{ animationDuration: '12s' }} />
                </div>

                <p className="ev-story-viewer__author-row">
                  <span className="ev-story-viewer__author">{trip.author.display_name}</span>
                </p>

                <p className="ev-story-viewer__title">{trip.title}</p>
                <p className="ev-story-viewer__sub">
                  {trip.countries.map(c => stopCountry(c)).join(' ')}
                  {' · '}{dayLabel(trip.days)}
                  {' · '}N${trip.total_cost.toLocaleString()}
                </p>

                <div className="ev-story-viewer__social" role="group" aria-label="Story actions">
                  {(['love','fire','wow'] as const).map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`ev-story-viewer__react${storyReactions[trip.id] === r ? ' ev-story-viewer__react--active' : ''}`}
                      onClick={() => onReactStory(trip.id, r)}
                      aria-label={`React with ${r}`}
                    >
                      {r === 'love' ? '❤️' : r === 'fire' ? '🔥' : '😮'} {rc[r]}
                    </button>
                  ))}
                  <button type="button" className="ev-story-viewer__share" onClick={() => onShareStory(trip.id)}>
                    {storyShareMsg || 'Share'}
                  </button>
                  <button type="button" className="ev-story-viewer__share" onClick={() => setShowCommentInput(v => !v)}>
                    {showCommentInput ? 'Close' : 'Comment'}
                  </button>
                </div>

                {showCommentInput && (
                  <div className="ev-story-viewer__comment-box">
                    <input
                      className="input ev-story-viewer__comment-input"
                      placeholder="Write a comment…"
                      value={storyDraft}
                      onChange={e => setStoryDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') onCommentStory(trip.id) }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-ghost ev-story-viewer__comment-send"
                      onClick={() => onCommentStory(trip.id)}
                      disabled={!storyDraft.trim()}
                    >Send</button>
                  </div>
                )}

                {(storyComments[trip.id] ?? []).length > 0 && (
                  <div className="ev-story-viewer__comments">
                    {(storyComments[trip.id] ?? []).map((c, i) => (
                      <p key={i} className="ev-story-viewer__comment-item">{c}</p>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary ev-story-viewer__cta"
                  onClick={() => { setActiveStoryIdx(null); navigate(`/journeys/${trip.id}`) }}
                >
                  View full diary
                </button>
              </div>

              {featured.length > 1 && (
                <>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--prev"
                    aria-label="Previous"
                    onClick={() => setActiveStoryIdx(i => i == null ? 0 : (i - 1 + featured.length) % featured.length)}
                  >‹</button>
                  <button
                    type="button"
                    className="ev-story-viewer__nav ev-story-viewer__nav--next"
                    aria-label="Next"
                    onClick={() => setActiveStoryIdx(i => i == null ? 0 : (i + 1) % featured.length)}
                  >›</button>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function modeEmoji(m: string) {
  const map: Record<string, string> = { car: '🚗', bus: '🚌', boat: '⛵', flight: '✈️', bike: '🚲', walk: '🚶' }
  return map[m] ?? '🚀'
}

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBookmark({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconComment() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
