import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PostMedia } from '../components/PostMedia'

type PinPost = {
  id: number
  author: { username: string; display_name: string; avatar?: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  delvers_board: string
  liked_by_me: boolean
  saved_by_me: boolean
  likes_count: number
  saves_count: number
  created_at?: string
}

function pinStoryLabel(p: PinPost): string {
  if (p.delvers_board?.trim()) return p.delvers_board.trim()
  const line = p.body?.trim().split('\n')[0]
  if (line) return line.length > 34 ? `${line.slice(0, 33)}…` : line
  return p.region || 'Moment'
}

function pinStorySub(p: PinPost): string {
  const parts = [p.region, p.delvers_board].filter(Boolean)
  const base = parts.join(' · ')
  if (base) return base
  return p.likes_count > 0 ? `${p.likes_count} likes` : 'Delvers'
}

export function Delvers() {
  const { profile } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeBoard, setActiveBoard] = useState('')
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

  const qc = useQueryClient()
  const qk = ['delvers', profile?.region] as const
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () =>
      apiFetch<PinPost[]>(
        `/api/social/delvers/${profile?.region ? `?region=${encodeURIComponent(profile.region)}` : ''}`,
        { auth: false },
      ),
  })

  const likeMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/social/posts/${id}/like/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk }),
  })

  const saveMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/social/posts/${id}/save/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk }),
  })

  const filteredPins = useMemo(() => {
    if (!data?.length) return []
    return data.filter((p) => {
      if (activeBoard && p.delvers_board !== activeBoard) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = [p.body, p.region, p.delvers_board, p.author.username, p.author.display_name]
          .filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data, activeBoard, search])

  const featured = useMemo(() => filteredPins.slice(0, 5), [filteredPins])
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

  const onReactStory = (postId: number, reaction: 'love' | 'fire' | 'wow') => {
    const prevReaction = storyReactions[postId] ?? null
    const nextReaction = prevReaction === reaction ? null : reaction
    setStoryReactions((prev) => ({ ...prev, [postId]: nextReaction }))
    setStoryReactionCounts((prev) => {
      const cur = prev[postId] ?? { love: 0, fire: 0, wow: 0 }
      const out = { ...cur }
      if (prevReaction) out[prevReaction] = Math.max(0, out[prevReaction] - 1)
      if (nextReaction) out[nextReaction] += 1
      return { ...prev, [postId]: out }
    })
  }

  const onShareStory = async (postId: number) => {
    const url = `${window.location.origin}/posts/${postId}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const onCommentStory = (postId: number) => {
    const body = storyDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'You'
    setStoryComments((prev) => ({
      ...prev,
      [postId]: [`${author}: ${body}`, ...(prev[postId] ?? [])].slice(0, 8),
    }))
    setStoryDraft('')
  }

  const hasFilters = !!(activeBoard || search)

  const clearAll = () => {
    setActiveBoard('')
    setSearchInput('')
    setSearch('')
  }

  return (
    <div className="sf-page ev-page acc-page">

      <header className="page-header sf-page__header acc-page__header sf-page__header--split">
        <div>
          <h1 className="display sf-page__title">Delvers</h1>
          <p className="page-sub sf-page__sub">
            Pins, ideas, and moments — browse like a social discovery feed.
          </p>
        </div>
        {profile ? (
          <Link to="/create" className="btn btn-primary sf-page__header-cta">
            + New pin
          </Link>
        ) : (
          <div className="sf-page__auth-links sf-page__header-cta-group">
            <Link to="/login" className="sf-page__auth-link">Sign in</Link>
            <Link to="/register" className="btn btn-primary sf-page__auth-link--cta">Join free</Link>
          </div>
        )}
      </header>

      <div className="acc-page__search">
        <label className="visually-hidden" htmlFor="dv-search">
          Search Delvers
        </label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon" aria-hidden>⌕</span>
          <input
            id="dv-search"
            type="search"
            className="acc-page__search-input input"
            placeholder="Caption, board, place, or @username…"
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
        <section className="ev-page__story-rings" aria-labelledby="dv-story-rings-title">
          <div className="ev-page__stories-head">
            <h2 id="dv-story-rings-title" className="ev-page__stories-title">
              Stories
            </h2>
            <span className="ev-page__stories-sub">Tap to open</span>
          </div>
          <div className="ev-page__story-rings-row">
            {featured.map((p, i) => (
              <button
                key={`dv-ring-${p.id}`}
                type="button"
                className="ev-story-ring"
                onClick={() => setActiveStoryIdx(i)}
                aria-label={`Open story: ${pinStoryLabel(p)}`}
              >
                <span className="ev-story-ring__avatar">
                  {p.image ? (
                    <img src={mediaUrl(p.image) || ''} alt="" />
                  ) : p.video ? (
                    <span className="ev-story-ring__fallback" aria-hidden>🎬</span>
                  ) : (
                    <span className="ev-story-ring__fallback" aria-hidden>📌</span>
                  )}
                </span>
                <span className="ev-story-ring__label">{pinStoryLabel(p)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!isLoading && featured.length > 0 && (
        <section className="ev-page__stories" aria-labelledby="dv-stories-title">
          <div className="ev-page__stories-head">
            <h2 id="dv-stories-title" className="ev-page__stories-title">
              Trending now
            </h2>
            <span className="ev-page__stories-sub">Swipe to explore</span>
          </div>
          <div className="ev-page__stories-row">
            {featured.map((p) => (
              <Link key={`dv-story-${p.id}`} to={`/posts/${p.id}`} className="ev-story">
                <div className="ev-story__img-wrap">
                  {p.image ? (
                    <img className="ev-story__img" src={mediaUrl(p.image) || ''} alt="" />
                  ) : p.video ? (
                    <div className="ev-story__img ev-story__img--placeholder">
                      <span aria-hidden>🎬</span>
                    </div>
                  ) : (
                    <div className="ev-story__img ev-story__img--placeholder">
                      <span aria-hidden>📌</span>
                    </div>
                  )}
                </div>
                <div className="ev-story__meta">
                  <p className="ev-story__title">{pinStoryLabel(p)}</p>
                  <p className="ev-story__sub">{pinStorySub(p)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {hasFilters && (
        <div className="ev-page__filter-summary">
          <span className="ev-page__filter-summary-text">
            Filtered
            {activeBoard ? ` · ${activeBoard}` : ''}
            {search ? ` · "${search}"` : ''}
          </span>
          <button type="button" className="ev-page__filter-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {isLoading && (
        <div className="sf-feed">
          {[1, 2, 3].map((i) => (
            <div key={i} className="sf-post sf-post--skeleton">
              <div className="sf-post__header">
                <div className="skeleton sf-post__sk-avatar" />
                <div className="sf-post__sk-meta">
                  <div className="skeleton" style={{ height: 12, width: 100, borderRadius: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: 64, borderRadius: 6, marginTop: 4 }} />
                </div>
              </div>
              <div className="skeleton sf-post__sk-img" style={{ height: 320 + i * 40 }} />
              <div className="sf-post__sk-foot">
                <div className="skeleton" style={{ height: 11, width: '60%', borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredPins.length > 0 && (
        <div className="sf-feed">
          {filteredPins.map((p) => {
            const name = p.author.display_name || p.author.username
            const initial = name.trim().charAt(0).toUpperCase() || '?'
            const likeBusy = likeMut.isPending && likeMut.variables === p.id
            const saveBusy = saveMut.isPending && saveMut.variables === p.id

            return (
              <article key={p.id} className="sf-post">

                <div className="sf-post__header">
                  <Link
                    to={`/u/${encodeURIComponent(p.author.username)}`}
                    className="sf-post__user"
                  >
                    <span className="sf-post__avatar" aria-hidden>{initial}</span>
                    <div className="sf-post__user-meta">
                      <span className="sf-post__username">{name}</span>
                      {p.region ? <span className="sf-post__location">📍 {p.region}</span> : null}
                    </div>
                  </Link>

                  <div className="sf-post__header-right">
                    {p.delvers_board ? (
                      <button
                        type="button"
                        className="sf-post__board-pill"
                        onClick={() => setActiveBoard(activeBoard === p.delvers_board ? '' : p.delvers_board)}
                      >{p.delvers_board}</button>
                    ) : null}

                    {profile ? (
                      <button
                        type="button"
                        className={`sf-post__save${p.saved_by_me ? ' sf-post__save--active' : ''}`}
                        onClick={() => saveMut.mutate(p.id)}
                        disabled={saveBusy}
                        aria-label={p.saved_by_me ? 'Remove save' : 'Save'}
                      >
                        <IconBookmark filled={p.saved_by_me} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <Link to={`/posts/${p.id}`} className="sf-post__media-link" tabIndex={-1} aria-hidden>
                  <div className="sf-post__media">
                    <PostMedia image={p.image} video={p.video} variant="pin" alt="" />
                  </div>
                </Link>

                <div className="sf-post__actions">
                  <div className="sf-post__actions-left">
                    {profile ? (
                      <button
                        type="button"
                        className={`sf-post__like${p.liked_by_me ? ' sf-post__like--active' : ''}`}
                        onClick={() => likeMut.mutate(p.id)}
                        disabled={likeBusy}
                        aria-label={p.liked_by_me ? 'Unlike' : 'Like'}
                      >
                        <IconHeart filled={p.liked_by_me} />
                      </button>
                    ) : null}
                  </div>
                </div>

                {p.likes_count > 0 ? (
                  <p className="sf-post__likes">
                    {p.likes_count} {p.likes_count === 1 ? 'like' : 'likes'}
                  </p>
                ) : null}

                {p.body ? (
                  <div className="sf-post__caption">
                    <Link to={`/u/${encodeURIComponent(p.author.username)}`} className="sf-post__caption-author">
                      {name}
                    </Link>{' '}
                    <Link to={`/posts/${p.id}`} className="sf-post__caption-text">
                      {p.body}
                    </Link>
                  </div>
                ) : null}

                {!profile && (
                  <p className="sf-post__guest-nudge">
                    <Link to="/login">Sign in</Link> to like &amp; save
                  </p>
                )}

              </article>
            )
          })}
        </div>
      )}

      {!isLoading && data && data.length > 0 && filteredPins.length === 0 && hasFilters ? (
        <div className="sf-empty">
          <p className="sf-empty__title">Nothing matches these filters</p>
          <p className="sf-empty__text">Try a different board or search term.</p>
          <button type="button" className="btn btn-ghost" onClick={clearAll}>Clear filters</button>
        </div>
      ) : null}

      {!isLoading && data?.length === 0 && (
        <div className="sf-empty">
          <p className="sf-empty__title">Quiet feed for now</p>
          <p className="sf-empty__text">
            Someone will post the first pin soon — maybe you. Share a corner of your day.
          </p>
          {profile ? (
            <Link to="/create" className="btn btn-primary">Share a pin</Link>
          ) : (
            <Link to="/register" className="btn btn-primary">Join to post</Link>
          )}
        </div>
      )}

      {activeStory && (
        <div
          className="ev-story-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Delvers story"
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
            {activeStory.image ? (
              <img
                className="ev-story-viewer__img"
                src={mediaUrl(activeStory.image) || ''}
                alt={pinStoryLabel(activeStory)}
              />
            ) : activeStory.video ? (
              <video
                key={activeStory.id}
                className="ev-story-viewer__img"
                src={mediaUrl(activeStory.video) || ''}
                autoPlay
                muted
                playsInline
                loop
              />
            ) : (
              <div className="ev-story-viewer__img ev-story-viewer__img--placeholder">
                <span aria-hidden>📌</span>
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
                <Link
                  className="ev-story-viewer__author"
                  to={`/u/${encodeURIComponent(activeStory.author.username)}`}
                >
                  @{activeStory.author.display_name?.trim() || activeStory.author.username}
                </Link>
              </p>
              <p className="ev-story-viewer__title">{pinStoryLabel(activeStory)}</p>
              <p className="ev-story-viewer__sub">
                {activeStory.region}
                {activeStory.delvers_board ? ` · ${activeStory.delvers_board}` : ''}
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
              <Link className="btn btn-primary ev-story-viewer__cta" to={`/posts/${activeStory.id}`}>
                Open pin
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
