import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Guide = {
  id: number
  headline: string
  bio: string
  hourly_rate: string | null
  languages: string[]
  regions: string[]
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  specialities?: string[]
}

const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'mandarin', label: 'Mandarin' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'italian', label: 'Italian' },
  { value: 'hindi', label: 'Hindi' },
]

const REGION_OPTIONS = [
  'Europe', 'Asia', 'Americas', 'Africa',
  'Oceania', 'Middle East', 'Caribbean', 'Arctic',
]

const DEFAULT_GUIDE_PHOTO = '/images/default-guide.jpg'
const FALLBACK_GUIDE_PHOTO = '/images/default-journey.jpg'

const HERO_TRUST = ['Vetted hosts', 'Local routes', 'Language matching'] as const

function guidePhotoSrc(photo: string | null) {
  return mediaUrl(photo) || DEFAULT_GUIDE_PHOTO
}

function onGuidePhotoError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.endsWith(FALLBACK_GUIDE_PHOTO)) {
    img.src = FALLBACK_GUIDE_PHOTO
  }
}

function pickTopGuide(guides: Guide[]): Guide | null {
  if (!guides.length) return null
  return guides.reduce((best, g) => {
    const r = parseFloat(g.rating_avg ?? '0')
    const br = parseFloat(best.rating_avg ?? '0')
    return r > br ? g : best
  })
}

