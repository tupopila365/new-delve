import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, Bookmark, Camera, Compass, Heart, Home, MapPin, MessageCircle, Plus, Search, Share2, UserRound, Video, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DelversCommentComposer } from '../components/DelversCommentComposer'
import { DelversCommentsPanel } from '../components/DelversCommentsPanel'
import { EmptyState } from '../components/ui'
import '../delvers-topbar-clean.css'
import '../delvers-stories-polish.css'
import '../delvers-post-card-polish.css'
import '../delvers-feed-mobile.css'
import '../delvers-empty-loading.css'
import '../delvers-story-viewer.css'

type FeedTab = 'foryou' | 'nearby' | 'trending' | 'photos' | 'tips'

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

type Creator = {
  username: string
  display_name: string
  avatar: string | null
  region: string
  posts: number
  likes: number
}

type StoryTarget = {
  kind: 'creator' | 'place'
  title: string
  subtitle: string
  avatar: string | null
  posts: PinPost[]
}

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'foryou', label: 'For you' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'trending', label: 'Trending' },
  { id: 'photos', label: 'Photos' },
  { id: 'tips', label: 'Tips' },
]

const PLACES = ['Windhoek', 'Swakopmund', 'Etosha', 'Sossusvlei', 'Walvis Bay']

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-NA', { day: 'numeric', month: 'short' })
}

function postText(post: PinPost): string {
  const text = post.body?.trim()
  if (text) return text
  if (post.delvers_board) return post.delvers_board
  if (post.region) return `Travel moment from ${post.region}`
  return 'Travel moment'
}

