import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import type { LucideProps } from 'lucide-react'
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Camera,
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Route,
  Search,
  Share2,
  TrendingUp,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { subscribeDelversSearch } from '../utils/delversSearchBridge'
import { DiscoverySidebar, type DiscoverySidebarSection } from '../components/DiscoverySidebar'
import { MarketplaceHero, QuickFilterChips } from '../components/marketplace'
import { EmptyState, ListSkeleton } from '../components/ui'

type FeedTab = 'foryou' | 'trending' | 'nearby' | 'photos' | 'tips'

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
  comments_count?: number
  created_at?: string
}

type DelverProfile = {
  username: string
  display_name: string
  avatar: string | null
  region: string
  postCount: number
  totalLikes: number
}

type QuickFilter = {
  id: string
  label: string
  Icon: ComponentType<LucideProps>
  match: (post: PinPost) => boolean
}

const FEED_TABS: { id: FeedTab; label: string; Icon: ComponentType<LucideProps> }[] = [
  { id: 'foryou', label: 'Recommended', Icon: Compass },
  { id: 'trending', label: 'Trending', Icon: TrendingUp },
  { id: 'nearby', label: 'Nearby', Icon: MapPin },
  { id: 'photos', label: 'Photos', Icon: Camera },
  { id: 'tips', label: 'Tips', Icon: MessageCircle },
]

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'travellers', label: 'Travellers', Icon: UserRound, match: () => true },
  { id: 'photos', label: 'Photos', Icon: Camera, match: (p) => !!(p.image || p.video) },
  { id: 'tips', label: 'Tips', Icon: MessageCircle, match: (p) => !p.image && !p.video && !!p.body?.trim() },
  { id: 'journeys', label: 'Journeys', Icon: Route, match: (p) => /journey|route|road/i.test(`${p.body} ${p.delvers_board}`) },
  { id: 'trending', label: 'Trending', Icon: TrendingUp, match: (p) => p.likes_count >= 5 || p.saves_count >= 3 },
]

const TRENDING_PLACES = ['Windhoek', 'Swakopmund', 'Etosha', 'Sossusvlei', 'Walvis Bay'] as const

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function formatWhen(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
}

function postPreview(post: PinPost) {
  const text = post.body?.trim()
  if (text) return text.length > 160 ? `${text.slice(0, 160)}…` : text
  if (post.delvers_board) return post.delvers_board
  if (post.region) return `Moment from ${post.region}`
  return 'Travel moment'
}

