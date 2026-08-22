import { useEffect, useState } from 'react'
import {
  Bookmark, Heart, MessageCircle, Plus, User,
} from 'lucide-react'
import type { PostDto } from '@delve/contracts'
import {
  addComment,
  fetchComments,
  fetchFeed,
  likePost,
  saveItem,
  unlikePost,
  unsaveItem,
} from '../api/socialClient'
import ExpandableCaption from '../components/mobile/ExpandableCaption'
import DelversStoryRail from '../components/delvers/DelversStoryRail'
import PostMediaCarousel from '../components/delvers/PostMediaCarousel'
import { DelversListSkeleton } from '../components/skeletons'
import { formatUsername } from '../lib/formatUsername'
import { AuthApiError } from '../api/authClient'

function formatN(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${Math.max(1, m)}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function feedErrorCopy(err: unknown): { title: string; body: string; kind: 'auth' | 'forbidden' | 'generic' } {
  if (err instanceof AuthApiError) {
    if (err.status === 401 || err.code === 'UNAUTHORIZED' || err.code === 'SESSION_EXPIRED' || err.code === 'SESSION_REVOKED') {
      return {
        kind: 'auth',
        title: 'Sign in required',
        body: 'Your session expired or is missing. Sign in again to see posts from people you follow.',
      }
    }
    if (err.status === 403 || err.code === 'ACCOUNT_RESTRICTED' || err.code === 'ADMIN_FORBIDDEN') {
      return {
        kind: 'forbidden',
        title: 'You do not have permission',
        body: err.message || 'This account cannot load Delvers right now.',
      }
    }
    return {
      kind: 'generic',
      title: 'Unable to load Delvers',
      body: err.message || 'Something went wrong. Try again.',
    }
  }
  if (err instanceof Error) {
    const msg = err.message || ''
    if (/sign in required/i.test(msg) || /unauthorized/i.test(msg)) {
      return {
        kind: 'auth',
        title: 'Sign in required',
        body: 'Sign in to see posts from people you follow.',
      }
    }
    return { kind: 'generic', title: 'Unable to load Delvers', body: msg || 'Something went wrong. Try again.' }
  }
  return { kind: 'generic', title: 'Unable to load Delvers', body: 'Check your connection and try again.' }
}

interface DelversFeedPageProps {
  onCreate?: () => void
  onOpenMessages?: () => void
  onOpenNotifications?: () => void
  onOpenProfile?: (username: string) => void
  /** Bump to refetch the feed (e.g. after creating a post). */
  refreshKey?: number
  /** Optimistically show this post at the top until/alongside refetch. */
  highlightPost?: PostDto | null
  /** False while App is still refreshing the session — do not treat as signed-out. */
  authReady?: boolean
  signedIn?: boolean
}

export default function DelversFeedPage({
  onCreate,
  onOpenMessages,
  onOpenNotifications,
  onOpenProfile,
  refreshKey = 0,
  highlightPost = null,
  authReady = true,
  signedIn = true,
}: DelversFeedPageProps) {
  const [feed, setFeed] = useState<PostDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ title: string; body: string; kind: 'auth' | 'forbidden' | 'generic' } | null>(null)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, { id: string; body: string; author: string }[]>>({})
  const [draft, setDraft] = useState('')
  const [justPublished, setJustPublished] = useState(false)

  async function load(opts?: { soft?: boolean }) {
    if (!opts?.soft) setLoading(true)
    setError(null)
    try {
      const rows = await fetchFeed()
      setFeed(rows)
    } catch (err) {
      setError(feedErrorCopy(err))
      if (!opts?.soft) setFeed([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authReady) {
      setLoading(true)
      return
    }
    if (!signedIn) {
      setLoading(false)
      setFeed([])
      setError({
        kind: 'auth',
        title: 'Sign in required',
        body: 'Sign in to see posts from people you follow.',
      })
      return
    }
    void load({ soft: refreshKey > 0 })
  }, [refreshKey, authReady, signedIn])

  useEffect(() => {
    if (!highlightPost) return
    setJustPublished(true)
    setFeed(prev => {
      if (prev.some(p => p.id === highlightPost.id)) return prev
      return [highlightPost, ...prev]
    })
    const t = window.setTimeout(() => setJustPublished(false), 3500)
    return () => window.clearTimeout(t)
  }, [highlightPost?.id])

  async function toggleLike(post: PostDto) {
    try {
      const next = post.likedByMe ? await unlikePost(post.id) : await likePost(post.id)
      setFeed(list => list.map(p => (p.id === post.id ? next : p)))
    } catch {
      /* ignore */
    }
  }

  async function toggleSave(post: PostDto) {
    try {
      if (post.savedByMe) await unsaveItem({ targetType: 'POST', targetId: post.id })
      else await saveItem({ targetType: 'POST', targetId: post.id })
      setFeed(list => list.map(p => (p.id === post.id ? { ...p, savedByMe: !p.savedByMe } : p)))
    } catch {
      /* ignore */
    }
  }

  async function openComments(postId: string) {
    setOpenCommentsFor(postId)
    if (comments[postId]) return
    try {
      const rows = await fetchComments(postId)
      setComments(prev => ({
        ...prev,
        [postId]: rows.map(c => ({
          id: c.id,
          body: c.body,
          author: c.author.displayName || c.author.username,
        })),
      }))
    } catch {
      /* ignore */
    }
  }

  async function submitComment(postId: string) {
    const body = draft.trim()
    if (!body) return
    try {
      const row = await addComment(postId, body)
      setDraft('')
      setComments(prev => ({
        ...prev,
        [postId]: [
          ...(prev[postId] || []),
          { id: row.id, body: row.body, author: row.author.displayName || row.author.username },
        ],
      }))
      setFeed(list =>
        list.map(p => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)),
      )
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="sm:rounded-2xl overflow-x-clip"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1
          className="text-2xl font-extrabold tracking-tight m-0"
          style={{ fontFamily: 'Syne, sans-serif', color: 'var(--fg)' }}
        >
          Delvers
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--fg)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Activity"
          >
            <Heart size={22} />
          </button>
          <button
            type="button"
            onClick={onOpenMessages}
            className="relative p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--fg)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="Messages"
          >
            <MessageCircle size={22} />
          </button>
        </div>
      </header>

      <DelversStoryRail authReady={authReady} signedIn={signedIn} />

      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={16} />
          New post
        </button>
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          Posts from people you follow
        </p>
      </div>

      {justPublished && (
        <div
          className="px-4 py-2.5 text-sm font-medium"
          role="status"
          style={{
            background: 'rgba(140,82,255,0.12)',
            color: 'var(--primary)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          Your Delver was published.
        </div>
      )}

      <main>
        {(!authReady || loading) && <DelversListSkeleton count={4} feed />}
        {error && !loading && authReady && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
              {error.title}
            </p>
            <p className="text-sm m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>{error.body}</p>
            {error.kind !== 'auth' && (
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            )}
            {error.kind === 'auth' && onCreate && (
              <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
                Use Account in the menu to sign in, then open Delvers again.
              </p>
            )}
          </div>
        )}
        {!loading && !error && authReady && feed.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>
              No Delvers yet
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
              Be the first to share a public post with travelers on Delve.
            </p>
            <button
              type="button"
              onClick={onCreate}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              Create a post
            </button>
          </div>
        )}

        {!loading && !error && authReady && feed.map(post => {
          return (
            <article key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2.5 px-4 py-3">
                <button
                  type="button"
                  onClick={() => onOpenProfile?.(post.author.username)}
                  className="flex items-center gap-2.5"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <div
                    className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(140,82,255,0.12)' }}
                  >
                    {post.author.avatarUrl ? (
                      <img src={post.author.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User size={18} style={{ color: 'var(--fg-muted)' }} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
                      {post.author.displayName || formatUsername(post.author.username)}
                    </p>
                    {post.location && (
                      <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>{post.location}</p>
                    )}
                  </div>
                </button>
                <span className="ml-auto text-xs" style={{ color: 'var(--fg-muted)' }}>
                  {timeAgo(post.createdAt)}
                </span>
              </div>

              <PostMediaCarousel media={post.media} />

              <div className="px-4 py-3">
                <div className="flex items-center gap-4 mb-2">
                  <button
                    type="button"
                    onClick={() => void toggleLike(post)}
                    style={{ background: 'none', border: 'none', color: post.likedByMe ? '#E11D48' : 'var(--fg)', cursor: 'pointer', padding: 0 }}
                    aria-label="Like"
                  >
                    <Heart size={22} fill={post.likedByMe ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void openComments(post.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', padding: 0 }}
                    aria-label="Comments"
                  >
                    <MessageCircle size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleSave(post)}
                    className="ml-auto"
                    style={{ background: 'none', border: 'none', color: post.savedByMe ? 'var(--primary)' : 'var(--fg)', cursor: 'pointer', padding: 0 }}
                    aria-label="Save"
                  >
                    <Bookmark size={22} fill={post.savedByMe ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
                  {formatN(post.likeCount)} likes · {formatN(post.commentCount)} comments
                </p>
                {post.caption && (
                  <ExpandableCaption
                    authorFirstName={post.author.displayName || post.author.username}
                    caption={post.caption}
                  />
                )}
                {openCommentsFor === post.id && (
                  <div className="mt-3">
                    {(comments[post.id] || []).map(c => (
                      <p key={c.id} className="text-sm mb-1" style={{ color: 'var(--fg)' }}>
                        <span className="font-semibold">{c.author}</span> {c.body}
                      </p>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder="Add a comment"
                        className="flex-1 rounded-lg px-3 py-2 text-sm"
                        style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg)' }}
                      />
                      <button
                        type="button"
                        onClick={() => void submitComment(post.id)}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
                        style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </main>
    </div>
  )
}
