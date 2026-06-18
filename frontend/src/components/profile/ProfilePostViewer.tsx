import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bookmark, Heart, MessageCircle, UserRound, X } from 'lucide-react'
import { apiFetch, mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { FeedPost } from '../IgPostCard'
import { PostMedia } from '../PostMedia'
import { DelversCommentComposer } from '../DelversCommentComposer'
import { formatEngagementCount, profilePostPreview } from './profilePostViewerUtils'
import './profile-post-viewer.css'

type PostComment = {
  id: number
  author?: {
    username: string
    display_name?: string | null
    avatar?: string | null
  } | null
  body: string
  created_at?: string
}

type Props = {
  posts: FeedPost[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
  queryKey?: unknown[]
}

function commentAuthorName(comment: PostComment): string {
  return comment.author?.display_name?.trim() || comment.author?.username || 'Delver'
}

function ProfilePostSlide({
  post,
  active,
  showComments,
  onToggleComments,
  queryKey,
}: {
  post: FeedPost
  active: boolean
  showComments: boolean
  onToggleComments: () => void
  queryKey: unknown[]
}) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const videoRef = useRef<HTMLVideoElement>(null)

  const likeMut = useMutation({
    mutationFn: () => apiFetch(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey })
      void qc.invalidateQueries({ queryKey: ['post', post.id] })
    },
  })

  const saveMut = useMutation({
    mutationFn: () => apiFetch(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey })
      void qc.invalidateQueries({ queryKey: ['post', post.id] })
    },
  })

  const commentsQueryKey = ['post-comments', post.id] as const
  const {
    data: comments = [],
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => apiFetch<PostComment[]>(`/api/social/posts/${post.id}/comments/`, { auth: false }),
    enabled: active && showComments,
    retry: false,
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (active) {
      void video.play().catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
    }
  }, [active])

  const name = post.author.display_name || post.author.username
  const avatar = mediaUrl(post.author.avatar ?? null)
  const likes = post.likes_count ?? 0
  const commentsCount = post.comments_count ?? 0
  const preview = profilePostPreview(post.body)

  const handleCommented = () => {
    void qc.invalidateQueries({ queryKey: commentsQueryKey })
    void qc.invalidateQueries({ queryKey })
    void qc.invalidateQueries({ queryKey: ['post', post.id] })
  }

  return (
    <>
      <div className="ppv__media">
        {post.video ? (
          <div className="post-media-wrap post-media-wrap--detail">
            <video
              ref={videoRef}
              className="ig-post__media"
              src={mediaUrl(post.video) ?? undefined}
              poster={post.image ? mediaUrl(post.image) ?? undefined : undefined}
              playsInline
              loop
              muted
              autoPlay={active}
              controls={active}
              preload={active ? 'auto' : 'metadata'}
            />
          </div>
        ) : (
          <PostMedia image={post.image} video={null} variant="detail" alt={preview} />
        )}
      </div>

      <div className="ppv__scrim" aria-hidden />

      <div className="ppv__hud">
        <div className="ppv__hud-row">
          <div className="ppv__meta">
            <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="ppv__author">
              <span className="ppv__author-avatar" aria-hidden>
                {avatar ? <img src={avatar} alt="" /> : name.charAt(0).toUpperCase()}
              </span>
              @{post.author.username}
            </Link>
            {post.body?.trim() ? <p className="ppv__caption">{post.body.trim()}</p> : null}
            {post.region ? <p className="ppv__region">{post.region}</p> : null}
          </div>

          <div className="ppv__actions">
            {profile ? (
              <>
                <button
                  type="button"
                  className={`ppv__action${post.liked_by_me ? ' ppv__action--active' : ''}`}
                  aria-label={post.liked_by_me ? 'Unlike' : 'Like'}
                  onClick={() => likeMut.mutate()}
                >
                  <Heart size={28} strokeWidth={2} fill={post.liked_by_me ? 'currentColor' : 'none'} aria-hidden />
                  {likes > 0 ? <span className="ppv__action-count">{formatEngagementCount(likes)}</span> : null}
                </button>
                <button
                  type="button"
                  className="ppv__action"
                  aria-label="Comments"
                  aria-expanded={showComments}
                  onClick={onToggleComments}
                >
                  <MessageCircle size={28} strokeWidth={2} aria-hidden />
                  {commentsCount > 0 ? (
                    <span className="ppv__action-count">{formatEngagementCount(commentsCount)}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={`ppv__action${post.saved_by_me ? ' ppv__action--save-active' : ''}`}
                  aria-label={post.saved_by_me ? 'Unsave' : 'Save'}
                  onClick={() => saveMut.mutate()}
                >
                  <Bookmark size={26} strokeWidth={2} fill={post.saved_by_me ? 'currentColor' : 'none'} aria-hidden />
                </button>
              </>
            ) : (
              <>
                {likes > 0 ? (
                  <span className="ppv__action">
                    <Heart size={28} strokeWidth={2} aria-hidden />
                    <span className="ppv__action-count">{formatEngagementCount(likes)}</span>
                  </span>
                ) : null}
                {commentsCount > 0 ? (
                  <span className="ppv__action">
                    <MessageCircle size={28} strokeWidth={2} aria-hidden />
                    <span className="ppv__action-count">{formatEngagementCount(commentsCount)}</span>
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {showComments ? (
        <div className="ppv__comments" role="dialog" aria-label="Comments">
          <div className="ppv__comments-head">
            <h3>{commentsCount === 1 ? '1 comment' : `${commentsCount} comments`}</h3>
            <button type="button" className="ppv__comments-close" onClick={onToggleComments} aria-label="Close comments">
              <X size={18} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <div className="ppv__comments-body">
            {commentsLoading ? <p className="ppv__comments-status">Loading comments…</p> : null}
            {!commentsLoading && comments.length === 0 ? (
              <p className="ppv__comments-empty">No comments yet. Start the conversation.</p>
            ) : null}
            {comments.map((comment) => {
              const cAvatar = mediaUrl(comment.author?.avatar ?? null)
              return (
                <article key={comment.id} className="ppv__comment">
                  <span className="ppv__comment-avatar" aria-hidden>
                    {cAvatar ? <img src={cAvatar} alt="" /> : <UserRound size={16} strokeWidth={2.15} />}
                  </span>
                  <div className="ppv__comment-bubble">
                    <p className="ppv__comment-meta">
                      <strong>{commentAuthorName(comment)}</strong>
                      {comment.created_at
                        ? new Date(comment.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : null}
                    </p>
                    <p className="ppv__comment-text">{comment.body}</p>
                  </div>
                </article>
              )
            })}
          </div>
          {profile ? (
            <div className="ppv__comments-composer">
              <DelversCommentComposer postId={post.id} onClose={onToggleComments} onCommented={handleCommented} />
            </div>
          ) : (
            <div className="ppv__comments-composer">
              <Link to="/login" className="btn btn-ghost btn-sm btn-block">
                Sign in to comment
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}

export function ProfilePostViewer({ posts, index, onClose, onChange, queryKey = [] }: Props) {
  const feedRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])
  const [commentsOpenFor, setCommentsOpenFor] = useState<number | null>(null)
  const scrollingProgrammatically = useRef(false)

  const scrollToIndex = useCallback((next: number, behavior: ScrollBehavior = 'smooth') => {
    const el = slideRefs.current[next]
    if (!el) return
    scrollingProgrammatically.current = true
    el.scrollIntoView({ behavior, block: 'start' })
    window.setTimeout(() => {
      scrollingProgrammatically.current = false
    }, 450)
  }, [])

  useEffect(() => {
    scrollToIndex(index, 'instant' as ScrollBehavior)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- open at initial index only

  useEffect(() => {
    const root = feedRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingProgrammatically.current) return
        const visible = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio >= 0.55)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const idx = Number(visible.target.getAttribute('data-index'))
        if (Number.isFinite(idx) && idx !== index) {
          onChange(idx)
          setCommentsOpenFor(null)
        }
      },
      { root, threshold: [0.55, 0.75, 0.9] },
    )

    slideRefs.current.forEach((node) => {
      if (node) observer.observe(node)
    })

    return () => observer.disconnect()
  }, [index, onChange, posts.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (commentsOpenFor != null) {
          setCommentsOpenFor(null)
          return
        }
        onClose()
      }
      if (e.key === 'ArrowDown' && index < posts.length - 1) {
        e.preventDefault()
        onChange(index + 1)
        scrollToIndex(index + 1)
        setCommentsOpenFor(null)
      }
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault()
        onChange(index - 1)
        scrollToIndex(index - 1)
        setCommentsOpenFor(null)
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [commentsOpenFor, index, onChange, onClose, posts.length, scrollToIndex])

  useEffect(() => {
    if (commentsOpenFor != null && commentsOpenFor !== posts[index]?.id) {
      setCommentsOpenFor(null)
    }
  }, [commentsOpenFor, index, posts])

  if (posts.length === 0) return null
  const current = posts[index]
  if (!current) return null

  return createPortal(
    <div className="ppv" role="dialog" aria-modal="true" aria-label="Profile photos and videos">
      <button type="button" className="ppv__close" onClick={onClose} aria-label="Close">
        <X size={22} strokeWidth={2.25} aria-hidden />
      </button>

      {posts.length > 1 ? (
        <p className="ppv__index">
          {index + 1} / {posts.length}
        </p>
      ) : null}

      <div ref={feedRef} className="ppv__feed">
        {posts.map((post, i) => (
          <section
            key={post.id}
            ref={(node) => {
              slideRefs.current[i] = node
            }}
            className="ppv__slide"
            data-index={i}
            aria-hidden={i !== index}
          >
            <ProfilePostSlide
              post={post}
              active={i === index}
              showComments={commentsOpenFor === post.id}
              onToggleComments={() =>
                setCommentsOpenFor((id) => (id === post.id ? null : post.id))
              }
              queryKey={queryKey}
            />
          </section>
        ))}
      </div>
    </div>,
    document.body,
  )
}
