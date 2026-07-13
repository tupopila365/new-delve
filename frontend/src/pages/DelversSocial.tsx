import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, Bookmark, Camera, Compass, Flame, Heart, Home, Hash, MapPin, MessageCircle, Play, Plus, Search, Share2, UserRound, Volume2, VolumeX, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { UserAvatar } from '../components/UserAvatar'
import { DelversCommentsPanel } from '../components/DelversCommentsPanel'
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
  firstUnseenHighlightIndex,
  markHighlightsSeen,
  tagRingKey,
} from '../utils/delversHighlightSeen'
import {
  buildBoardRings,
  buildDelversStoryRingQueue,
  buildPlaceRings,
  findStoryRingIndex,
  highlightCoverFromPost,
  mapHashtagRing,
  ringKeyForStoryTarget,
  storyTargetFromRing,
  type BoardHighlightRing,
  type DelversStoryRing,
  type PlaceHighlightRing,
} from '../utils/delversHighlightRings'
import { copyPostPermalink, postPermalinkPath } from '../utils/postPermalink'
import { DelversStoryViewer, type DelversStoryTarget } from '../components/social/DelversStoryViewer'
import '../components/community/community-feed-cards.css'
import '../components/Featured.css'

type FeedTab = 'foryou' | 'nearby' | 'trending' | 'photos' | 'tips' | 'reels'

type HashtagRingApi = {
  ring_id: string
  tag_slug: string
  label: string
  followed_by_me?: boolean
  followers_count?: number
  posts: PinPost[]
}

const TAB_LABELS: Record<FeedTab, string> = {
  foryou: 'For You',
  nearby: 'Nearby',
  trending: 'Trending',
  photos: 'Photos',
  tips: 'Tips',
  reels: 'Reels',
}

const FEED_TABS: FeedTab[] = ['foryou', 'nearby', 'trending', 'reels']