function likesLabel(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'like' : 'likes'}`
}

function commentsLabel(count?: number): string {
  if (!count) return 'View comments'
  return `View all ${formatCount(count)} ${count === 1 ? 'comment' : 'comments'}`
}

export function DelversSocial() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<FeedTab>('foryou')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [storyTarget, setStoryTarget] = useState<StoryTarget | null>(null)
  const [storyIndex, setStoryIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()
  const qk = ['delvers-social', profile?.region] as const

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

  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
  }, [searchOpen])

  const creators = useMemo((): Creator[] => {
    const map = new Map<string, Creator>()
    for (const post of data ?? []) {
      const key = post.author.username
      const current = map.get(key)
      if (current) {
        current.posts += 1
        current.likes += post.likes_count
        if (!current.region) current.region = post.region
      } else {
        map.set(key, {
          username: post.author.username,
          display_name: post.author.display_name || post.author.username,
          avatar: post.author.avatar ?? null,
          region: post.region || '',
          posts: 1,
          likes: post.likes_count,
        })
      }
    }
    return [...map.values()].sort((a, b) => b.likes - a.likes || b.posts - a.posts).slice(0, 10)
  }, [data])

  const posts = useMemo(() => {
    let list = [...(data ?? [])]
    const homeRegion = profile?.region?.trim().toLowerCase()

    if (tab === 'nearby' && homeRegion) list = list.filter((p) => p.region?.trim().toLowerCase() === homeRegion)
    if (tab === 'trending') list = list.sort((a, b) => b.likes_count + b.saves_count - (a.likes_count + a.saves_count))
    if (tab === 'photos') list = list.filter((p) => p.image || p.video)
    if (tab === 'tips') list = list.filter((p) => !p.image && !p.video && p.body?.trim())

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => [p.body, p.region, p.delvers_board, p.author.username, p.author.display_name].join(' ').toLowerCase().includes(q))
    }

    return list
  }, [data, profile?.region, query, tab])

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/delvers`)
      setToast('Link copied')
      window.setTimeout(() => setToast(''), 1400)
    } catch {
      setToast('Copy failed')
      window.setTimeout(() => setToast(''), 1400)
    }
  }

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSearchOpen(false)
  }

  const closeSearch = () => {
    setQuery('')
    setSearchOpen(false)
  }

  const showAll = () => {
    setTab('foryou')
    setQuery('')
  }

  const refreshFeed = () => {
    void qc.invalidateQueries({ queryKey: qk })
  }

  const openCreatorStories = (creator: Creator) => {
    const rows = (data ?? []).filter((post) => post.author.username === creator.username)
    if (rows.length === 0) return
    setStoryTarget({
      kind: 'creator',
      title: creator.display_name,
      subtitle: `@${creator.username} · ${rows.length} ${rows.length === 1 ? 'story' : 'stories'}`,
      avatar: creator.avatar,
      posts: rows,
    })
    setStoryIndex(0)
  }

  const openPlaceStories = (place: string) => {
    const placeKey = place.trim().toLowerCase()
    const rows = (data ?? []).filter((post) => post.region?.trim().toLowerCase().includes(placeKey))
    if (rows.length === 0) {
      setQuery(place)
      return
    }
    setStoryTarget({
      kind: 'place',
      title: place,
      subtitle: `${rows.length} ${rows.length === 1 ? 'story' : 'stories'} from this place`,
      avatar: null,
      posts: rows,
    })
    setStoryIndex(0)
  }

  return (
    <div className="ds-page">
      <header className="ds-topbar ds-topbar--clean">
        <Link to="/delvers" className="ds-brand">DELVE <span>Delvers</span></Link>
        <nav className="ds-tabs" aria-label="Delvers feed tabs">
          {TABS.map((item) => (
            <button key={item.id} type="button" className={`ds-tab${tab === item.id ? ' ds-tab--active' : ''}`} onClick={() => setTab(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ds-topbar__actions">
          <form
            className={`ds-topbar-search${searchOpen || query ? ' ds-topbar-search--open' : ''}`}
            role="search"
            aria-label="Search Delvers"
            onSubmit={onSearchSubmit}
          >
            <button type="button" className="ds-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Open Delvers search">
              <Search size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Delvers"
              aria-label="Search posts, places, routes, creators"
            />
            {searchOpen || query ? (
              <button type="button" className="ds-search-close" onClick={closeSearch} aria-label="Clear search">
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
          </form>
          <Link to={profile ? '/delvers/new' : '/community'} className="ds-create">
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            {profile ? 'Create' : 'Join'}
          </Link>
        </div>
      </header>

      <main className="ds-main ds-main--centered">
        <section className="ds-stories ds-stories--polished" aria-label="Creators and places">
          <CreateBubble signedIn={!!profile} />
          {creators.map((creator) => <CreatorBubble key={creator.username} creator={creator} onOpen={() => openCreatorStories(creator)} />)}
          {PLACES.map((place) => (
            <button key={place} type="button" className="ds-place-bubble" onClick={() => openPlaceStories(place)}>
              <span><MapPin size={18} strokeWidth={2.25} /></span>
              <small>{place}</small>
            </button>
          ))}
        </section>

        {toast ? <p className="ds-toast" role="status">{toast}</p> : null}
        {isLoading ? <DelversFeedSkeleton /> : null}

        {isError ? (
          <EmptyState
            iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
            title="We couldn't load Delvers"
            sub="Please check your connection and try again."
            cta={{ label: 'Try again', onClick: () => void refetch() }}
          />
        ) : null}

        {!isLoading && !isError && posts.length === 0 ? (
          <DelversEmptyState signedIn={!!profile} onShowAll={showAll} />
        ) : null}

        <section id="delvers-feed" className="ds-feed" aria-label="Delvers feed">
          {posts.map((post) => (
            <SocialPost
              key={post.id}
              post={post}
              signedIn={!!profile}
              likeBusy={likeMut.isPending && likeMut.variables === post.id}
              saveBusy={saveMut.isPending && saveMut.variables === post.id}
              onLike={() => profile && likeMut.mutate(post.id)}
              onSave={() => profile && saveMut.mutate(post.id)}
              onShare={onShare}
              onCommented={refreshFeed}
            />
          ))}
        </section>
      </main>

      <nav className="ds-mobile-actions" aria-label="Delvers mobile actions">
        <Link to="/" className="ds-mobile-action">
          <Home size={20} strokeWidth={2.25} aria-hidden />
          <span>Home</span>
        </Link>
        <button type="button" className="ds-mobile-action" onClick={() => setSearchOpen(true)}>
          <Search size={20} strokeWidth={2.25} aria-hidden />
          <span>Search</span>
        </button>
        <Link to={profile ? '/delvers/new' : '/community'} className="ds-mobile-action ds-mobile-action--create">
          <Plus size={20} strokeWidth={2.5} aria-hidden />
          <span>{profile ? 'Create' : 'Join'}</span>
        </Link>
        <Link to={profile ? '/messages' : '/login'} className="ds-mobile-action">
          <Bell size={20} strokeWidth={2.25} aria-hidden />
          <span>Alerts</span>
        </Link>
        <Link to={profile ? '/account' : '/login'} className="ds-mobile-action">
          <UserRound size={20} strokeWidth={2.25} aria-hidden />
          <span>Profile</span>
        </Link>
      </nav>

      {storyTarget ? (
        <StoryViewer
          target={storyTarget}
          index={storyIndex}
          onIndex={setStoryIndex}
          onClose={() => setStoryTarget(null)}
        />
      ) : null}
    </div>
  )
}

function CreateBubble({ signedIn }: { signedIn: boolean }) {
  return (
    <Link to={signedIn ? '/delvers/new' : '/community'} className="ds-create-bubble">
      <span><Plus size={22} strokeWidth={2.5} aria-hidden /></span>
      <small>{signedIn ? 'Create' : 'Join'}</small>
    </Link>
  )
}

function CreatorBubble({ creator, onOpen }: { creator: Creator; onOpen: () => void }) {
  const avatar = mediaUrl(creator.avatar)
  return (
    <button type="button" className="ds-creator-bubble" onClick={onOpen} aria-label={`Open stories by ${creator.display_name}`}>
      <span>{avatar ? <img src={avatar} alt="" /> : <UserRound size={22} strokeWidth={2} />}</span>
      <small>{creator.display_name}</small>
    </button>
  )
}

function DelversFeedSkeleton() {
  return (
    <section className="ds-feed-skeleton" aria-label="Loading Delvers posts">
      {[0, 1, 2].map((item) => (
        <article className="ds-skeleton-post" key={item} aria-hidden="true">
          <div className="ds-skeleton-head">
            <span className="ds-skeleton-avatar" />
            <span className="ds-skeleton-lines">
              <span className="ds-skeleton-line ds-skeleton-line--medium" />
              <span className="ds-skeleton-line ds-skeleton-line--short" />
            </span>
          </div>
          <div className="ds-skeleton-media" />
          <div className="ds-skeleton-actions">
            <span className="ds-skeleton-chip" />
            <span className="ds-skeleton-chip" />
            <span className="ds-skeleton-chip" />
            <span className="ds-skeleton-chip" />
          </div>
          <div className="ds-skeleton-copy">
            <span className="ds-skeleton-line ds-skeleton-line--short" />
            <span className="ds-skeleton-line ds-skeleton-line--wide" />
            <span className="ds-skeleton-line ds-skeleton-line--medium" />
          </div>
        </article>
      ))}
    </section>
  )
}

function DelversEmptyState({ signedIn, onShowAll }: { signedIn: boolean; onShowAll: () => void }) {
  return (
    <section className="ds-empty-social" aria-label="No Delvers posts">
      <div>
        <span className="ds-empty-social__icon"><Camera size={30} strokeWidth={2.1} aria-hidden /></span>
        <h2>No posts yet</h2>
        <p>Share the first Delvers moment, travel tip, route discovery, or local story for others to explore.</p>
        <div className="ds-empty-social__actions">
          <Link to={signedIn ? '/delvers/new' : '/community'} className="ds-empty-social__primary">
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            {signedIn ? 'Create post' : 'Join Delvers'}
          </Link>
          <button type="button" className="ds-empty-social__secondary" onClick={onShowAll}>Show all</button>
        </div>
      </div>
    </section>
  )
}

function StoryViewer({ target, index, onIndex, onClose }: {
  target: StoryTarget
  index: number
  onIndex: (next: number) => void
  onClose: () => void
}) {
  const post = target.posts[index]
  const image = mediaUrl(post?.image ?? null)
  const video = mediaUrl(post?.video ?? null)
  const caption = post ? postText(post) : ''
  const canPrev = index > 0
  const canNext = index < target.posts.length - 1

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft' && canPrev) onIndex(index - 1)
      if (event.key === 'ArrowRight' && canNext) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canNext, canPrev, index, onClose, onIndex])

  if (!post) return null

  return (
    <div className="ds-story-viewer" role="dialog" aria-modal="true" aria-label={`${target.title} stories`}>
      <article className="ds-story-viewer__card">
        <div className="ds-story-viewer__progress" aria-hidden>
          {target.posts.map((story, storyPosition) => (
            <span key={story.id} className={storyPosition < index ? 'is-seen' : storyPosition === index ? 'is-active' : ''} />
          ))}
        </div>

        <header className="ds-story-viewer__head">
          <span className="ds-story-viewer__avatar">
            {target.avatar ? <img src={mediaUrl(target.avatar) || ''} alt="" /> : target.kind === 'place' ? <MapPin size={20} strokeWidth={2.25} aria-hidden /> : target.title.charAt(0).toUpperCase()}
          </span>
          <span className="ds-story-viewer__meta">
            <strong>{target.title}</strong>
            <small>{target.subtitle}</small>
          </span>
          <button type="button" className="ds-story-viewer__close" onClick={onClose} aria-label="Close stories">
            <X size={19} strokeWidth={2.35} aria-hidden />
          </button>
        </header>

        <div className="ds-story-viewer__media">
          {image ? <img src={image} alt={caption} /> : video ? <video src={video} controls autoPlay playsInline /> : <div className="ds-story-viewer__note"><Compass size={34} strokeWidth={2} aria-hidden /><p>{caption}</p></div>}
        </div>
        <div className="ds-story-viewer__scrim" aria-hidden />

        <button type="button" className="ds-story-viewer__nav ds-story-viewer__nav--prev" disabled={!canPrev} onClick={() => onIndex(index - 1)} aria-label="Previous story" />
        <button type="button" className="ds-story-viewer__nav ds-story-viewer__nav--next" disabled={!canNext} onClick={() => onIndex(index + 1)} aria-label="Next story" />

        <div className="ds-story-viewer__caption">
          <p>{caption}</p>
        </div>
      </article>
    </div>
  )
}

function SocialPost({ post, signedIn, likeBusy, saveBusy, onLike, onSave, onShare, onCommented }: {
  post: PinPost
  signedIn: boolean
  likeBusy: boolean
  saveBusy: boolean
  onLike: () => void
  onSave: () => void
  onShare: () => void
  onCommented: () => void
}) {
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const lastTapRef = useRef(0)
  const name = post.author.display_name || post.author.username
  const avatar = mediaUrl(post.author.avatar ?? null)
  const image = mediaUrl(post.image)
  const video = mediaUrl(post.video)
  const text = postText(post)
  const date = formatDate(post.created_at)
  const commentCount = post.comments_count ?? 0

  const handleCommented = () => {
    onCommented()
    setCommentsOpen(true)
  }

  return (
    <article className="ds-post">
      <header className="ds-post__head">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="ds-post__author">
          <span>{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</span>
          <strong>{name}<small>@{post.author.username}</small></strong>
        </Link>
        {post.region ? <span className="ds-post__region"><MapPin size={13} strokeWidth={2.25} aria-hidden />{post.region}</span> : null}
      </header>

      <div
        className="ds-post__media"
        role="img"
        aria-label={`${image || video ? 'Photo' : 'Note'} by ${name}. Double-tap to like.`}
        onDoubleClick={() => {
          if (!signedIn) return
          onLike()
          setHeartBurst(true)
          window.setTimeout(() => setHeartBurst(false), 720)
        }}
        onTouchEnd={(e) => {
          const now = Date.now()
          if (now - lastTapRef.current < 320) {
            if (signedIn) {
              onLike()
              setHeartBurst(true)
              window.setTimeout(() => setHeartBurst(false), 720)
            }
            lastTapRef.current = 0
            e.preventDefault()
          } else {
            lastTapRef.current = now
          }
        }}
      >
        {image ? (
          <img src={image} alt={text} loading="lazy" />
        ) : video ? (
          <div className="ds-post__video"><Video size={34} strokeWidth={2} aria-hidden /><span>Video clip</span></div>
        ) : (
          <div className="ds-post__text-media"><Compass size={34} strokeWidth={2} aria-hidden /><span>Travel note</span></div>
        )}
        {heartBurst ? (
          <span className="ds-post__heart-burst" aria-hidden>
            <Heart size={72} strokeWidth={2} fill="currentColor" />
          </span>
        ) : null}
      </div>

      <div className="ds-post__actions" aria-label="Post actions">
        {signedIn ? (
          <button type="button" onClick={onLike} disabled={likeBusy} className={post.liked_by_me ? 'is-active' : ''} aria-label={post.liked_by_me ? 'Unlike post' : 'Like post'}>
            <Heart size={22} strokeWidth={2.25} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : <Link to="/login" aria-label="Like post"><Heart size={22} strokeWidth={2.25} aria-hidden /></Link>}
        {signedIn ? (
          <button type="button" onClick={() => setCommentOpen((open) => !open)} className={commentOpen ? 'is-active' : ''} aria-label={commentOpen ? 'Close comment box' : 'Write comment'}>
            <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
          </button>
        ) : <Link to="/login" aria-label="Write comment"><MessageCircle size={22} strokeWidth={2.25} aria-hidden /></Link>}
        <button type="button" onClick={onShare} aria-label="Share post"><Share2 size={22} strokeWidth={2.25} aria-hidden /></button>
        {signedIn ? (
          <button type="button" onClick={onSave} disabled={saveBusy} className={`ds-post__action--save${post.saved_by_me ? ' is-active' : ''}`} aria-label={post.saved_by_me ? 'Unsave post' : 'Save post'}>
            <Bookmark size={22} strokeWidth={2.25} fill={post.saved_by_me ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : <Link to="/login" className="ds-post__action--save" aria-label="Save post"><Bookmark size={22} strokeWidth={2.25} aria-hidden /></Link>}
      </div>

      {commentOpen ? (
        <DelversCommentComposer postId={post.id} onClose={() => setCommentOpen(false)} onCommented={handleCommented} />
      ) : null}

      <div className="ds-post__copy">
        <p className="ds-post__likes">{likesLabel(post.likes_count || 0)}</p>
        <p className="ds-post__caption">
          <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="ds-post__caption-author">{post.author.username}</Link>{' '}
          <span>{text}</span>
        </p>
        {post.delvers_board ? <span className="ds-post__topic">{post.delvers_board}</span> : null}
        <button type="button" className="ds-post__comments" onClick={() => setCommentsOpen((open) => !open)} aria-expanded={commentsOpen}>
          {commentsOpen ? 'Hide comments' : commentsLabel(commentCount)}
        </button>
        {date ? <small className="ds-post__date">{date}</small> : null}
      </div>

      <DelversCommentsPanel postId={post.id} open={commentsOpen} count={commentCount} />
    </article>
  )
}
