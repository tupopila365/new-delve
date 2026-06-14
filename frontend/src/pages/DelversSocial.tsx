import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bookmark, Camera, Compass, Heart, MapPin, MessageCircle, Plus, Search, Share2, UserRound, Video, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EmptyState, ListSkeleton } from '../components/ui'
import '../delvers-topbar-clean.css'

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

export function DelversSocial() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<FeedTab>('foryou')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [toast, setToast] = useState('')
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

  const onShare = async (id: number) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${id}`)
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
        <section className="ds-stories" aria-label="Creators and places">
          {creators.map((creator) => <CreatorBubble key={creator.username} creator={creator} />)}
          {PLACES.map((place) => (
            <button key={place} type="button" className="ds-place-bubble" onClick={() => setQuery(place)}>
              <span><MapPin size={18} strokeWidth={2.25} /></span>
              <small>{place}</small>
            </button>
          ))}
        </section>

        {toast ? <p className="ds-toast" role="status">{toast}</p> : null}

        {isLoading ? <ListSkeleton count={4} /> : null}

        {isError ? (
          <EmptyState
            iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
            title="We couldn't load Delvers"
            sub="Please check your connection and try again."
            cta={{ label: 'Try again', onClick: () => void refetch() }}
          />
        ) : null}

        {!isLoading && !isError && posts.length === 0 ? (
          <EmptyState
            iconElement={<Camera size={28} strokeWidth={2} aria-hidden />}
            title="No posts found"
            sub="Try a different tab, place, or search term."
            cta={{ label: 'Show all', onClick: () => { setTab('foryou'); setQuery('') } }}
          />
        ) : null}

        <section className="ds-feed" aria-label="Delvers feed">
          {posts.map((post) => (
            <SocialPost
              key={post.id}
              post={post}
              signedIn={!!profile}
              likeBusy={likeMut.isPending && likeMut.variables === post.id}
              saveBusy={saveMut.isPending && saveMut.variables === post.id}
              onLike={() => profile && likeMut.mutate(post.id)}
              onSave={() => profile && saveMut.mutate(post.id)}
              onShare={() => onShare(post.id)}
            />
          ))}
        </section>
      </main>
    </div>
  )
}

function CreatorBubble({ creator }: { creator: Creator }) {
  const avatar = mediaUrl(creator.avatar)
  return (
    <Link to={`/u/${encodeURIComponent(creator.username)}`} className="ds-creator-bubble">
      <span>{avatar ? <img src={avatar} alt="" /> : <UserRound size={22} strokeWidth={2} />}</span>
      <small>{creator.display_name}</small>
    </Link>
  )
}

function SocialPost({ post, signedIn, likeBusy, saveBusy, onLike, onSave, onShare }: {
  post: PinPost
  signedIn: boolean
  likeBusy: boolean
  saveBusy: boolean
  onLike: () => void
  onSave: () => void
  onShare: () => void
}) {
  const name = post.author.display_name || post.author.username
  const avatar = mediaUrl(post.author.avatar ?? null)
  const image = mediaUrl(post.image)
  const video = mediaUrl(post.video)
  const text = postText(post)
  const date = formatDate(post.created_at)

  return (
    <article className="ds-post">
      <header className="ds-post__head">
        <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="ds-post__author">
          <span>{avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}</span>
          <strong>{name}<small>@{post.author.username}</small></strong>
        </Link>
        {post.region ? <span className="ds-post__region"><MapPin size={13} />{post.region}</span> : null}
      </header>

      <Link to={`/posts/${post.id}`} className="ds-post__media">
        {image ? <img src={image} alt={text} loading="lazy" /> : video ? <div className="ds-post__video"><Video size={34} /><span>Video clip</span></div> : <div className="ds-post__text-media"><Compass size={34} /></div>}
      </Link>

      <div className="ds-post__actions">
        {signedIn ? (
          <button type="button" onClick={onLike} disabled={likeBusy} className={post.liked_by_me ? 'is-active' : ''} aria-label="Like post"><Heart size={20} fill={post.liked_by_me ? 'currentColor' : 'none'} /></button>
        ) : <Link to="/login" aria-label="Like post"><Heart size={20} /></Link>}
        <Link to={`/posts/${post.id}`} aria-label="View comments"><MessageCircle size={20} /></Link>
        <button type="button" onClick={onShare} aria-label="Share post"><Share2 size={20} /></button>
        {signedIn ? (
          <button type="button" onClick={onSave} disabled={saveBusy} className={post.saved_by_me ? 'is-active' : ''} aria-label="Save post"><Bookmark size={20} fill={post.saved_by_me ? 'currentColor' : 'none'} /></button>
        ) : <Link to="/login" aria-label="Save post"><Bookmark size={20} /></Link>}
      </div>

      <div className="ds-post__copy">
        <strong>{formatCount(post.likes_count || 0)} likes</strong>
        <p><b>{post.author.username}</b> {text}</p>
        {post.delvers_board ? <span>{post.delvers_board}</span> : null}
        <Link to={`/posts/${post.id}`}>View {post.comments_count ? formatCount(post.comments_count) : ''} comments</Link>
        {date ? <small>{date}</small> : null}
      </div>
    </article>
  )
}