type PinPost = DelversFeedPost

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
  const [chromeHidden, setChromeHidden] = useState(false)
  const [toast, setToast] = useState('')
  const [storyTarget, setStoryTarget] = useState<DelversStoryTarget | null>(null)
  const [storyIndex, setStoryIndex] = useState(0)
  const [activeRingIndex, setActiveRingIndex] = useState<number | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [seenTick, setSeenTick] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const storiesRowRef = useRef<HTMLElement>(null)
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
    queryFn: () => apiFetch<{ rings: HashtagRingApi[] }>(
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
        skipFeeds: true,
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
        skipFeeds: true,
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
        skipFeeds: true,
      })
    },
  })

  const tagFollowMut = useMutation({
    mutationFn: (tagSlug: string) =>
      apiFetch<{ following: boolean; followers_count: number; tag_slug: string }>(
        `/api/social/delvers/tags/${encodeURIComponent(tagSlug)}/follow/`,
        { method: 'POST' },
      ),
    onSuccess: (result) => {
      const tag = result.tag_slug
      qc.setQueryData<{ rings: HashtagRingApi[] }>(hashtagRingsQk, (old) => {
        if (!old) return old
        const rings = old.rings.map((ring) =>
          ring.tag_slug === tag
            ? {
                ...ring,
                followed_by_me: result.following,
                followers_count: result.followers_count,
              }
            : ring,
        )
        rings.sort((a, b) => Number(Boolean(b.followed_by_me)) - Number(Boolean(a.followed_by_me)))
        return { ...old, rings }
      })
      setStoryTarget((target) => {
        if (!target || target.kind !== 'tag' || target.tagSlug !== tag) return target
        return {
          ...target,
          followedByMe: result.following,
          followersCount: result.followers_count,
        }
      })
      void qc.invalidateQueries({ queryKey: hashtagRingsQk })
    },
  })

  // Follow/unfollow the post author. A follow applies to every post by that
  // author, so we patch all of their posts in the feed cache.
  const followMut = useMutation({
    mutationFn: (post: PinPost) =>
      apiFetch<{ following: boolean; followers_count: number }>(
        `/api/social/users/${encodeURIComponent(post.author.username)}/follow/`,
        { method: 'POST' },
      ),
    onMutate: async (post) => {
      await qc.cancelQueries({ queryKey: qk })
      const previousFeed = qc.getQueryData<DelversFeedItem[]>(qk)
      const username = post.author.username
      const next = !post.is_author_followed
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) =>
          isFeedPost(item) && item.author.username === username
            ? { ...item, is_author_followed: next }
            : item,
        ),
      )
      return { previousFeed }
    },
    onError: (_err, _post, context) => {
      if (context?.previousFeed) qc.setQueryData(qk, context.previousFeed)
    },
    onSuccess: (data, post) => {
      const username = post.author.username
      qc.setQueryData<DelversFeedItem[]>(qk, (old) =>
        (old ?? []).map((item) =>
          isFeedPost(item) && item.author.username === username
            ? { ...item, is_author_followed: data.following }
            : item,
        ),
      )
      void qc.invalidateQueries({ queryKey: ['public-profile', username] })
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
    // Hide the top/bottom nav chrome when scrolling down, reveal on scroll up.
    // Applies on every viewport size (mobile + desktop). We listen in the
    // capture phase so we catch scrolling whether it happens on the window or
    // on a nested scroll container.
    const readScrollTop = (target: EventTarget | null): number | null => {
      if (target && target instanceof HTMLElement && target !== document.documentElement && target !== document.body) {
        // Ignore purely horizontal scrollers (e.g. the stories row).
        if (target.scrollHeight - target.clientHeight <= 0) return null
        return target.scrollTop
      }
      return Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, document.body.scrollTop || 0)
    }

    const onScroll = (e?: Event) => {
      const top = readScrollTop(e ? e.target : null)
      if (top === null) return
      const delta = top - lastScrollTopRef.current

      // Ignore sub-pixel jitter, but keep the anchor so slow scrolling still
      // accumulates until it crosses the threshold.
      if (Math.abs(delta) < 2) return

      if (top <= 8) {
        // Always show the chrome at the very top of the feed.
        setChromeHidden(false)
      } else if (delta > 0 && top > 72) {
        // Any downward movement past the header height -> hide.
        setChromeHidden(true)
      } else if (delta < 0) {
        // Any upward movement -> reveal.
        setChromeHidden(false)
      }

      lastScrollTopRef.current = top
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [])

  useEffect(() => {
    // Reveal the chrome whenever the tab changes so switching tabs never leaves it hidden.
    setChromeHidden(false)
    lastScrollTopRef.current = 0
  }, [tab])

  const boardRings = useMemo(() => buildBoardRings(highlights), [highlights])
  const placeRings = useMemo(() => buildPlaceRings(highlights), [highlights])
  const hashtagRingsMapped = useMemo(() => hashtagRings.map(mapHashtagRing), [hashtagRings])
  const storyQueue = useMemo(
    () => buildDelversStoryRingQueue(boardRings, hashtagRingsMapped, placeRings),
    [boardRings, hashtagRingsMapped, placeRings],
  )

  const markStoryProgress = useCallback((target: DelversStoryTarget, index: number) => {
    markHighlightsSeen(
      ringKeyForStoryTarget(target),
      target.posts.slice(0, index + 1).map((item) => item.id),
    )
    setSeenTick((tick) => tick + 1)
  }, [])

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
    if (tab === 'reels') {
      list = list.filter((p) => isFeedPost(p) && Boolean(p.video))
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
      markStoryProgress(storyTarget, storyIndex)
    }
    setStoryTarget(null)
    setActiveRingIndex(null)
  }

  const openRingAtIndex = useCallback((queueIndex: number, slideIndex = 0) => {
    const entry = storyQueue[queueIndex]
    if (!entry) return false
    const target = storyTargetFromRing(entry)
    if (target.posts.length === 0) return false
    setActiveRingIndex(queueIndex)
    setStoryTarget(target)
    setStoryIndex(Math.min(Math.max(slideIndex, 0), target.posts.length - 1))
    return true
  }, [storyQueue])

  const handleRingComplete = useCallback(() => {
    if (!storyTarget) {
      setActiveRingIndex(null)
      return
    }
    markStoryProgress(storyTarget, storyTarget.posts.length - 1)

    const startIndex = activeRingIndex ?? -1
    for (let nextIndex = startIndex + 1; nextIndex < storyQueue.length; nextIndex += 1) {
      if (openRingAtIndex(nextIndex, 0)) return
    }
    setStoryTarget(null)
    setActiveRingIndex(null)
  }, [activeRingIndex, markStoryProgress, openRingAtIndex, storyQueue, storyTarget])

  const handleLeaveToPrevRing = useCallback(() => {
    if (storyTarget) {
      markStoryProgress(storyTarget, storyIndex)
    }
    const startIndex = activeRingIndex ?? 0
    for (let prevIndex = startIndex - 1; prevIndex >= 0; prevIndex -= 1) {
      const entry = storyQueue[prevIndex]
      if (!entry) continue
      const target = storyTargetFromRing(entry)
      if (target.posts.length === 0) continue
      setActiveRingIndex(prevIndex)
      setStoryTarget(target)
      setStoryIndex(target.posts.length - 1)
      return
    }
  }, [activeRingIndex, markStoryProgress, storyIndex, storyQueue, storyTarget])

  const openFromRing = useCallback((entry: DelversStoryRing) => {
    const target = storyTargetFromRing(entry)
    if (target.posts.length === 0) return
    const queueIndex = findStoryRingIndex(storyQueue, entry)
    const ringKey = ringKeyForStoryTarget(target)
    const startIndex = firstUnseenHighlightIndex(
      ringKey,
      target.posts.map((item) => item.id),
    )
    setActiveRingIndex(queueIndex >= 0 ? queueIndex : null)
    setStoryTarget(target)
    setStoryIndex(startIndex)
  }, [storyQueue])

  const canSwipeToNextRing = useMemo(() => {
    if (activeRingIndex === null) return false
    for (let i = activeRingIndex + 1; i < storyQueue.length; i += 1) {
      if (storyTargetFromRing(storyQueue[i]).posts.length > 0) return true
    }
    return false
  }, [activeRingIndex, storyQueue])

  const openBoardStories = (ring: BoardHighlightRing) => {
    openFromRing({ kind: 'board', ring })
  }

  const openPlaceStories = (ring: PlaceHighlightRing) => {
    openFromRing({ kind: 'place', ring })
  }

  const openTagStories = (ring: (typeof hashtagRings)[number]) => {
    openFromRing({ kind: 'tag', ring: mapHashtagRing(ring) })
  }

  const postAction = postEntry(profile)

  const resolvedStoryTarget = useMemo((): DelversStoryTarget | null => {
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

  useEffect(() => {
    if (!resolvedStoryTarget) return
    markStoryProgress(resolvedStoryTarget, storyIndex)
  }, [markStoryProgress, resolvedStoryTarget, storyIndex])

  useEffect(() => {
    if (!resolvedStoryTarget || activeRingIndex === null) return
    const ringKey = ringKeyForStoryTarget(resolvedStoryTarget)
    const row = storiesRowRef.current
    if (!row) return
    const bubble = row.querySelector<HTMLElement>(`[data-story-ring-key="${CSS.escape(ringKey)}"]`)
    bubble?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeRingIndex, resolvedStoryTarget])

  return (
    <div className={chromeHidden ? 'ds-page ds-page--chrome-hidden' : 'ds-page'}>
      <header className="ds-topbar ds-topbar--clean">
        <Link to="/delvers" className="ds-brand">DELVE <span>Delvers</span></Link>
        <nav className="ds-tabs" aria-label="Delvers feed tabs">
          {FEED_TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`ds-tab${tab === t ? ' ds-tab--active' : ''}`}
              onClick={() => setTab(t)}
              aria-current={tab === t ? 'true' : undefined}
            >
              {TAB_LABELS[t]}
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

      {tab === 'reels' ? (
        <DelversReels
          posts={posts as DelversFeedPost[]}
          signedIn={!!profile}
          isLoading={isLoading}
          onLike={(p) => profile && likeMut.mutate(p)}
          onSave={(p) => profile && saveMut.mutate(p)}
          onFire={(p) => profile && fireMut.mutate(p)}
          onShare={(id) => void onShare(id)}
          onCommented={refreshFeed}
          likeBusyId={likeMut.isPending ? likeMut.variables?.id : undefined}
          saveBusyId={saveMut.isPending ? saveMut.variables?.id : undefined}
          fireBusyId={fireMut.isPending ? fireMut.variables?.id : undefined}
        />
      ) : (
      <main className="ds-main ds-main--centered">
        <div className="ds-highlights-label">
          <span>Stories & highlights</span>
          <div className="ds-highlights-label__line" />
        </div>
        <section ref={storiesRowRef} className="ds-stories ds-stories--polished" aria-label="Creator, hashtag, and place highlights">
          <CreateStoryBubble signedIn={!!profile} />
          {boardRings.map((ring) => {
            const seen = areAllHighlightsSeen(ring.ringKey, ring.posts.map((p) => p.id))
            const active = activeRingIndex !== null && storyQueue[activeRingIndex]?.kind === 'board'
              && storyQueue[activeRingIndex]?.ring.id === ring.id
            return (
              <HighlightRingBubble
                key={ring.id}
                ringKey={ring.ringKey}
                label={ring.label}
                cover={ring.cover}
                avatar={ring.avatar}
                displayName={ring.displayName}
                seen={seen}
                active={active}
                onOpen={() => openBoardStories(ring)}
              />
            )
          })}
          {hashtagRings.map((ring) => {
            const ringKey = tagRingKey(ring.tag_slug)
            const ids = ring.posts.map((p) => p.id)
            const seen = areAllHighlightsSeen(ringKey, ids)
            const cover = ring.posts[0] ? highlightCoverFromPost(ring.posts[0]) : { src: null, kind: 'image' as const }
            const mapped = mapHashtagRing(ring)
            const active = activeRingIndex !== null && storyQueue[activeRingIndex]?.kind === 'tag'
              && storyQueue[activeRingIndex]?.ring.id === mapped.id
            return (
              <HighlightRingBubble
                key={ring.ring_id || ring.tag_slug}
                ringKey={ringKey}
                label={`#${ring.tag_slug}`}
                cover={cover}
                seen={seen}
                active={active}
                onOpen={() => openTagStories(ring)}
              />
            )
          })}
          {placeRings.map((ring) => {
            const seen = areAllHighlightsSeen(ring.ringKey, ring.posts.map((p) => p.id))
            const active = activeRingIndex !== null && storyQueue[activeRingIndex]?.kind === 'place'
              && storyQueue[activeRingIndex]?.ring.id === ring.id
            return (
              <HighlightRingBubble
                key={ring.id}
                ringKey={ring.ringKey}
                label={ring.label}
                cover={ring.cover}
                seen={seen}
                active={active}
                onOpen={() => openPlaceStories(ring)}
              />
            )
          })}
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

        {!isLoading && !isError && posts.length > 0 ? (
          <div className="ds-feed-header">
            <h2>{TAB_LABELS[tab]}</h2>
            <div className="ds-feed-header__line" />
          </div>
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
                currentUsername={profile?.username}
                likeBusy={likeMut.isPending && likeMut.variables?.id === item.id}
                saveBusy={saveMut.isPending && saveMut.variables?.id === item.id}
                followBusy={followMut.isPending && followMut.variables?.author.username === item.author.username}
                onLike={() => profile && likeMut.mutate(item)}
                onSave={() => profile && saveMut.mutate(item)}
                onFollow={() => profile && followMut.mutate(item)}
                onShare={() => void onShare(item.id)}
                onCommented={refreshFeed}
              />
            ),
          )}
        </section>
      </main>
      )}

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
        <DelversStoryViewer
          target={resolvedStoryTarget}
          index={storyIndex}
          onIndex={setStoryIndex}
          onClose={closeStoryViewer}
          onRingComplete={handleRingComplete}
          canLeaveToPrevRing={activeRingIndex !== null && activeRingIndex > 0}
          onLeaveToPrevRing={handleLeaveToPrevRing}
          canSwipeToNextRing={canSwipeToNextRing}
          onSwipeToNextRing={handleRingComplete}
          signedIn={!!profile}
          likeBusy={likeMut.isPending}
          fireBusy={fireMut.isPending}
          onLike={(post) => likeMut.mutate(post)}
          onFire={(post) => fireMut.mutate(post)}
          onCommented={bumpHighlightCommentCount}
          onToggleTagFollow={(tagSlug) => tagFollowMut.mutate(tagSlug)}
          tagFollowBusy={tagFollowMut.isPending}
        />
      ) : null}
    </div>
  )
}