export function Delvers() {
  const { profile } = useAuth()
  const [feedTab, setFeedTab] = useState<FeedTab>('foryou')
  const [quickFilter, setQuickFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  const tabFiltered = useMemo(() => {
    if (!data?.length) return []
    const homeRegion = profile?.region?.trim().toLowerCase()

    switch (feedTab) {
      case 'nearby':
        if (!homeRegion) return data
        return data.filter((p) => p.region?.trim().toLowerCase() === homeRegion)
      case 'trending':
        return [...data].sort((a, b) => b.likes_count + b.saves_count - (a.likes_count + a.saves_count))
      case 'photos':
        return data.filter((p) => p.image || p.video)
      case 'tips':
        return data.filter((p) => !p.image && !p.video && !!p.body?.trim())
      default:
        return data
    }
  }, [data, feedTab, profile?.region])

  const filteredPosts = useMemo(() => {
    let list = tabFiltered
    const quick = QUICK_FILTERS.find((f) => f.id === quickFilter)
    if (quick) list = list.filter(quick.match)

    const q = searchInput.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        const hay = [p.body, p.region, p.delvers_board, p.author.username, p.author.display_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }
    return list
  }, [tabFiltered, quickFilter, searchInput])

  const featuredDelvers = useMemo((): DelverProfile[] => {
    if (!data?.length) return []
    const map = new Map<string, DelverProfile>()
    for (const p of data) {
      const key = p.author.username
      const cur = map.get(key)
      if (cur) {
        cur.postCount += 1
        cur.totalLikes += p.likes_count
        if (!cur.region && p.region) cur.region = p.region
      } else {
        map.set(key, {
          username: p.author.username,
          display_name: p.author.display_name,
          avatar: p.author.avatar ?? null,
          region: p.region || '',
          postCount: 1,
          totalLikes: p.likes_count,
        })
      }
    }
    return [...map.values()].sort((a, b) => b.totalLikes - a.totalLikes || b.postCount - a.postCount).slice(0, 6)
  }, [data])

  const photoCount = useMemo(() => data?.filter((p) => p.image || p.video).length ?? 0, [data])
  const commentTotal = useMemo(() => data?.reduce((n, p) => n + (p.comments_count ?? 0), 0) ?? 0, [data])
  const activeCreators = useMemo(() => featuredDelvers.length, [featuredDelvers])

  const sidebarSections = useMemo((): DiscoverySidebarSection[] => {
    return [
      {
        id: 'trending-places',
        title: 'Trending places',
        type: 'links',
        items: TRENDING_PLACES.map((place) => ({
          label: place,
          onClick: () => setSearchInput(place),
        })),
      },
      {
        id: 'active-delvers',
        title: 'Active Delvers',
        type: 'links',
        items: featuredDelvers.slice(0, 5).map((d) => ({
          label: d.display_name,
          onClick: () => setSearchInput(d.username),
        })),
      },
      {
        id: 'feed-pulse',
        title: 'Feed pulse',
        type: 'stats',
        items: [
          { value: data?.length ?? '—', label: 'posts' },
          { value: photoCount || '—', label: 'photos' },
          { value: commentTotal || '—', label: 'comments' },
          { value: activeCreators || '—', label: 'active creators' },
        ],
      },
    ]
  }, [activeCreators, commentTotal, data?.length, featuredDelvers, photoCount])

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    window.setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
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

  useEffect(() => {
    if (!shareMsg) return
    const t = window.setTimeout(() => setShareMsg(''), 1400)
    return () => window.clearTimeout(t)
  }, [shareMsg])

  const onShare = async (postId: number) => {
    const url = `${window.location.origin}/posts/${postId}`
    try {
      await navigator.clipboard.writeText(url)
      setShareMsg('Link copied')
    } catch {
      setShareMsg('Copy failed')
    }
  }

  const clearFilters = () => {
    setQuickFilter('')
    setSearchInput('')
    setFeedTab('foryou')
  }

  const hasFilters = !!(quickFilter || searchInput.trim() || feedTab !== 'foryou')

  const resultsHint = useMemo(() => {
    if (searchInput.trim()) return `${filteredPosts.length} result${filteredPosts.length === 1 ? '' : 's'} for "${searchInput.trim()}"`
    if (quickFilter || feedTab !== 'foryou') return `${filteredPosts.length} post${filteredPosts.length === 1 ? '' : 's'} match your filters`
    return 'Travel moments, tips, route notes, and photos from Delvers.'
  }, [filteredPosts.length, feedTab, quickFilter, searchInput])

  const quickChips = QUICK_FILTERS.map(({ id, label, Icon }) => ({ id, label, Icon, active: quickFilter === id }))

  return (
    <div className="dv-page disc-page mk-page ev-page">
      <div className="dv-page__top">
        <MarketplaceHero
          className="dv-page__hero"
          title="Discover Delvers"
          subtitle="Explore traveller posts, local tips, route notes, food finds, and real travel moments before you go."
          support="Use the feed to find practical proof from people who have been there."
          action={
            profile ? (
              <Link to="/delvers/new" className="btn btn-primary dv-page__create-btn">
                <Plus size={16} strokeWidth={2.5} aria-hidden />
                Share a moment
              </Link>
            ) : (
              <Link to="/community" className="btn btn-primary dv-page__create-btn">
                <Users size={16} strokeWidth={2.5} aria-hidden />
                Join the community
              </Link>
            )
          }
        />

        <div className="acc-page__search dv-page__search">
          <label className="visually-hidden" htmlFor="dv-search">
            Search Delvers
          </label>
          <div className="acc-page__search-inner">
            <Search className="acc-page__search-icon" size={18} strokeWidth={2} aria-hidden />
            <input
              id="dv-search"
              ref={searchInputRef}
              type="search"
              className="acc-page__search-input input"
              placeholder="Search people, places, posts, tips, routes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
            {searchInput ? (
              <button type="button" className="acc-page__search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        <nav className="dv-page__tabs" role="tablist" aria-label="Feed tabs">
          {FEED_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={feedTab === id}
              className={`dv-page__tab${feedTab === id ? ' dv-page__tab--active' : ''}`}
              onClick={() => setFeedTab(id)}
            >
              <Icon size={14} strokeWidth={2.25} aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <QuickFilterChips
          chips={quickChips}
          onChipClick={(id) => setQuickFilter((v) => (v === id ? '' : id))}
          ariaLabel="Delvers topic filters"
          className="dv-page__quick-chips"
        />

        {hasFilters ? (
          <div className="dv-page__active-filters">
            <button type="button" className="dv-page__clear" onClick={clearFilters}>
              Show all
            </button>
          </div>
        ) : null}
      </div>

      <p className="dv-page__results-hint" role="status">
        {resultsHint}
      </p>

      {shareMsg ? <p className="dv-page__toast" role="status">{shareMsg}</p> : null}

      <div className="disc-page__layout dv-page__layout">
        <main className="disc-page__main dv-page__main" ref={feedRef}>
          {isError ? (
            <EmptyState
              iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
              title="We couldn't load Delvers"
              sub="Please check your connection and try again."
              cta={{ label: 'Try again', onClick: () => void refetch() }}
            />
          ) : null}

          {isLoading && !isError ? <ListSkeleton count={4} className="dv-page__skeleton" /> : null}

          {!isLoading && !isError && data?.length === 0 ? (
            <EmptyState
              iconElement={<Camera size={28} strokeWidth={2} aria-hidden />}
              title="No posts yet"
              sub="Travel moments, tips, routes, and photos will appear here once Delvers start sharing."
              cta={profile ? { label: 'Share a moment', to: '/delvers/new' } : { label: 'Join the community', to: '/community' }}
            />
          ) : null}

          {!isLoading && !isError && filteredPosts.length === 0 && data && data.length > 0 ? (
            <EmptyState
              iconElement={<Search size={28} strokeWidth={2} aria-hidden />}
              title="No Delvers or posts found"
              sub="Try changing your search, topic, or filters."
              cta={{ label: 'Show all', onClick: clearFilters }}
            />
          ) : null}

          {!isLoading && !isError && filteredPosts.length > 0 ? (
            <>
              {featuredDelvers.length > 0 && !hasFilters ? (
                <section className="dv-page__featured" aria-labelledby="dv-featured-title">
                  <div className="dv-page__section-head">
                    <div>
                      <h2 id="dv-featured-title">Travel creators to explore</h2>
                      <p>Travellers and locals sharing practical posts for your next trip.</p>
                    </div>
                  </div>
                  <div className="dv-page__profiles h-scroll">
                    {featuredDelvers.map((d) => <FeaturedDelverCard key={d.username} delver={d} />)}
                  </div>
                </section>
              ) : null}

              <section className="dv-page__composer" aria-labelledby="dv-composer-title">
                <h2 id="dv-composer-title" className="visually-hidden">Share a travel moment</h2>
                <div className="dv-composer-card">
                  <p className="dv-composer-card__title">Have something useful to share?</p>
                  <p className="dv-composer-card__text">Post a travel tip, route note, photo, or local moment for other Delvers.</p>
                  {profile ? (
                    <Link to="/delvers/new" className="btn btn-primary dv-composer-card__btn">
                      <Camera size={15} strokeWidth={2.25} aria-hidden />
                      Share a moment
                    </Link>
                  ) : (
                    <Link to="/community" className="btn btn-primary dv-composer-card__btn">
                      <Users size={15} strokeWidth={2.25} aria-hidden />
                      Join the community
                    </Link>
                  )}
                </div>
              </section>

              <section className="dv-page__feed" aria-labelledby="dv-feed-title">
                <h2 id="dv-feed-title" className="visually-hidden">Delvers feed</h2>
                <div className="dv-feed">
                  {filteredPosts.map((post) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      profile={!!profile}
                      likeBusy={likeMut.isPending && likeMut.variables === post.id}
                      saveBusy={saveMut.isPending && saveMut.variables === post.id}
                      onLike={() => profile && likeMut.mutate(post.id)}
                      onSave={() => profile && saveMut.mutate(post.id)}
                      onShare={() => onShare(post.id)}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </main>

        <DiscoverySidebar sections={sidebarSections} ariaLabel="Delvers discovery" />
      </div>

      {searchOpen ? (
        <div className="dv-search-overlay" role="dialog" aria-modal="true" aria-label="Search Delvers">
          <div className="dv-search-overlay__backdrop" onClick={closeSearch} aria-hidden />
          <div className="dv-search-overlay__panel">
            <div className="dv-search-overlay__head">
              <Search size={18} strokeWidth={2.25} aria-hidden />
              <input
                type="search"
                className="dv-search-overlay__input"
                placeholder="Search people, places, posts, tips, routes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
                enterKeyHint="search"
              />
              <button type="button" className="dv-search-overlay__close" onClick={closeSearch} aria-label="Close search">
                <X size={20} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <p className="dv-search-overlay__hint">Find a moment, traveller, or place without leaving the feed.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FeaturedDelverCard({ delver }: { delver: DelverProfile }) {
  return (
    <Link to={`/u/${encodeURIComponent(delver.username)}`} className="dv-profile-card">
      <div className="dv-profile-card__avatar" aria-hidden>
        {delver.avatar ? <img src={mediaUrl(delver.avatar) || delver.avatar} alt="" /> : <UserRound size={22} strokeWidth={2} />}
      </div>
      <p className="dv-profile-card__name">{delver.display_name}</p>
      <p className="dv-profile-card__username">@{delver.username}</p>
      {delver.region ? (
        <p className="dv-profile-card__region">
          <MapPin size={11} strokeWidth={2.25} aria-hidden />
          {delver.region}
        </p>
      ) : null}
      <p className="dv-profile-card__stats">
        {delver.postCount} {delver.postCount === 1 ? 'post' : 'posts'}
        {delver.totalLikes > 0 ? ` · ${formatCount(delver.totalLikes)} likes` : ''}
      </p>
      <span className="dv-profile-card__cta">
        Open profile
        <ArrowRight size={13} strokeWidth={2.5} aria-hidden />
      </span>
    </Link>
  )
}

function FeedPostCard({
  post,
  profile,
  likeBusy,
  saveBusy,
  onLike,
  onSave,
  onShare,
}: {
  post: PinPost
  profile: boolean
  likeBusy: boolean
  saveBusy: boolean
  onLike: () => void
  onSave: () => void
  onShare: () => void
}) {
  const name = post.author.display_name || post.author.username
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const imgSrc = post.image ? mediaUrl(post.image) : null
  const vidSrc = post.video ? mediaUrl(post.video) : null
  const when = formatWhen(post.created_at)
  const preview = postPreview(post)

  return (
    <article className="dv-feed-card card" data-dv-post-id={post.id}>
      <header className="dv-feed-card__head">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="dv-feed-card__author">
          <span className="dv-feed-card__avatar" aria-hidden>
            {post.author.avatar ? <img src={mediaUrl(post.author.avatar) || ''} alt="" /> : initial}
          </span>
          <span className="dv-feed-card__author-meta">
            <strong>{name}</strong>
            <span>@{post.author.username}</span>
          </span>
        </Link>
        {post.region ? (
          <span className="dv-feed-card__location">
            <MapPin size={12} strokeWidth={2.25} aria-hidden />
            {post.region}
          </span>
        ) : null}
      </header>

      <Link to={`/posts/${post.id}`} className="dv-feed-card__body-link">
        {vidSrc ? (
          <div className="dv-feed-card__media">
            <video src={vidSrc} muted playsInline preload="metadata" poster={imgSrc || undefined} />
            <span className="dv-feed-card__media-badge" aria-hidden>
              <Video size={14} strokeWidth={2.25} />
            </span>
          </div>
        ) : imgSrc ? (
          <div className="dv-feed-card__media">
            <img src={imgSrc} alt={preview} loading="lazy" />
          </div>
        ) : (
          <div className="dv-feed-card__media dv-feed-card__media--text">
            <Compass size={28} strokeWidth={1.75} aria-hidden />
          </div>
        )}

        <div className="dv-feed-card__copy">
          {post.delvers_board ? <span className="dv-feed-card__topic">{post.delvers_board}</span> : null}
          <p className="dv-feed-card__caption">{preview}</p>
          {when ? <p className="dv-feed-card__date">{when}</p> : null}
        </div>
      </Link>

      <footer className="dv-feed-card__actions">
        {profile ? (
          <button
            type="button"
            className={`dv-feed-card__action${post.liked_by_me ? ' dv-feed-card__action--liked' : ''}`}
            onClick={onLike}
            disabled={likeBusy}
            aria-label={post.liked_by_me ? 'Unlike' : 'Like'}
          >
            <Heart size={16} strokeWidth={2.25} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden />
            {formatCount(post.likes_count || 0)}
          </button>
        ) : (
          <Link to="/login" className="dv-feed-card__action" aria-label="Like">
            <Heart size={16} strokeWidth={2.25} aria-hidden />
            {formatCount(post.likes_count || 0)}
          </Link>
        )}

        <Link to={`/posts/${post.id}`} className="dv-feed-card__action" aria-label="View comments">
          <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
          {post.comments_count ? formatCount(post.comments_count) : 'Comment'}
        </Link>

        {profile ? (
          <button
            type="button"
            className={`dv-feed-card__action${post.saved_by_me ? ' dv-feed-card__action--saved' : ''}`}
            onClick={onSave}
            disabled={saveBusy}
            aria-label={post.saved_by_me ? 'Unsave' : 'Save'}
          >
            <Bookmark size={16} strokeWidth={2.25} fill={post.saved_by_me ? 'currentColor' : 'none'} aria-hidden />
            {formatCount(post.saves_count || 0)}
          </button>
        ) : (
          <Link to="/login" className="dv-feed-card__action" aria-label="Save">
            <Bookmark size={16} strokeWidth={2.25} aria-hidden />
            {formatCount(post.saves_count || 0)}
          </Link>
        )}

        <button type="button" className="dv-feed-card__action" onClick={onShare} aria-label="Share post">
          <Share2 size={16} strokeWidth={2.25} aria-hidden />
          Share
        </button>

        <Link to={`/posts/${post.id}`} className="dv-feed-card__view">
          View post
          <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
        </Link>
      </footer>
    </article>
  )
}
