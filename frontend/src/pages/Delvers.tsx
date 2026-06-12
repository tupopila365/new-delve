import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Heart, MessageCircle, Search, Share2, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { subscribeDelversSearch } from '../utils/delversSearchBridge'
import { EmptyState } from '../components/ui'

type FeedMode = 'foryou' | 'nearby'

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

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export function Delvers() {
  const { profile } = useAuth()
  const [feedMode, setFeedMode] = useState<FeedMode>('foryou')
  const [activeIndex, setActiveIndex] = useState(0)
  const [shareMsg, setShareMsg] = useState('')
  const [burstId, setBurstId] = useState<number | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [pendingJumpId, setPendingJumpId] = useState<number | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastTapRef = useRef<{ id: number; t: number } | null>(null)

  const qc = useQueryClient()
  const qk = ['delvers', profile?.region] as const
  const { data, isLoading, isError, refetch } = useQuery({
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
    if (feedMode === 'foryou') return data
    const homeRegion = profile?.region?.trim()
    if (!homeRegion) return data
    return data.filter((p) => p.region?.trim().toLowerCase() === homeRegion.toLowerCase())
  }, [data, feedMode, profile?.region])

  const searchResults = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q || !data?.length) return []
    return data.filter((p) => {
      const hay = [
        p.body,
        p.region,
        p.delvers_board,
        p.author.username,
        p.author.display_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [data, searchInput])

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    window.setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchInput('')
  }, [])

  useEffect(() => subscribeDelversSearch(openSearch), [openSearch])

  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, closeSearch])

  const scrollToPin = useCallback((postId: number, pins: PinPost[]) => {
    const idx = pins.findIndex((p) => p.id === postId)
    if (idx < 0 || !feedRef.current) return false

    const slide = feedRef.current.querySelector<HTMLElement>(`[data-tt-post-id="${postId}"]`)
    slide?.scrollIntoView({ behavior: 'smooth' })
    setActiveIndex(idx)
    return true
  }, [])

  const jumpToPin = (postId: number) => {
    closeSearch()
    if (scrollToPin(postId, filteredPins)) return
    setFeedMode('foryou')
    setPendingJumpId(postId)
  }

  useEffect(() => {
    if (pendingJumpId == null) return
    if (scrollToPin(pendingJumpId, filteredPins)) {
      setPendingJumpId(null)
    }
  }, [pendingJumpId, filteredPins, scrollToPin])

  useEffect(() => {
    setActiveIndex(0)
    feedRef.current?.scrollTo({ top: 0 })
  }, [feedMode])

  useEffect(() => {
    const feed = feedRef.current
    if (!feed || filteredPins.length === 0) return

    const slides = feed.querySelectorAll<HTMLElement>('[data-tt-index]')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            const idx = Number((entry.target as HTMLElement).dataset.ttIndex)
            if (!Number.isNaN(idx)) setActiveIndex(idx)
          }
        }
      },
      { root: feed, threshold: [0.55, 0.75] },
    )

    slides.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [filteredPins])

  useEffect(() => {
    if (!shareMsg) return
    const t = window.setTimeout(() => setShareMsg(''), 1400)
    return () => window.clearTimeout(t)
  }, [shareMsg])

  useEffect(() => {
    if (burstId == null) return
    const t = window.setTimeout(() => setBurstId(null), 700)
    return () => window.clearTimeout(t)
  }, [burstId])

  const onShare = async (postId: number) => {
    const url = `${window.location.origin}/posts/${postId}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const onDoubleTapLike = useCallback(
    (post: PinPost) => {
      setBurstId(post.id)
      if (profile && !post.liked_by_me && !likeMut.isPending) {
        likeMut.mutate(post.id)
      }
    },
    [profile, likeMut],
  )

  const onMediaTap = (post: PinPost) => {
    const now = Date.now()
    const last = lastTapRef.current
    if (last && last.id === post.id && now - last.t < 320) {
      lastTapRef.current = null
      onDoubleTapLike(post)
      return
    }
    lastTapRef.current = { id: post.id, t: now }
  }

  return (
    <div className="tt-page">
      <header className="tt-chrome" aria-label="Delvers feed">
        <button
          type="button"
          className="tt-chrome__search"
          onClick={openSearch}
          aria-label="Search Delvers pins"
        >
          <Search size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <nav className="tt-chrome__tabs" role="tablist" aria-label="Feed mode">
          <button
            type="button"
            role="tab"
            aria-selected={feedMode === 'foryou'}
            className={`tt-chrome__tab${feedMode === 'foryou' ? ' tt-chrome__tab--active' : ''}`}
            onClick={() => setFeedMode('foryou')}
          >
            For you
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={feedMode === 'nearby'}
            className={`tt-chrome__tab${feedMode === 'nearby' ? ' tt-chrome__tab--active' : ''}`}
            onClick={() => setFeedMode('nearby')}
          >
            Nearby
          </button>
        </nav>
        {profile ? (
          <Link to="/delvers/new" className="tt-chrome__post" aria-label="New pin">
            +
          </Link>
        ) : (
          <Link to="/login" className="tt-chrome__post tt-chrome__post--ghost" aria-label="Sign in">
            →
          </Link>
        )}
      </header>

      {searchOpen ? (
        <div className="tt-search" role="dialog" aria-modal="true" aria-label="Search Delvers">
          <div className="tt-search__backdrop" onClick={closeSearch} aria-hidden />
          <div className="tt-search__panel">
            <div className="tt-search__head">
              <div className="tt-search__field">
                <Search size={18} strokeWidth={2.25} aria-hidden />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="tt-search__input"
                  placeholder="Search pins, @users, places, boards…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {searchInput ? (
                  <button
                    type="button"
                    className="tt-search__clear"
                    onClick={() => setSearchInput('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <button type="button" className="tt-search__close" onClick={closeSearch} aria-label="Close search">
                <X size={22} strokeWidth={2.25} />
              </button>
            </div>

            <div className="tt-search__body">
              {!searchInput.trim() ? (
                <p className="tt-search__hint">Find a moment, traveller, or place — without leaving the feed.</p>
              ) : searchResults.length === 0 ? (
                <p className="tt-search__empty">No pins match &ldquo;{searchInput.trim()}&rdquo;</p>
              ) : (
                <ul className="tt-search__results">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="tt-search__result" onClick={() => jumpToPin(p.id)}>
                        <span className="tt-search__thumb">
                          {p.image ? (
                            <img src={mediaUrl(p.image) || ''} alt="" />
                          ) : p.video ? (
                            <span className="tt-search__thumb-fallback" aria-hidden>
                              🎬
                            </span>
                          ) : (
                            <span className="tt-search__thumb-fallback" aria-hidden>
                              📌
                            </span>
                          )}
                        </span>
                        <span className="tt-search__result-meta">
                          <span className="tt-search__result-user">@{p.author.username}</span>
                          <span className="tt-search__result-text">
                            {p.body?.trim() || p.delvers_board || p.region || 'Pin'}
                          </span>
                          {p.region ? (
                            <span className="tt-search__result-sub">{p.region}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {shareMsg ? (
        <p className="tt-toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      {isError && (
        <EmptyState
          icon="📸"
          title="We couldn't load Delvers"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      )}

      {isLoading && !isError && (
        <div className="tt-feed tt-feed--solo" aria-hidden>
          <div className="tt-slide tt-slide--skeleton">
            <div className="tt-slide__shimmer" />
          </div>
        </div>
      )}

      {!isLoading && filteredPins.length > 0 && (
        <div className="tt-feed" ref={feedRef} aria-label="Delvers pins">
          {filteredPins.map((p, index) => (
            <TikTokSlide
              key={p.id}
              post={p}
              index={index}
              isActive={activeIndex === index}
              burst={burstId === p.id}
              profile={!!profile}
              likeBusy={likeMut.isPending && likeMut.variables === p.id}
              saveBusy={saveMut.isPending && saveMut.variables === p.id}
              onMediaTap={() => onMediaTap(p)}
              onLike={() => profile && likeMut.mutate(p.id)}
              onSave={() => profile && saveMut.mutate(p.id)}
              onShare={() => onShare(p.id)}
            />
          ))}
        </div>
      )}

      {!isLoading && data && data.length > 0 && filteredPins.length === 0 && (
        <div className="tt-empty">
          <EmptyState
            compact
            icon="📸"
            title={feedMode === 'nearby' ? 'Nothing nearby yet' : 'No moments to show'}
            sub={
              feedMode === 'nearby'
                ? profile?.region
                  ? `No pins from ${profile.region} right now — browse For you for travellers across the region.`
                  : 'Add your region in settings to see local pins, or browse For you.'
                : 'Check back soon — new travel moments land here all the time.'
            }
            cta={
              feedMode === 'nearby'
                ? { label: 'Browse For you', onClick: () => setFeedMode('foryou') }
                : profile
                  ? { label: 'Share a moment', to: '/delvers/new' }
                  : undefined
            }
          />
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <div className="tt-empty">
          <EmptyState
            icon="📸"
            title="Delvers"
            sub="Real travel moments, tips, photos, and clips from the community."
            cta={profile ? { label: 'Share a moment', to: '/delvers/new' } : { label: 'Sign in', to: '/login' }}
          />
        </div>
      )}

    </div>
  )
}

function TikTokSlide({
  post,
  index,
  isActive,
  burst,
  profile,
  likeBusy,
  saveBusy,
  onMediaTap,
  onLike,
  onSave,
  onShare,
}: {
  post: PinPost
  index: number
  isActive: boolean
  burst: boolean
  profile: boolean
  likeBusy: boolean
  saveBusy: boolean
  onMediaTap: () => void
  onLike: () => void
  onSave: () => void
  onShare: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const name = post.author.display_name || post.author.username
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const imgSrc = post.image ? mediaUrl(post.image) : null
  const vidSrc = post.video ? mediaUrl(post.video) : null

  useEffect(() => {
    const v = videoRef.current
    if (!v || !vidSrc) return
    if (isActive) {
      void v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = 0
    }
  }, [isActive, vidSrc])

  const caption = post.body?.trim() || ''
  const soundLine = vidSrc ? `Original sound · ${name}` : post.delvers_board || post.region

  return (
    <article className="tt-slide" data-tt-index={index} data-tt-post-id={post.id} aria-label={`Pin by ${name}`}>
      <button type="button" className="tt-slide__tap" onClick={onMediaTap} aria-label="Double-tap to like">
        {vidSrc ? (
          <video
            ref={videoRef}
            className="tt-slide__media"
            src={vidSrc}
            muted
            loop
            playsInline
            preload={index <= 1 ? 'auto' : 'metadata'}
            poster={imgSrc || undefined}
          />
        ) : imgSrc ? (
          <img className="tt-slide__media" src={imgSrc} alt="" loading={index <= 2 ? 'eager' : 'lazy'} />
        ) : (
          <div className="tt-slide__media tt-slide__media--empty">
            <span aria-hidden>📌</span>
            <p>{caption || 'A moment worth saving'}</p>
          </div>
        )}
      </button>

      <div className="tt-slide__scrim" aria-hidden />

      {burst ? (
        <div className="tt-slide__burst" aria-hidden>
          <Heart size={88} fill="currentColor" strokeWidth={0} />
        </div>
      ) : null}

      <aside className="tt-rail" aria-label="Post actions">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="tt-rail__avatar">
          <span aria-hidden>{initial}</span>
        </Link>

        {profile ? (
          <button
            type="button"
            className={`tt-rail__btn${post.liked_by_me ? ' tt-rail__btn--liked' : ''}`}
            onClick={onLike}
            disabled={likeBusy}
            aria-label={post.liked_by_me ? 'Unlike' : 'Like'}
          >
            <Heart size={28} fill={post.liked_by_me ? 'currentColor' : 'none'} strokeWidth={2} />
            <span>{formatCount(post.likes_count || 0)}</span>
          </button>
        ) : (
          <Link to="/login" className="tt-rail__btn" aria-label="Like">
            <Heart size={28} strokeWidth={2} />
            <span>{formatCount(post.likes_count || 0)}</span>
          </Link>
        )}

        <Link to={`/posts/${post.id}`} className="tt-rail__btn" aria-label="Comment">
          <MessageCircle size={28} strokeWidth={2} />
          <span>Comment</span>
        </Link>

        {profile ? (
          <button
            type="button"
            className={`tt-rail__btn${post.saved_by_me ? ' tt-rail__btn--saved' : ''}`}
            onClick={onSave}
            disabled={saveBusy}
            aria-label={post.saved_by_me ? 'Unsave' : 'Save'}
          >
            <Bookmark size={26} fill={post.saved_by_me ? 'currentColor' : 'none'} strokeWidth={2} />
            <span>{formatCount(post.saves_count || 0)}</span>
          </button>
        ) : (
          <Link to="/login" className="tt-rail__btn" aria-label="Save">
            <Bookmark size={26} strokeWidth={2} />
            <span>{formatCount(post.saves_count || 0)}</span>
          </Link>
        )}

        <button type="button" className="tt-rail__btn" onClick={onShare} aria-label="Share">
          <Share2 size={26} strokeWidth={2} />
          <span>Share</span>
        </button>
      </aside>

      <footer className="tt-meta">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="tt-meta__user">
          @{post.author.username}
        </Link>
        {post.delvers_board ? (
          <p className="tt-meta__board">{post.delvers_board}</p>
        ) : null}
        {caption ? <p className="tt-meta__caption">{caption}</p> : null}
        <p className="tt-meta__sound">
          <span className="tt-meta__sound-icon" aria-hidden>
            ♫
          </span>
          {soundLine}
          {post.region ? <span className="tt-meta__region"> · {post.region}</span> : null}
        </p>
      </footer>
    </article>
  )
}