export function GuidesList() {
  const { profile } = useAuth()
  const [language, setLanguage] = useState('')
  const [region, setRegion] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

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
    if (language) p.set('language', language)
    if (region) p.set('region', region)
    if (search) p.set('search', search)
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [language, region, search])

  const { data, isLoading } = useQuery({
    queryKey: ['guides', qs],
    queryFn: () => apiFetch<Guide[]>(`/api/guides/profiles/${qs}`, { auth: false }),
  })

  const guides = data ?? []
  const featured = useMemo(() => guides.slice(0, 5), [guides])
  const topPick = useMemo(() => pickTopGuide(guides), [guides])
  const gridGuides = useMemo(() => {
    if (!topPick) return guides
    return guides.filter((g) => g.id !== topPick.id)
  }, [guides, topPick])
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

  const onReactStory = (id: number, reaction: 'love' | 'fire' | 'wow') => {
    const prevReaction = storyReactions[id] ?? null
    const nextReaction = prevReaction === reaction ? null : reaction
    setStoryReactions((prev) => ({ ...prev, [id]: nextReaction }))
    setStoryReactionCounts((prev) => {
      const cur = prev[id] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prevReaction) out[prevReaction] = Math.max(0, out[prevReaction] - 1)
      if (nextReaction) out[nextReaction] += 1
      return { ...prev, [id]: out }
    })
  }

  const onShareStory = async (id: number) => {
    const url = `${window.location.origin}/guides/${id}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const onCommentStory = (id: number) => {
    const body = storyDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'You'
    setStoryComments((prev) => ({
      ...prev,
      [id]: [`${author}: ${body}`, ...(prev[id] ?? [])].slice(0, 8),
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

  const hasFilters = !!(language || region || search)

  const clearAll = () => {
    setLanguage('')
    setRegion('')
    setSearchInput('')
    setSearch('')
  }

  const resultsLabel =
    hasFilters && search
      ? `${guides.length} ${guides.length === 1 ? 'guide' : 'guides'} matched to your search`
      : hasFilters
        ? `${guides.length} ${guides.length === 1 ? 'guide' : 'guides'} matched to your filters`
        : `${guides.length} ${guides.length === 1 ? 'guide' : 'guides'} available`

  return (
    <div className="gd-page ev-page acc-page">
      <section className="gd-hero">
        <header className="page-header ev-page__header acc-page__header gd-page__header">
          <div>
            <p className="gd-page__eyebrow">DELVE · Guides</p>
            <h1 className="display ev-page__title gd-page__title">Private tours &amp; local experts</h1>
            <p className="page-sub ev-page__sub gd-page__sub">
              Book vetted locals for city walks, food, culture, nature, and hidden places — in your language.
            </p>
          </div>
        </header>

        <div className="gd-hero__trust" aria-label="Why book with DELVE guides">
          {HERO_TRUST.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        <div className="acc-page__search gd-hero__search">
          <label className="visually-hidden" htmlFor="gd-search">
            Search guides
          </label>
          <div className="acc-page__search-inner">
            <span className="acc-page__search-icon" aria-hidden>
              ⌕
            </span>
            <input
              id="gd-search"
              type="search"
              className="acc-page__search-input input"
              placeholder="Search by guide, place, or experience…"
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
      </section>

      <button
        type="button"
        className="gd-filter-toggle"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
      >
        {showFilters ? 'Hide filters' : 'Find your guide'}
      </button>

      {showFilters && (
        <section className="ev-page__discover card" aria-labelledby="gd-discover-title">
          <h2 id="gd-discover-title" className="ev-page__discover-title">
            Match with a local expert
          </h2>
          <p className="ev-page__discover-sub">
            Filter by language first — then narrow by where they guide.
          </p>
          <div className="ev-page__discover-chips" role="group" aria-label="Languages">
            {LANGUAGE_OPTIONS.map(({ value, label }) => (
              <button
                key={`gd-lang-${value}`}
                type="button"
                className={`acc-quick-chip ev-page__discover-chip${language === value ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setLanguage(language === value ? '' : value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ev-page__discover-chips gd-page__discover-chips--regions" role="group" aria-label="Regions">
            {REGION_OPTIONS.map((r) => (
              <button
                key={`gd-reg-${r}`}
                type="button"
                className={`acc-quick-chip${region === r ? ' acc-quick-chip--active' : ''}`}
                onClick={() => setRegion(region === r ? '' : r)}
              >
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {!isLoading && featured.length > 0 && (
        <section className="ev-page__story-rings" aria-labelledby="gd-story-rings-title">
          <div className="ev-page__stories-head">
            <h2 id="gd-story-rings-title" className="ev-page__stories-title">
              Meet the guides
            </h2>
            <span className="ev-page__stories-sub">Tap to open</span>
          </div>
          <div className="ev-page__story-rings-row">
            {featured.map((g, i) => {
              const name = g.display_name?.trim() || g.username
              return (
                <button
                  key={`gd-ring-${g.id}`}
                  type="button"
                  className="ev-story-ring"
                  onClick={() => setActiveStoryIdx(i)}
                  aria-label={`Open story: ${name}`}
                >
                  <span className="ev-story-ring__avatar">
                    <img src={guidePhotoSrc(g.photo)} alt="" onError={onGuidePhotoError} />
                  </span>
                  <span className="ev-story-ring__label">{name}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {!isLoading && featured.length > 0 && (
        <section className="ev-page__stories" aria-labelledby="gd-stories-title">
          <div className="ev-page__stories-head">
            <h2 id="gd-stories-title" className="ev-page__stories-title">
              Featured local experts
            </h2>
            <span className="ev-page__stories-sub">Swipe to compare</span>
          </div>
          <div className="ev-page__stories-row">
            {featured.map((g) => {
              const name = g.display_name?.trim() || g.username
              const loc = (g.regions || []).slice(0, 2).join(' · ')
              return (
                <Link key={`gd-story-${g.id}`} to={`/guides/${g.id}`} className="ev-story">
                  <div className="ev-story__img-wrap">
                    <img
                      className="ev-story__img"
                      src={guidePhotoSrc(g.photo)}
                      alt=""
                      onError={onGuidePhotoError}
                    />
                  </div>
                  <div className="ev-story__meta">
                    <p className="ev-story__title">{name}</p>
                    <p className="ev-story__sub">{g.headline}{loc ? ` · ${loc}` : ''}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {hasFilters && (
        <div className="ev-page__filter-summary">
          <span className="ev-page__filter-summary-text">
            Filtered
            {language ? ` · ${LANGUAGE_OPTIONS.find((l) => l.value === language)?.label ?? language}` : ''}
            {region ? ` · ${region}` : ''}
            {search ? ` · "${search}"` : ''}
          </span>
          <button type="button" className="ev-page__filter-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {isLoading && (
        <div className="ev-page__skeleton-wrap" aria-hidden>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton ev-page__skeleton-card" />
          ))}
        </div>
      )}

      {!isLoading && guides.length > 0 && (
        <p className="ev-page__results-hint gd-page__results-hint">
          <span className="gd-page__results-label">Available local experts</span>
          <span className="gd-page__results-detail">{resultsLabel}</span>
        </p>
      )}

      {!isLoading && topPick && (
        <GuideFeaturedCard guide={topPick} saved={savedIds.has(topPick.id)} onToggleSave={toggleSaved} />
      )}

      <div className="acc-page__grid ev-page__grid gd-page__grid">
        {gridGuides.map((g) => (
          <GuideCard key={g.id} guide={g} saved={savedIds.has(g.id)} onToggleSave={toggleSaved} />
        ))}
      </div>

      {!isLoading && data?.length === 0 && (
        <div className="ev-page__empty gd-page__empty">
          <p className="ev-page__empty-title gd-page__empty-title">
            {hasFilters ? 'No guides match these filters' : 'No guides listed yet'}
          </p>
          <p className="ev-page__empty-text gd-page__empty-text">
            {hasFilters
              ? 'Try another language, region, or search — new hosts join DELVE every week.'
              : 'Expert guides in cities around the world will appear here as they join DELVE.'}
          </p>
          {hasFilters && (
            <button type="button" className="btn btn-primary ev-page__empty-btn gd-page__empty-btn" onClick={clearAll}>
              Show all guides
            </button>
          )}
        </div>
      )}

      {activeStory && (
        <div
          className="ev-story-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Guide story"
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
            {activeStory.photo ? (
              <img
                className="ev-story-viewer__img"
                src={mediaUrl(activeStory.photo) || ''}
                alt={activeStory.headline}
              />
            ) : (
              <div className="ev-story-viewer__img ev-story-viewer__img--placeholder">
                <span aria-hidden>🧭</span>
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
                <Link className="ev-story-viewer__author" to={`/u/${encodeURIComponent(activeStory.username)}`}>
                  @{activeStory.display_name?.trim() || activeStory.username}
                </Link>
              </p>
              <p className="ev-story-viewer__title">{activeStory.headline}</p>
              <p className="ev-story-viewer__sub">
                {(activeStory.regions || []).slice(0, 2).join(' · ')}
                {activeStory.hourly_rate ? ` · From $${activeStory.hourly_rate}/hr` : ''}
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
              <Link className="btn btn-primary ev-story-viewer__cta" to={`/guides/${activeStory.id}`}>
                Open guide profile
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

function GuideCard({
  guide: g,
  saved,
  onToggleSave,
}: {
  guide: Guide
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const displayName = g.display_name?.trim() || g.username
  const regionSnippet = (g.regions || []).slice(0, 2).join(' · ')
  const langSnippet = (g.languages || []).slice(0, 3)
  const respondsFast = g.id % 2 === 0

  return (
    <Link to={`/guides/${g.id}`} className="gd-card">
      <div className="gd-card__photo-wrap">
        <img
          className="gd-card__photo"
          src={guidePhotoSrc(g.photo)}
          alt={displayName}
          loading="lazy"
          onError={onGuidePhotoError}
        />
        <button
          type="button"
          className={`gd-card__save${saved ? ' gd-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save guide'}
          onClick={(e) => onToggleSave(g.id, e)}
        >
          <IconHeart filled={saved} />
        </button>
      </div>
      <div className="gd-card__body">
        <div className="gd-card__name-row">
          <p className="gd-card__name">{displayName}</p>
          {g.rating_avg != null && (
            <p className="gd-card__rating">
              <span className="gd-card__rating-star">★</span>
              <span className="gd-card__rating-val">{parseFloat(g.rating_avg).toFixed(1)}</span>
              {g.rating_count ? (
                <span className="gd-card__rating-count">({g.rating_count})</span>
              ) : null}
            </p>
          )}
        </div>
        <p className="gd-card__headline">{g.headline}</p>
        <div className="gd-card__trust-row">
          <span>Verified</span>
          <span>{respondsFast ? 'Responds fast' : 'Available this week'}</span>
        </div>
        {regionSnippet ? (
          <p className="gd-card__regions">
            <IconPin className="gd-card__pin" />
            {regionSnippet}
          </p>
        ) : null}
        {langSnippet.length > 0 ? (
          <div className="gd-card__langs">
            {langSnippet.map((l) => (
              <span key={l} className="gd-card__lang-chip">
                {l}
              </span>
            ))}
          </div>
        ) : null}
        {g.hourly_rate ? (
          <p className="gd-card__rate">
            <span className="gd-card__rate-from">From</span>
            <strong>${g.hourly_rate}</strong>
            <span className="gd-card__rate-unit"> / hr</span>
          </p>
        ) : null}
        <span className={`gd-card__book${!g.hourly_rate ? ' gd-card__book--solo' : ''}`}>View guide</span>
      </div>
    </Link>
  )
}

function GuideFeaturedCard({
  guide: g,
  saved,
  onToggleSave,
}: {
  guide: Guide
  saved: boolean
  onToggleSave: (id: number, e: React.MouseEvent) => void
}) {
  const displayName = g.display_name?.trim() || g.username
  const regionSnippet = (g.regions || []).slice(0, 2).join(' · ')
  const langSnippet = (g.languages || []).slice(0, 3).join(' · ')

  return (
    <Link to={`/guides/${g.id}`} className="gd-featured">
      <div className="gd-featured__media">
        <img
          src={guidePhotoSrc(g.photo)}
          alt=""
          loading="lazy"
          onError={onGuidePhotoError}
        />
        <button
          type="button"
          className={`gd-card__save gd-featured__save${saved ? ' gd-card__save--saved' : ''}`}
          aria-label={saved ? 'Remove from saved' : 'Save guide'}
          onClick={(e) => onToggleSave(g.id, e)}
        >
          <IconHeart filled={saved} />
        </button>
      </div>
      <div className="gd-featured__body">
        <span className="gd-featured__badge">Top pick</span>
        <h2 className="gd-featured__name">{displayName}</h2>
        <p className="gd-featured__headline">{g.headline}</p>
        {regionSnippet ? <p className="gd-featured__meta">{regionSnippet}</p> : null}
        {langSnippet ? <p className="gd-featured__meta">{langSnippet}</p> : null}
        {g.hourly_rate ? (
          <p className="gd-featured__rate">
            From <strong>${g.hourly_rate}</strong>/hr
          </p>
        ) : null}
        <span className="gd-featured__cta">View profile →</span>
      </div>
    </Link>
  )
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        d="M12 21s7-5 7-11a7 7 0 10-14 0c0 6 7 11 7 11z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2" />
    </svg>
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
