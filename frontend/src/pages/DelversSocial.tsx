import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, Bookmark, Camera, Compass, Flame, Heart, Home, Hash, MapPin, MessageCircle, Plus, Search, Share2, UserRound, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from '../components/UserAvatar'
import { DelversCommentsPanel } from '../components/DelversCommentsPanel'
import { DelversCommentComposer } from '../components/DelversCommentComposer'
import { ReportButton } from '../components/report/ReportButton'
import { PostMedia } from '../components/PostMedia'
import { SponsoredListingFeedCard } from '../components/social/SponsoredListingFeedCard'
import {
  type DelversFeedPost,
  type DelversFeedItem,
  isFeedPost,
  isDelversPin,
  isSponsoredListingItem,
} from '../components/social/delversFeedTypes'
import { EmptyState } from '../components/ui'
import { invalidatePostEngagementCaches, invalidateSocialCaches } from '../utils/socialCache'
import {
  areAllHighlightsSeen,
  creatorRingKey,
  markHighlightsSeen,
  placeRingKey,
  tagRingKey,
} from '../utils/delversHighlightSeen'
import { copyPostPermalink, postPermalinkPath } from '../utils/postPermalink'
import '../components/community/community-feed-cards.css'
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
  is_following: boolean
}

type StoryTarget = {
  kind: 'creator' | 'place' | 'tag'
  title: string
  subtitle: string
  avatar: string | null
  username?: string
  tagSlug?: string
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
  return { to: '/login', label: 'Post', ariaLabel: 'Sign in to post on Delvers' }
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
  const [seenTick, setSeenTick] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastScrollTopRef = useRef(0)
  const qc = useQueryClient()
  const qk = ['delvers-social', profile?.region, profile?.username] as const
  const highlightsQk = ['delvers-highlights', profile?.region, profile?.username] as const
  const hashtagRingsQk = ['delvers-hashtag-rings', profile?.username] as const

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk,
    queryFn: () =>
      apiFetch<DelversFeedItem[]>(
        `/api/social/delvers/${profile?.region ? `?region=${encodeURIComponent(profile.region)}` : ''}`,
      ),
  })

  const { data: highlights = [] } = useQuery({
    queryKey: highlightsQk,
    queryFn: () =>
      apiFetch<DelversFeedPost[]>(
        `/api/social/delvers/highlights/${profile?.region ? `?region=${encodeURIComponent(profile.region)}` : ''}`,
      ),
  })

  const { data: hashtagRingsResp } = useQuery({
    queryKey: hashtagRingsQk,
    queryFn: () => apiFetch<{ rings: { ring_id: string; tag_slug: string; label: string; posts: PinPost[] }[] }>(
      `/api/social/delvers/hashtag-rings/`,
    ),
  })
  const hashtagRings = hashtagRingsResp?.rings ?? []

  const likeMut = useMutation({
    mutationFn: (post: PinPost) =>
      apiFetch<{ liked: boolean }>(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onMutate: async (post) => {
      await qc.cancelQueries({ queryKey: qk })
      await qc.cancelQueries({ queryKey: highlightsQk })
      const previousFeed = qc.getQueryData<DelversFeedItem[]>(qk)
      const previousHighlights = qc.getQueryData<DelversFeedPost[]>(highlightsQk)
      const patch = (item: DelversFeedPost) => {
        const liked = !item.liked_by_me
        return {
          ...item,
          liked_by_me: liked,
          likes_count: Math.max(0, item.likes_count + (liked ? 1 : -1)),
        }
      }
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) => (isFeedPost(item) && item.id === post.id ? patch(item) : item)),
      )
      qc.setQueryData<DelversFeedPost[]>(highlightsQk, (old) =>
        (old ?? []).map((item) => (item.id === post.id ? patch(item) : item)),
      )
      return { previousFeed, previousHighlights }
    },
    onError: (_err, _post, context) => {
      if (context?.previousFeed) qc.setQueryData(qk, context.previousFeed)
      if (context?.previousHighlights) qc.setQueryData(highlightsQk, context.previousHighlights)
    },
    onSuccess: (data, post) => {
      const sync = (item: DelversFeedPost) =>
        item.id === post.id ? { ...item, liked_by_me: data.liked } : item
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) => (isFeedPost(item) ? sync(item) : item)),
      )
      qc.setQueryData<DelversFeedPost[]>(highlightsQk, (old) => (old ?? []).map(sync))
      void invalidatePostEngagementCaches(qc, {
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const saveMut = useMutation({
    mutationFn: (post: PinPost) =>
      apiFetch<{ saved: boolean }>(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onMutate: async (post) => {
      await qc.cancelQueries({ queryKey: qk })
      const previous = qc.getQueryData<DelversFeedItem[]>(qk)
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) => {
          if (!isFeedPost(item) || item.id !== post.id) return item
          const saved = !item.saved_by_me
          return {
            ...item,
            saved_by_me: saved,
            saves_count: Math.max(0, item.saves_count + (saved ? 1 : -1)),
          }
        }),
      )
      return { previous }
    },
    onError: (_err, _post, context) => {
      if (context?.previous) qc.setQueryData(qk, context.previous)
    },
    onSuccess: (data, post) => {
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) => {
          if (!isFeedPost(item) || item.id !== post.id) return item
          return { ...item, saved_by_me: data.saved }
        }),
      )
      void invalidatePostEngagementCaches(qc, {
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const fireMut = useMutation({
    mutationFn: (post: PinPost) =>
      apiFetch<{ fired: boolean }>(`/api/social/posts/${post.id}/fire/`, { method: 'POST' }),
    onMutate: async (post) => {
      await qc.cancelQueries({ queryKey: qk })
      await qc.cancelQueries({ queryKey: highlightsQk })
      const previousFeed = qc.getQueryData<DelversFeedItem[]>(qk)
      const previousHighlights = qc.getQueryData<DelversFeedPost[]>(highlightsQk)
      const patch = (item: DelversFeedPost) => {
        const fired = !item.fired_by_me
        return {
          ...item,
          fired_by_me: fired,
          fires_count: Math.max(0, (item.fires_count ?? 0) + (fired ? 1 : -1)),
        }
      }
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) => (isFeedPost(item) && item.id === post.id ? patch(item) : item)),
      )
      qc.setQueryData<DelversFeedPost[]>(highlightsQk, (old) =>
        (old ?? []).map((item) => (item.id === post.id ? patch(item) : item)),
      )
      return { previousFeed, previousHighlights }
    },
    onError: (_err, _post, context) => {
      if (context?.previousFeed) qc.setQueryData(qk, context.previousFeed)
      if (context?.previousHighlights) qc.setQueryData(highlightsQk, context.previousHighlights)
    },
    onSuccess: (data, post) => {
      const sync = (item: DelversFeedPost) =>
        item.id === post.id ? { ...item, fired_by_me: data.fired } : item
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) => (isFeedPost(item) ? sync(item) : item)),
      )
      qc.setQueryData<DelversFeedPost[]>(highlightsQk, (old) => (old ?? []).map(sync))
      void invalidatePostEngagementCaches(qc, {
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const bumpHighlightCommentCount = (postId: number) => {
    const patch = <T extends DelversFeedPost>(item: T): T =>
      item.id === postId ? { ...item, comments_count: (item.comments_count ?? 0) + 1 } : item
    qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
      (old ?? []).map((item) => (isFeedPost(item) ? patch(item) : item)),
    )
    qc.setQueryData<DelversFeedPost[]>(highlightsQk, (old) => (old ?? []).map(patch))
  }

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
    for (const post of highlights) {
      const key = post.author.username
      const isFollowing = Boolean(post.is_author_followed)
      const current = map.get(key)
      if (current) {
        current.posts += 1
        current.likes += post.likes_count
        current.is_following = current.is_following || isFollowing
        if (!current.region) current.region = post.region
      } else {
        map.set(key, {
          username: post.author.username,
          display_name: post.author.display_name || post.author.username,
          avatar: post.author.avatar ?? null,
          region: post.region || '',
          posts: 1,
          likes: post.likes_count,
          is_following: isFollowing,
        })
      }
    }
    return [...map.values()]
      .sort(
        (a, b) =>
          Number(b.is_following) - Number(a.is_following) || b.likes - a.likes || b.posts - a.posts,
      )
      .slice(0, 10)
  }, [highlights])

  const posts = useMemo(() => {
    let list = [...(data ?? [])].filter((item) => !isFeedPost(item) || isDelversPin(item))
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

  const closeStoryViewer = () => {
    if (storyTarget) {
      const ringKey =
        storyTarget.kind === 'creator' && storyTarget.username
          ? creatorRingKey(storyTarget.username)
          : storyTarget.kind === 'tag' && storyTarget.tagSlug
            ? tagRingKey(storyTarget.tagSlug)
            : placeRingKey(storyTarget.title)
      markHighlightsSeen(
        ringKey,
        storyTarget.posts.slice(0, storyIndex + 1).map((item) => item.id),
      )
      setSeenTick((tick) => tick + 1)
    }
    setStoryTarget(null)
  }

  const openCreatorStories = (creator: Creator) => {
    const rows = highlights.filter((post) => post.author.username === creator.username)
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
    const rows = highlights.filter((post) => post.region?.trim().toLowerCase().includes(placeKey))
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

  const openTagStories = (ring: (typeof hashtagRings)[number]) => {
    const ids = ring.posts.map((p) => p.id)
    if (ids.length === 0) return
    const label = `#${ring.tag_slug}`
    setStoryTarget({
      kind: 'tag',
      title: label,
      subtitle: `${ids.length} ${ids.length === 1 ? 'highlight' : 'highlights'} for ${label}`,
      avatar: null,
      tagSlug: ring.tag_slug,
      posts: ring.posts,
    })
    setStoryIndex(0)
  }

  const postAction = postEntry(profile)

  const resolvedStoryTarget = useMemo((): StoryTarget | null => {
    if (!storyTarget) return null
    const feedPosts = (data ?? []).filter(isFeedPost)
    const freshMap = new Map<number, PinPost>()
    for (const item of highlights) {
      freshMap.set(item.id, item)
    }
    for (const item of feedPosts) {
      freshMap.set(item.id, item as PinPost)
    }
    return {
      ...storyTarget,
      posts: storyTarget.posts.map((item) => freshMap.get(item.id) ?? item),
    }
  }, [data, highlights, storyTarget])

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
          <Link
            to={postAction.to}
            className="cm-feed-toolbar__item cm-feed-toolbar__item--action ds-post-entry"
            aria-label={postAction.ariaLabel}
          >
            <span className="cm-feed-toolbar__circle" aria-hidden>
              <Plus size={20} strokeWidth={2.5} aria-hidden />
            </span>
            <span className="cm-feed-toolbar__label">{postAction.label}</span>
          </Link>
        </div>
      </header>

      <main className="ds-main ds-main--centered">
        <section className="ds-stories ds-stories--polished" aria-label="Creator, hashtag, and place highlights">
          <CreateStoryBubble signedIn={!!profile} />
          {creators.map((creator) => {
            const ringKey = creatorRingKey(creator.username)
            const ids = highlights.filter((post) => post.author.username === creator.username).map((post) => post.id)
            const seen = areAllHighlightsSeen(ringKey, ids)
            return (
              <CreatorBubble
                key={creator.username}
                creator={creator}
                seen={seen}
                onOpen={() => openCreatorStories(creator)}
              />
            )
          })}
          {hashtagRings.map((ring) => {
            const ringKey = tagRingKey(ring.tag_slug)
            const ids = ring.posts.map((p) => p.id)
            const seen = areAllHighlightsSeen(ringKey, ids)
            return (
              <TagBubble key={ring.ring_id || ring.tag_slug} tag={ring.tag_slug} seen={seen} onOpen={() => openTagStories(ring)} />
            )
          })}
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
        <Link
          to={postAction.to}
          className="ds-mobile-action ds-mobile-action--create cm-feed-toolbar__item cm-feed-toolbar__item--action"
          aria-label={postAction.ariaLabel}
        >
          <span className="cm-feed-toolbar__circle" aria-hidden>
            <Plus size={20} strokeWidth={2.5} aria-hidden />
          </span>
          <span className="cm-feed-toolbar__label">{postAction.label}</span>
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

      {resolvedStoryTarget ? (
        <StoryViewer
          target={resolvedStoryTarget}
          index={storyIndex}
          onIndex={setStoryIndex}
          onClose={closeStoryViewer}
          signedIn={!!profile}
          likeBusy={likeMut.isPending}
          fireBusy={fireMut.isPending}
          onLike={(post) => likeMut.mutate(post)}
          onFire={(post) => fireMut.mutate(post)}
          onCommented={bumpHighlightCommentCount}
        />
      ) : null}
    </div>
  )
}

function CreatorBubble({ creator, seen, onOpen }: { creator: Creator; seen: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={`ds-creator-bubble${seen ? ' ds-creator-bubble--seen' : ''}`}
      onClick={onOpen}
      aria-label={`Open highlights by ${creator.display_name}`}
    >
      <UserAvatar src={creator.avatar} name={creator.display_name} className="ds-creator-bubble__avatar" fill />
      <small>{creator.display_name}</small>
    </button>
  )
}

function TagBubble({ tag, seen, onOpen }: { tag: string; seen: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={`ds-creator-bubble${seen ? ' ds-creator-bubble--seen' : ''}`}
      onClick={onOpen}
      aria-label={`Open hashtag highlights for #${tag}`}
    >
      <span className="ds-creator-bubble__avatar" aria-hidden>
        <Hash size={18} strokeWidth={2.25} />
      </span>
      <small>#{tag}</small>
    </button>
  )
}

function CreateStoryBubble({ signedIn }: { signedIn: boolean }) {
  return (
    <Link
      to={signedIn ? '/create/highlight' : '/login'}
      className="cm-feed-toolbar__item cm-feed-toolbar__item--action ds-create-bubble"
      aria-label={signedIn ? 'Add a highlight' : 'Sign in to add a highlight'}
    >
      <span className="cm-feed-toolbar__circle" aria-hidden>
        <Plus size={20} strokeWidth={2.5} aria-hidden />
      </span>
      <span className="cm-feed-toolbar__label">Highlight</span>
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

function StoryViewer({ target, index, onIndex, onClose, signedIn, likeBusy, fireBusy, onLike, onFire, onCommented }: {
  target: StoryTarget
  index: number
  onIndex: (next: number) => void
  onClose: () => void
  signedIn: boolean
  likeBusy: boolean
  fireBusy: boolean
  onLike: (post: PinPost) => void
  onFire: (post: PinPost) => void
  onCommented: (postId: number) => void
}) {
  const post = target.posts[index]
  const image = mediaUrl(post?.image ?? null)
  const video = mediaUrl(post?.video ?? null)
  const caption = post ? postText(post) : ''
  const canPrev = index > 0
  const canNext = index < target.posts.length - 1
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)

  useEffect(() => {
    setCommentsOpen(false)
  }, [index, post?.id])

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

  const likeCount = post.likes_count ?? 0
  const fireCount = post.fires_count ?? 0
  const commentCount = post.comments_count ?? 0

  const triggerHeartBurst = () => {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 720)
  }

  const handleLike = () => {
    if (!signedIn) return
    const liking = !post.liked_by_me
    onLike(post)
    if (liking) triggerHeartBurst()
  }

  const handleFire = () => {
    if (!signedIn) return
    onFire(post)
  }

  const handleCommented = () => {
    onCommented(post.id)
  }

  return (
    <div className="ds-story-viewer" role="dialog" aria-modal="true" aria-label={`${target.title} stories`}>
      <article className="ds-story-viewer__card">
        <div className="ds-story-viewer__progress" aria-hidden>
          {target.posts.map((story, storyPosition) => (
            <span key={story.id} className={storyPosition < index ? 'is-seen' : storyPosition === index ? 'is-active' : ''} />
          ))}
        </div>

        <header className="ds-story-viewer__head">
          <UserAvatar
            src={target.kind === 'place' ? null : target.avatar}
            name={target.title}
            className="ds-story-viewer__avatar"
            fill
          />
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

        <div
          className="ds-story-viewer__media"
          onDoubleClick={() => {
            if (signedIn) handleLike()
          }}
        >
          {image ? <img src={image} alt={caption} /> : video ? <video src={video} controls autoPlay playsInline /> : <div className="ds-story-viewer__note"><Compass size={34} strokeWidth={2} aria-hidden /><p>{caption}</p></div>}
          {heartBurst ? (
            <span className="ds-story-viewer__heart-burst" aria-hidden>
              <Heart size={88} strokeWidth={1.75} fill="currentColor" />
            </span>
          ) : null}
        </div>
        <div className="ds-story-viewer__scrim" aria-hidden />

        <button type="button" className="ds-story-viewer__nav ds-story-viewer__nav--prev" disabled={!canPrev} onClick={() => onIndex(index - 1)} aria-label="Previous highlight" />
        <button type="button" className="ds-story-viewer__nav ds-story-viewer__nav--next" disabled={!canNext} onClick={() => onIndex(index + 1)} aria-label="Next highlight" />

        <footer className="ds-story-viewer__footer">
          {caption ? (
            <p className="ds-story-viewer__caption">{caption}</p>
          ) : null}

          <div className="ds-story-viewer__actions" role="group" aria-label="Highlight reactions">
            {signedIn ? (
              <button
                type="button"
                className={`ds-story-viewer__react${post.liked_by_me ? ' ds-story-viewer__react--active ds-story-viewer__react--heart' : ''}`}
                onClick={handleLike}
                disabled={likeBusy}
                aria-label={post.liked_by_me ? 'Unlike highlight' : 'Like highlight'}
                aria-pressed={post.liked_by_me}
              >
                <Heart size={18} strokeWidth={2.25} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden />
                {likeCount > 0 ? <span>{formatCount(likeCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="ds-story-viewer__react" aria-label="Like highlight">
                <Heart size={18} strokeWidth={2.25} aria-hidden />
                {likeCount > 0 ? <span>{formatCount(likeCount)}</span> : null}
              </Link>
            )}
            {signedIn ? (
              <button
                type="button"
                className={`ds-story-viewer__react ds-story-viewer__react--fire${post.fired_by_me ? ' ds-story-viewer__react--active' : ''}`}
                onClick={handleFire}
                disabled={fireBusy}
                aria-label={post.fired_by_me ? 'Remove fire reaction' : 'React with fire'}
                aria-pressed={post.fired_by_me ?? false}
              >
                <Flame size={18} strokeWidth={2.25} fill={post.fired_by_me ? 'currentColor' : 'none'} aria-hidden />
                {fireCount > 0 ? <span>{formatCount(fireCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="ds-story-viewer__react ds-story-viewer__react--fire" aria-label="React with fire">
                <Flame size={18} strokeWidth={2.25} aria-hidden />
                {fireCount > 0 ? <span>{formatCount(fireCount)}</span> : null}
              </Link>
            )}
            {signedIn ? (
              <button
                type="button"
                className={`ds-story-viewer__react${commentsOpen ? ' ds-story-viewer__react--active' : ''}`}
                onClick={() => setCommentsOpen((open) => !open)}
                aria-label={commentsOpen ? 'Close comments' : 'View comments'}
                aria-expanded={commentsOpen}
              >
                <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
                {commentCount > 0 ? <span>{formatCount(commentCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="ds-story-viewer__react" aria-label="View comments">
                <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
                {commentCount > 0 ? <span>{formatCount(commentCount)}</span> : null}
              </Link>
            )}
          </div>

          {signedIn ? (
            <DelversCommentComposer
              postId={post.id}
              variant="compact"
              placeholder="Add a comment..."
              onCommented={handleCommented}
            />
          ) : (
            <Link to="/login" className="ds-story-viewer__signin">Sign in to comment</Link>
          )}
        </footer>

        <DelversCommentsPanel
          postId={post.id}
          open={commentsOpen}
          count={commentCount}
          signedIn={signedIn}
          onClose={() => setCommentsOpen(false)}
          onCommented={handleCommented}
        />
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
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const lastTapRef = useRef(0)
  const name = post.author.display_name || post.author.username
  const text = postText(post)
  const hasMedia = Boolean(post.image || post.video)
  const date = formatDate(post.created_at)
  const commentCount = post.comments_count ?? 0

  const triggerHeartBurst = () => {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 720)
  }

  const handleLike = () => {
    const liking = !post.liked_by_me
    onLike()
    if (liking) triggerHeartBurst()
  }

  const handleCommented = () => {
    onCommented()
  }

  const permalink = postPermalinkPath(post.id)

  return (
    <article className={`ds-post${post.is_sponsored ? ' ds-post--sponsored' : ''}`}>
      {post.is_sponsored ? (
        <span className="featured-card__partner ds-post__sponsored">{post.sponsor_label || 'Sponsored'}</span>
      ) : null}
      <header className="ds-post__head">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="ds-post__author">
          <UserAvatar src={post.author.avatar} name={name} className="ds-post__author-avatar" fill />
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
          handleLike()
        }}
        onTouchEnd={(e) => {
          const now = Date.now()
          if (now - lastTapRef.current < 320) {
            if (signedIn) handleLike()
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
            <Heart size={96} strokeWidth={1.75} fill="currentColor" />
          </span>
        ) : null}
      </div>

      <div className="ds-post__actions" aria-label="Post actions">
        <div className="ds-post__actions-primary">
          {signedIn ? (
            <button
              type="button"
              onClick={handleLike}
              disabled={likeBusy}
              className={`ds-post__action--like${post.liked_by_me ? ' is-active' : ''}`}
              aria-label={post.liked_by_me ? 'Unlike post' : 'Like post'}
              aria-pressed={post.liked_by_me}
            >
              <Heart size={22} strokeWidth={2.25} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ) : (
            <Link to="/login" className="ds-post__action--like" aria-label="Like post">
              <Heart size={22} strokeWidth={2.25} aria-hidden />
            </Link>
          )}
          {signedIn ? (
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className={commentsOpen ? 'is-active' : ''}
              aria-label="View comments"
              aria-expanded={commentsOpen}
            >
              <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
            </button>
          ) : (
            <Link to="/login" aria-label="View comments">
              <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
            </Link>
          )}
          <button type="button" onClick={onShare} aria-label="Share post">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
          <ReportButton
            className="ds-post__report"
            iconOnly
            iconSize={22}
            triggerLabel="Report post"
            target={{
              target_type: 'post',
              target_id: String(post.id),
              target_label: post.body?.slice(0, 60) || `Post by @${post.author.username}`,
            }}
          />
        </div>
        <div className="ds-post__actions-secondary">
          {signedIn ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saveBusy}
              className={`ds-post__action--save${post.saved_by_me ? ' is-active' : ''}`}
              aria-label={post.saved_by_me ? 'Unsave post' : 'Save post'}
              aria-pressed={post.saved_by_me}
            >
              <Bookmark size={22} strokeWidth={2.25} fill={post.saved_by_me ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ) : (
            <Link to="/login" className="ds-post__action--save" aria-label="Save post">
              <Bookmark size={22} strokeWidth={2.25} aria-hidden />
            </Link>
          )}
        </div>
      </div>

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

      <DelversCommentsPanel
        postId={post.id}
        open={commentsOpen}
        count={commentCount}
        onClose={() => setCommentsOpen(false)}
        onCommented={handleCommented}
        signedIn={signedIn}
      />
    </article>
  )
}
