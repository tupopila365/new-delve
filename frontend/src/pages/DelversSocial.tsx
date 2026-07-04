import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, Bookmark, Camera, Compass, Heart, Home, MapPin, MessageCircle, Plus, Search, Share2, UserRound, Video, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DelversCommentComposer } from '../components/DelversCommentComposer'
import { DelversCommentsPanel } from '../components/DelversCommentsPanel'
import { ReportButton } from '../components/report/ReportButton'
import { PostMedia } from '../components/PostMedia'
import { SponsoredListingFeedCard } from '../components/social/SponsoredListingFeedCard'
import {
  type DelversFeedPost,
  type DelversFeedItem,
  isFeedPost,
  isSponsoredListingItem,
} from '../components/social/delversFeedTypes'
import { EmptyState } from '../components/ui'
import { invalidatePostEngagementCaches, invalidateSocialCaches } from '../utils/socialCache'
import { copyPostPermalink, postPermalinkPath } from '../utils/postPermalink'
import '../delvers-topbar-clean.css'
import '../delvers-stories-polish.css'
import '../delvers-post-card-polish.css'
import '../delvers-feed-mobile.css'
import '../delvers-empty-loading.css'
import '../delvers-story-viewer.css'
import '../components/Featured.css'

type FeedTab = 'foryou' | 'nearby' | 'trending' | 'photos' | 'tips'

type PinPost = DelversFeedPost

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
  username?: string
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

function postEntry(profile: ReturnType<typeof useAuth>['profile']) {
  if (profile) {
    return { to: '/create', label: 'Post', ariaLabel: 'Post photo, story, or journey' }
  }
  return { to: '/login', label: 'Join', ariaLabel: 'Sign in to post on Delvers' }
}