function DelversReels({
  posts,
  signedIn,
  isLoading,
  onLike,
  onSave,
  onFire,
  onShare,
  onCommented,
  likeBusyId,
  saveBusyId,
  fireBusyId,
}: {
  posts: DelversFeedPost[]
  signedIn: boolean
  isLoading: boolean
  onLike: (post: DelversFeedPost) => void
  onSave: (post: DelversFeedPost) => void
  onFire: (post: DelversFeedPost) => void
  onShare: (id: number) => void
  onCommented: () => void
  likeBusyId?: number
  saveBusyId?: number
  fireBusyId?: number
}) {
  const [muted, setMuted] = useState(true)

  if (isLoading) {
    return (
      <section className="dsr-feed dsr-feed--solo" aria-label="Delvers reels">
        <div className="dsr-slide dsr-slide--skeleton">
          <div className="dsr-slide__shimmer" />
        </div>
      </section>
    )
  }

  if (posts.length === 0) {
    return (
      <section className="dsr-feed dsr-feed--solo" aria-label="Delvers reels">
        <div className="dsr-empty">
          <Play size={40} strokeWidth={1.75} aria-hidden />
          <h3 className="dsr-empty__title">No reels yet</h3>
          <p className="dsr-empty__text">
            Video posts from the Delvers feed show up here as full-screen reels.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="dsr-feed" aria-label="Delvers reels">
      {posts.map((post) => (
        <DelversReelSlide
          key={post.id}
          post={post}
          signedIn={signedIn}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onLike={() => onLike(post)}
          onSave={() => onSave(post)}
          onFire={() => onFire(post)}
          onShare={() => onShare(post.id)}
          onCommented={onCommented}
          likeBusy={likeBusyId === post.id}
          saveBusy={saveBusyId === post.id}
          fireBusy={fireBusyId === post.id}
        />
      ))}
    </section>
  )
}

function DelversReelSlide({
  post,
  signedIn,
  muted,
  onToggleMute,
  onLike,
  onSave,
  onFire,
  onShare,
  onCommented,
  likeBusy = false,
  saveBusy = false,
  fireBusy = false,
}: {
  post: DelversFeedPost
  signedIn: boolean
  muted: boolean
  onToggleMute: () => void
  onLike: () => void
  onSave: () => void
  onFire: () => void
  onShare: () => void
  onCommented: () => void
  likeBusy?: boolean
  saveBusy?: boolean
  fireBusy?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const videoSrc = mediaUrl(post.video)
  const poster = post.image ? mediaUrl(post.image) : undefined

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            v.play().then(() => setPaused(false)).catch(() => {})
          } else {
            v.pause()
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().then(() => setPaused(false)).catch(() => {})
    } else {
      v.pause()
      setPaused(true)
    }
  }

  const avatarUrl = post.author.avatar ? mediaUrl(post.author.avatar) : undefined

  return (
    <article className="dsr-slide">
      {videoSrc ? (
        <video
          ref={videoRef}
          className="dsr-slide__video"
          src={videoSrc}
          poster={poster}
          loop
          muted={muted}
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="dsr-slide__video dsr-slide__video--empty" aria-hidden />
      )}
      <div className="dsr-slide__scrim" aria-hidden />
      <button
        type="button"
        className="dsr-slide__tap"
        aria-label={paused ? 'Play video' : 'Pause video'}
        onClick={togglePlay}
      />
      {paused ? (
        <div className="dsr-slide__play" aria-hidden>
          <Play size={60} strokeWidth={1.5} fill="currentColor" />
        </div>
      ) : null}

      <div className="dsr-rail">
        <Link
          to={`/u/${post.author.username}`}
          className="dsr-rail__avatar"
          aria-label={`View ${post.author.display_name}'s profile`}
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : post.author.display_name.charAt(0).toUpperCase()}
        </Link>
        <button
          type="button"
          className={`dsr-rail__btn${post.liked_by_me ? ' dsr-rail__btn--liked' : ''}`}
          onClick={() => signedIn && !likeBusy && onLike()}
          disabled={likeBusy}
          aria-pressed={post.liked_by_me}
          aria-label="Like"
        >
          <Heart size={30} strokeWidth={2} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden />
          <span>{formatCount(post.likes_count)}</span>
        </button>
        <button
          type="button"
          className={`dsr-rail__btn${post.fired_by_me ? ' dsr-rail__btn--fired' : ''}`}
          onClick={() => signedIn && !fireBusy && onFire()}
          disabled={fireBusy}
          aria-pressed={post.fired_by_me}
          aria-label="Fire reaction"
        >
          <Flame size={28} strokeWidth={2} fill={post.fired_by_me ? 'currentColor' : 'none'} aria-hidden />
          <span>{formatCount(post.fires_count ?? 0)}</span>
        </button>
        <button
          type="button"
          className={`dsr-rail__btn${commentsOpen ? ' dsr-rail__btn--active' : ''}`}
          onClick={() => setCommentsOpen(true)}
          aria-label="Comments"
          aria-expanded={commentsOpen}
        >
          <MessageCircle size={28} strokeWidth={2} aria-hidden />
          <span>{formatCount(post.comments_count ?? 0)}</span>
        </button>
        <button
          type="button"
          className={`dsr-rail__btn${post.saved_by_me ? ' dsr-rail__btn--saved' : ''}`}
          onClick={() => signedIn && !saveBusy && onSave()}
          disabled={saveBusy}
          aria-pressed={post.saved_by_me}
          aria-label="Save"
        >
          <Bookmark size={28} strokeWidth={2} fill={post.saved_by_me ? 'currentColor' : 'none'} aria-hidden />
          <span>{formatCount(post.saves_count)}</span>
        </button>
        <button type="button" className="dsr-rail__btn" onClick={onShare} aria-label="Share">
          <Share2 size={26} strokeWidth={2} aria-hidden />
          <span>Share</span>
        </button>
        <button
          type="button"
          className="dsr-rail__btn dsr-rail__btn--mute"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          aria-pressed={!muted}
        >
          {muted ? <VolumeX size={22} strokeWidth={2.25} aria-hidden /> : <Volume2 size={22} strokeWidth={2.25} aria-hidden />}
        </button>
      </div>

      <div className="dsr-meta">
        <Link to={`/u/${post.author.username}`} className="dsr-meta__user">
          @{post.author.username}
        </Link>
        {post.delvers_board || post.region ? (
          <p className="dsr-meta__sub">
            {post.delvers_board ? <span>{post.delvers_board}</span> : null}
            {post.delvers_board && post.region ? ' · ' : null}
            {post.region ? <span className="dsr-meta__region">{post.region}</span> : null}
          </p>
        ) : null}
        {post.body ? <p className="dsr-meta__caption">{post.body}</p> : null}
      </div>

      {commentsOpen ? (
        <div className="dsr-comments">
          <button
            type="button"
            className="dsr-comments__backdrop"
            aria-label="Close comments"
            onClick={() => setCommentsOpen(false)}
          />
          <div className="dsr-comments__sheet">
            <DelversCommentsPanel
              postId={post.id}
              open={commentsOpen}
              count={post.comments_count ?? 0}
              onClose={() => setCommentsOpen(false)}
              onCommented={onCommented}
              signedIn={signedIn}
            />
          </div>
        </div>
      ) : null}
    </article>
  )
}

