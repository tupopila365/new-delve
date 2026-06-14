import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, MessageCircle, UserRound } from 'lucide-react'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DelversCommentComposer } from '../components/DelversCommentComposer'
import { IgPostCard, type FeedPost } from '../components/IgPostCard'
import { DetailSkeleton } from '../components/detail'
import { EmptyState } from '../components/ui'
import '../post-detail-social-connect.css'

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

function formatCommentDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function commentAuthorName(comment: PostComment): string {
  return comment.author?.display_name?.trim() || comment.author?.username || 'Delver'
}

function commentInitial(comment: PostComment): string {
  return commentAuthorName(comment).trim().charAt(0).toUpperCase() || '?'
}

export function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [commentComposerOpen, setCommentComposerOpen] = useState(false)
  const postId = Number(id)
  const validId = Number.isFinite(postId) && postId > 0

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiFetch<FeedPost>(`/api/social/posts/${postId}/`, { auth: false }),
    enabled: validId,
    retry: false,
  })

  const commentsQueryKey = ['post-comments', postId] as const
  const {
    data: commentsRaw,
    isLoading: commentsLoading,
    isError: commentsError,
  } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => apiFetch<PostComment[]>(`/api/social/posts/${postId}/comments/`, { auth: false }),
    enabled: validId && Boolean(data),
    retry: false,
  })

  const {
    data: similarRaw,
    isLoading: similarLoading,
    isError: similarError,
  } = useQuery({
    queryKey: ['post-similar', postId],
    queryFn: () => apiFetch<FeedPost[]>(`/api/social/posts/${postId}/similar/`),
    enabled: validId && Boolean(data),
    retry: false,
  })

  const similarPosts = useMemo(() => {
    const rows = similarRaw ?? []
    return rows.filter((p) => p.id !== postId)
  }, [similarRaw, postId])

  const comments = commentsRaw ?? []
  const commentCount = commentsRaw?.length ?? data?.comments_count ?? 0

  useEffect(() => {
    if (location.hash !== '#comments' || !data) return
    const t = window.setTimeout(() => {
      document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(t)
  }, [location.hash, data])

  const handleCommented = () => {
    void qc.invalidateQueries({ queryKey: commentsQueryKey })
    void qc.invalidateQueries({ queryKey: ['post', postId] })
  }

  const notFound = error instanceof ApiError && error.status === 404
  const hasBackdrop = Boolean(data?.video || data?.image)
  const backdropSrc = data?.video ? mediaUrl(data.video) : data?.image ? mediaUrl(data.image) : undefined

  const showSimilarRail =
    validId &&
    Boolean(data) &&
    !notFound &&
    !similarError &&
    (similarLoading || similarPosts.length > 0)

  return (
    <div className={hasBackdrop ? 'post-detail-page post-detail-page--immersive' : 'post-detail-page'}>
      {hasBackdrop && backdropSrc ? (
        <div className="post-detail-page__backdrop" aria-hidden>
          {data?.video ? (
            <video
              className="post-detail-page__backdrop-media"
              src={backdropSrc}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
            />
          ) : (
            <img className="post-detail-page__backdrop-media" src={backdropSrc} alt="" />
          )}
          <div className="post-detail-page__backdrop-scrim" />
        </div>
      ) : null}

      <div className="post-detail-page__inner">
        <div className="post-detail-page__bar">
          <button type="button" className="post-detail-page__back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={15} strokeWidth={2.35} aria-hidden />
            Back
          </button>
          <Link to="/delvers" className="post-detail-page__home">
            Delvers
          </Link>
        </div>

        {!validId && (
          <p className="page-sub" role="alert">
            Invalid post link. <Link to="/delvers">Return to Delvers</Link>
          </p>
        )}

        {validId && isLoading && <DetailSkeleton className="post-detail-page__skeleton" />}

        {validId && notFound && (
          <EmptyState
            iconElement={<Camera size={28} strokeWidth={2} aria-hidden />}
            title="Post not found"
            sub="It may have been removed, or the link is wrong."
            cta={{ label: 'Browse Delvers', to: '/delvers' }}
            action={
              <Link to="/" className="btn btn-ghost">
                Home
              </Link>
            }
          />
        )}

        {validId && error && !notFound && (
          <EmptyState
            iconElement={<Camera size={28} strokeWidth={2} aria-hidden />}
            title="We couldn't load this post"
            sub="Please check your connection and try again."
            cta={{ label: 'Browse Delvers', to: '/delvers' }}
          />
        )}

        {data && (
          <>
            <div className="post-detail-page__hero">
              {data.is_delvers && data.delvers_board ? (
                <p className="post-detail-page__board">
                  <Link to="/delvers">Delvers</Link>
                  <span aria-hidden> · </span>
                  <span>{data.delvers_board}</span>
                </p>
              ) : null}
              <IgPostCard post={data} queryKey={['post', data.id]} linkMedia={false} mediaVariant="detail" />
            </div>

            <section id="comments" className="post-comments" aria-labelledby="post-comments-heading">
              <div className="post-comments__head">
                <div>
                  <p className="post-comments__kicker">Discussion</p>
                  <h2 id="post-comments-heading">
                    {commentCount === 1 ? '1 comment' : `${commentCount} comments`}
                  </h2>
                </div>
                <MessageCircle size={22} strokeWidth={2.25} aria-hidden />
              </div>

              {profile ? (
                commentComposerOpen ? (
                  <DelversCommentComposer
                    postId={data.id}
                    onClose={() => setCommentComposerOpen(false)}
                    onCommented={handleCommented}
                  />
                ) : (
                  <button type="button" className="post-comments__write" onClick={() => setCommentComposerOpen(true)}>
                    <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
                    Write a comment
                  </button>
                )
              ) : (
                <Link to="/login" className="post-comments__write">
                  <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
                  Sign in to comment
                </Link>
              )}

              {commentsLoading ? <p className="post-comments__status">Loading comments…</p> : null}
              {commentsError ? <p className="post-comments__status">We couldn't load comments. Please try again.</p> : null}
              {!commentsLoading && !commentsError && comments.length === 0 ? (
                <p className="post-comments__empty">No comments yet. Be the first to start the conversation.</p>
              ) : null}

              {comments.length > 0 ? (
                <div className="post-comments__list">
                  {comments.map((comment) => {
                    const avatar = mediaUrl(comment.author?.avatar ?? null)
                    return (
                      <article key={comment.id} className="post-comments__item">
                        <span className="post-comments__avatar" aria-hidden>
                          {avatar ? <img src={avatar} alt="" /> : <UserRound size={17} strokeWidth={2.15} />}
                        </span>
                        <div className="post-comments__bubble">
                          <p className="post-comments__meta">
                            <strong>{commentAuthorName(comment)}</strong>
                            {comment.author?.username ? <Link to={`/u/${encodeURIComponent(comment.author.username)}`}>@{comment.author.username}</Link> : null}
                            {comment.created_at ? <span>{formatCommentDate(comment.created_at)}</span> : null}
                          </p>
                          <p className="post-comments__body">{comment.body}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : null}
            </section>

            {showSimilarRail ? (
              <section className="post-detail-similar" aria-labelledby="post-similar-heading">
                <h2 id="post-similar-heading" className="post-detail-similar__title">
                  More posts you may like
                </h2>
                <div className="post-detail-similar__list">
                  {similarLoading &&
                    similarPosts.length === 0 &&
                    [0, 1].map((k) => (
                      <div key={`sk-${k}`} className="post-detail-similar__snap">
                        <div className="skeleton post-detail-similar__skeleton" aria-hidden />
                      </div>
                    ))}
                  {!similarLoading &&
                    similarPosts.map((p) => (
                      <div key={p.id} className="post-detail-similar__snap">
                        <IgPostCard post={p} queryKey={['post', p.id]} linkMedia />
                      </div>
                    ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