export function DelversSocial() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<FeedTab>('foryou')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileChromeHidden, setMobileChromeHidden] = useState(false)
  const [toast, setToast] = useState('')
  const [storyTarget, setStoryTarget] = useState<StoryTarget | null>(null)
  const [storyIndex, setStoryIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastScrollTopRef = useRef(0)
  const qc = useQueryClient()
  const qk = ['delvers-social', profile?.region] as const

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk,
    queryFn: () =>
      apiFetch<DelversFeedItem[]>(
        `/api/social/delvers/${profile?.region ? `?region=${encodeURIComponent(profile.region)}` : ''}`,
        { auth: false },
      ),
  })

  const likeMut = useMutation({
    mutationFn: (post: PinPost) => apiFetch(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onSuccess: (_data, post) => {
      void invalidatePostEngagementCaches(qc, {
        queryKey: qk,
        authorUsername: post.author.username,
      })
    },
  })

  const saveMut = useMutation({
    mutationFn: (post: PinPost) => apiFetch(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onSuccess: (_data, post) => {
      void invalidatePostEngagementCaches(qc, {
        queryKey: qk,
        authorUsername: post.author.username,
      })
    },
  })

  useEffect(() => {
    if (!searchOpen) return
    searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const onScroll = () => {
      const viewportWidth = window.innerWidth
      if (viewportWidth > 700) {
        setMobileChromeHidden(false)
        lastScrollTopRef.current = 0
        return
      }

      const top = Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop, 0)
      const delta = top - lastScrollTopRef.current

      if (top <= 8) {
        setMobileChromeHidden(false)
      } else if (delta > 6) {
        setMobileChromeHidden(true)
      } else if (delta < -6) {
        setMobileChromeHidden(false)
      }

      lastScrollTopRef.current = top
    }

    const onResize = () => {
      if (window.innerWidth > 700) setMobileChromeHidden(false)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const creators = useMemo((): Creator[] => {
    const map = new Map<string, Creator>()
    for (const post of (data ?? []).filter(isFeedPost)) {
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

    if (tab === 'nearby' && homeRegion) {
      list = list.filter((p) => {
        if (isSponsoredListingItem(p)) {
          return (p.listing_subtitle || '').toLowerCase().includes(homeRegion)
        }
        return p.region?.trim().toLowerCase() === homeRegion
      })
    }
    if (tab === 'trending') {
      list.sort((a, b) => {
        const sa = isFeedPost(a) ? a.likes_count + a.saves_count : -1
        const sb = isFeedPost(b) ? b.likes_count + b.saves_count : -1
        return sb - sa
      })
    }
    if (tab === 'photos') {
      list = list.filter((p) => (isFeedPost(p) ? p.image || p.video : Boolean(p.listing_image)))
    }
    if (tab === 'tips') {
      list = list.filter((p) => isFeedPost(p) && !p.image && !p.video && p.body?.trim())
    }

    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        if (isSponsoredListingItem(p)) {
          return [p.listing_title, p.listing_subtitle, p.listing_meta, p.listing_type].join(' ').toLowerCase().includes(q)
        }
        return [p.body, p.region, p.delvers_board, p.author.username, p.author.display_name].join(' ').toLowerCase().includes(q)
      })
    }

    return list
  }, [data, profile?.region, query, tab])

  const onShare = async (postId: number) => {
    try {
      await copyPostPermalink(postId)
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
    void invalidateSocialCaches(qc, { username: profile?.username })
  }

  const openCreatorStories = (creator: Creator) => {
    const rows = (data ?? []).filter(isFeedPost).filter((post) => post.author.username === creator.username)
    if (rows.length === 0) return
    setStoryTarget({
      kind: 'creator',
      title: creator.display_name,
      subtitle: `@${creator.username} · ${rows.length} ${rows.length === 1 ? 'highlight' : 'highlights'}`,
      avatar: creator.avatar,
      username: creator.username,
      posts: rows,
    })
    setStoryIndex(0)
  }

  const openPlaceStories = (place: string) => {
    const placeKey = place.trim().toLowerCase()
    const rows = (data ?? []).filter(isFeedPost).filter((post) => post.region?.trim().toLowerCase().includes(placeKey))
    if (rows.length === 0) {
      setQuery(place)
      return
    }
    setStoryTarget({
      kind: 'place',
      title: place,
      subtitle: `${rows.length} ${rows.length === 1 ? 'highlight' : 'highlights'} from this place`,
      avatar: null,
      posts: rows,
    })
    setStoryIndex(0)
  }

  const postAction = postEntry(profile)

  return (
    <div className={mobileChromeHidden ? 'ds-page ds-page--chrome-hidden' : 'ds-page'}>
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
          <Link to={postAction.to} className="ds-post-entry" aria-label={postAction.ariaLabel}>
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            {postAction.label}
          </Link>
        </div>
      </header>

      <main className="ds-main ds-main--centered">
        <section className="ds-stories ds-stories--polished" aria-label="Creator and place highlights">
          <CreateStoryBubble signedIn={!!profile} />
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
          {posts.map((item) =>
            isSponsoredListingItem(item) ? (
              <SponsoredListingFeedCard key={item.id} item={item} />
            ) : (
              <SocialPost
                key={item.id}
                post={item}
                signedIn={!!profile}
                likeBusy={likeMut.isPending && likeMut.variables?.id === item.id}
                saveBusy={saveMut.isPending && saveMut.variables?.id === item.id}
                onLike={() => profile && likeMut.mutate(item)}
                onSave={() => profile && saveMut.mutate(item)}
                onShare={() => void onShare(item.id)}
                onCommented={refreshFeed}
              />
            ),
          )}
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
        <Link to={postAction.to} className="ds-mobile-action ds-mobile-action--create" aria-label={postAction.ariaLabel}>
          <Plus size={20} strokeWidth={2.5} aria-hidden />
          <span>{postAction.label}</span>
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

function CreatorBubble({ creator, onOpen }: { creator: Creator; onOpen: () => void }) {
  const avatar = mediaUrl(creator.avatar)
  return (
    <button type="button" className="ds-creator-bubble" onClick={onOpen} aria-label={`Open highlights by ${creator.display_name}`}>
      <span>{avatar ? <img src={avatar} alt="" /> : <UserRound size={22} strokeWidth={2} />}</span>
      <small>{creator.display_name}</small>
    </button>
  )
}

function CreateStoryBubble({ signedIn }: { signedIn: boolean }) {
  return (
    <Link
      to={signedIn ? '/create/highlight' : '/login'}
      className="ds-create-bubble"
      aria-label={signedIn ? 'Add a highlight' : 'Sign in to add a highlight'}
    >
      <span><Video size={22} strokeWidth={2.4} aria-hidden /></span>
      <small>Highlight</small>
    </Link>
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
  const action = signedIn
    ? { to: '/create', label: 'Post something', ariaLabel: 'Post photo, story, or journey' }
    : { to: '/login', label: 'Join Delvers', ariaLabel: 'Sign in to post on Delvers' }

  return (
    <section className="ds-empty-social" aria-label="No Delvers posts">
      <div>
        <span className="ds-empty-social__icon"><Camera size={30} strokeWidth={2.1} aria-hidden /></span>
        <h2>No posts yet</h2>
        <p>Share the first Delvers moment, travel tip, route discovery, or local story for others to explore.</p>
        <div className="ds-empty-social__actions">
          <Link to={action.to} className="ds-empty-social__primary" aria-label={action.ariaLabel}>
            <Plus size={16} strokeWidth={2.5} aria-hidden />
            {action.label}
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
          {target.kind === 'creator' && target.username ? (
            <Link to={`/u/${encodeURIComponent(target.username)}`} className="ds-story-viewer__meta ds-story-viewer__meta-link">
              <strong>{target.title}</strong>
              <small>{target.subtitle}</small>
            </Link>
          ) : (
            <span className="ds-story-viewer__meta">
              <strong>{target.title}</strong>
              <small>{target.subtitle}</small>
            </span>
          )}
          <button type="button" className="ds-story-viewer__close" onClick={onClose} aria-label="Close highlights">
            <X size={19} strokeWidth={2.35} aria-hidden />
          </button>
        </header>

        <div className="ds-story-viewer__media">
          {image ? <img src={image} alt={caption} /> : video ? <video src={video} controls autoPlay playsInline /> : <div className="ds-story-viewer__note"><Compass size={34} strokeWidth={2} aria-hidden /><p>{caption}</p></div>}
        </div>
        <div className="ds-story-viewer__scrim" aria-hidden />

        <button type="button" className="ds-story-viewer__nav ds-story-viewer__nav--prev" disabled={!canPrev} onClick={() => onIndex(index - 1)} aria-label="Previous highlight" />
        <button type="button" className="ds-story-viewer__nav ds-story-viewer__nav--next" disabled={!canNext} onClick={() => onIndex(index + 1)} aria-label="Next highlight" />

        <div className="ds-story-viewer__caption">
          <p>{caption}</p>
          <Link to={postPermalinkPath(post.id)}>View post</Link>
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
  const text = postText(post)
  const hasMedia = Boolean(post.image || post.video)
  const date = formatDate(post.created_at)
  const commentCount = post.comments_count ?? 0

  const handleCommented = () => {
    onCommented()
    setCommentsOpen(true)
  }

  const permalink = postPermalinkPath(post.id)

  return (
    <article className={`ds-post${post.is_sponsored ? ' ds-post--sponsored' : ''}`}>
      {post.is_sponsored ? (
        <span className="featured-card__partner ds-post__sponsored">{post.sponsor_label || 'Sponsored'}</span>
      ) : null}
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
        aria-label={`${hasMedia ? 'Photo' : 'Note'} by ${name}. Double-tap to like.`}
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
        {hasMedia ? (
          <Link to={permalink} className="ds-post__media-link" aria-label={`Open post by ${name}`}>
            <PostMedia image={post.image} video={post.video} variant="feed" alt={text} />
          </Link>
        ) : (
          <Link to={permalink} className="ds-post__text-media" aria-label={`Open post by ${name}`}>
            <Compass size={34} strokeWidth={2} aria-hidden />
            <span>Travel note</span>
          </Link>
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
        <ReportButton
          className="ds-post__report"
          iconOnly
          triggerLabel="Report post"
          target={{
            target_type: 'post',
            target_id: String(post.id),
            target_label: post.body?.slice(0, 60) || `Post by @${post.author.username}`,
          }}
        />
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
        {post.listing ? (
          <Link to={`/accommodation/${post.listing.id}`} className="ds-post__place-chip">
            At {post.listing.title}
          </Link>
        ) : null}
        {post.event ? (
          <Link to={`/events/${post.event.id}`} className="ds-post__place-chip">
            At {post.event.title}
          </Link>
        ) : null}
        <button type="button" className="ds-post__comments" onClick={() => setCommentsOpen((open) => !open)} aria-expanded={commentsOpen}>
          {commentsOpen ? 'Hide comments' : commentsLabel(commentCount)}
        </button>
        {date ? <small className="ds-post__date">{date}</small> : null}
      </div>

      <DelversCommentsPanel postId={post.id} open={commentsOpen} count={commentCount} />
    </article>
  )
}