function HighlightRingBubble({
  ringKey,
  label,
  cover,
  avatar,
  displayName,
  seen,
  active = false,
  onOpen,
}: {
  ringKey: string
  label: string
  cover: { src: string | null; kind: 'image' | 'video' }
  avatar?: string | null
  displayName?: string
  seen: boolean
  active?: boolean
  onOpen: () => void
}) {
  const ariaLabel = displayName ? `Open ${label} highlights by ${displayName}` : `Open ${label} highlights`

  return (
    <button
      type="button"
      data-story-ring-key={ringKey}
      className={`ds-creator-bubble${seen ? ' ds-creator-bubble--seen' : ''}${active ? ' ds-creator-bubble--active' : ''}`}
      onClick={onOpen}
      aria-label={ariaLabel}
      aria-current={active ? 'true' : undefined}
    >
      <span className="ds-creator-bubble__avatar">
        {cover.src ? (
          cover.kind === 'video' ? (
            <video src={cover.src} muted playsInline preload="metadata" className="ds-ring-cover" aria-hidden />
          ) : (
            <img src={cover.src} alt="" className="ds-ring-cover" loading="lazy" />
          )
        ) : avatar ? (
          <UserAvatar src={avatar} name={displayName || label} fill />
        ) : (
          <Hash size={18} strokeWidth={2.25} aria-hidden />
        )}
      </span>
      <small>{label}</small>
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
      {/* Ghost cards in background */}
      <div className="ds-empty-social__ghosts" aria-hidden>
        <div className="ds-empty-social__ghost" />
        <div className="ds-empty-social__ghost" />
        <div className="ds-empty-social__ghost" />
      </div>
      <div className="ds-empty-social__content">
        <span className="ds-empty-social__icon"><Camera size={30} strokeWidth={2.1} aria-hidden /></span>
        <h2>No posts yet</h2>
        <p>Be the first to share a Delvers moment. Post a photo, story, travel tip, or local discovery.</p>
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

function SocialPost({ post, signedIn, currentUsername, likeBusy, saveBusy, followBusy, onLike, onSave, onFollow, onShare, onCommented }: {
  post: PinPost
  signedIn: boolean
  currentUsername?: string
  likeBusy: boolean
  saveBusy: boolean
  followBusy: boolean
  onLike: () => void
  onSave: () => void
  onFollow: () => void
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
  const isOwnPost = Boolean(currentUsername && post.author.username === currentUsername)
  const showFollow = !post.is_sponsored && !isOwnPost

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
          <strong><span className="ds-post__author-name">{name}</span><small>@{post.author.username}</small></strong>
        </Link>
        {showFollow ? (
          <span className="ds-post__follow-wrap">
            {signedIn ? (
              <button
                type="button"
                className={`ds-post__follow${post.is_author_followed ? ' is-following' : ''}`}
                onClick={onFollow}
                disabled={followBusy}
                aria-pressed={post.is_author_followed}
              >
                {post.is_author_followed ? 'Following' : 'Follow'}
              </button>
            ) : (
              <Link to="/login" className="ds-post__follow">Follow</Link>
            )}
          </span>
        ) : null}
        <div className="ds-post__head-meta">
          {post.region ? <span className="ds-post__region"><MapPin size={13} strokeWidth={2.25} aria-hidden />{post.region}</span> : null}
          <ReportButton
            className="ds-post__report"
            variant="menu"
            iconSize={18}
            triggerLabel="Report"
            menuLabel="Post options"
            target={{
              target_type: 'post',
              target_id: String(post.id),
              target_label: post.body?.slice(0, 60) || `Post by @${post.author.username}`,
            }}
          />
        </div>
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
            <PostMedia image={post.image} video={post.video} media={post.media} variant="feed" alt={text} />
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