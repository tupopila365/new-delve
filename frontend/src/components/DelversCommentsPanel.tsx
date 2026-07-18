import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { MessageCircle, RefreshCw, ThumbsUp, UserRound, X } from 'lucide-react'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
import { DelversCommentComposer } from './DelversCommentComposer'
import { ReportButton } from './report/ReportButton'
import '../delvers-comments-panel.css'

type CommentAuthor = {
  id?: number
  username: string
  display_name?: string | null
  avatar?: string | null
}

export type DelversComment = {
  id: number
  author: CommentAuthor
  body: string
  created_at?: string
  helpful_count?: number
  marked_helpful_by_me?: boolean
}

type Props = {
  postId: number
  open: boolean
  count?: number
  onClose: () => void
  onCommented?: () => void
  signedIn?: boolean
  /** Post caption shown as the first “comment” in the sheet. */
  captionUsername?: string
  captionText?: string
  captionAvatar?: string | null
}

function formatCommentDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function authorName(author: CommentAuthor): string {
  return author.display_name?.trim() || author.username || 'Delver'
}

export function DelversCommentsPanel({
  postId,
  open,
  count = 0,
  onClose,
  onCommented,
  signedIn = false,
  captionUsername,
  captionText,
  captionAvatar,
}: Props) {
  const qc = useQueryClient()
  const commentsQueryKey = ['delvers-post-comments', postId] as const
  const commentsQuery = useQuery({
    queryKey: commentsQueryKey,
    enabled: open,
    queryFn: () => apiFetch<DelversComment[]>(`/api/social/posts/${postId}/comments/`),
    staleTime: 20_000,
  })

  const helpfulMut = useMutation({
    mutationFn: (commentId: number) =>
      apiFetch<{ marked_helpful: boolean; helpful_count: number }>(
        `/api/social/comments/${commentId}/helpful/`,
        { method: 'POST' },
      ),
    onMutate: (commentId) => {
      qc.setQueryData<DelversComment[]>(commentsQueryKey, (old) =>
        (old ?? []).map((comment) => {
          if (comment.id !== commentId) return comment
          const marked = !comment.marked_helpful_by_me
          const helpfulCount = comment.helpful_count ?? 0
          return {
            ...comment,
            marked_helpful_by_me: marked,
            helpful_count: Math.max(0, helpfulCount + (marked ? 1 : -1)),
          }
        }),
      )
    },
    onSuccess: (data, commentId) => {
      qc.setQueryData<DelversComment[]>(commentsQueryKey, (old) =>
        (old ?? []).map((comment) =>
          comment.id === commentId
            ? { ...comment, marked_helpful_by_me: data.marked_helpful, helpful_count: data.helpful_count }
            : comment,
        ),
      )
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: commentsQueryKey })
    },
  })

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const comments = commentsQuery.data ?? []
  const error = commentsQuery.error
  const needsLogin = error instanceof ApiError && error.status === 401
  const caption = captionText?.trim()
  const captionAvatarUrl = mediaUrl(captionAvatar ?? null)

  const handleCommented = () => {
    void qc.invalidateQueries({ queryKey: commentsQueryKey })
    onCommented?.()
  }

  return createPortal(
    <div className="ds-comments-sheet" role="dialog" aria-modal="true" aria-label="Comments">
      <button type="button" className="ds-comments-sheet__backdrop" aria-label="Close comments" onClick={onClose} />
      <section className="ds-comments-sheet__panel">
        <div className="ds-comments-sheet__handle" aria-hidden />
        <div className="ds-comments-panel__head">
          <span>
            <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
            {count > 0 ? `${count} ${count === 1 ? 'comment' : 'comments'}` : 'Comments'}
          </span>
          <div className="ds-comments-panel__head-actions">
            <button
              type="button"
              className="ds-comments-panel__refresh"
              onClick={() => void commentsQuery.refetch()}
              disabled={commentsQuery.isFetching}
              aria-label="Refresh comments"
            >
              <RefreshCw size={14} strokeWidth={2.25} aria-hidden />
              {commentsQuery.isFetching ? 'Refreshing' : 'Refresh'}
            </button>
            <button type="button" className="ds-comments-panel__close" onClick={onClose} aria-label="Close comments">
              <X size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </div>

        <div className="ds-comments-sheet__body">
          {caption && captionUsername ? (
            <ul className="ds-comments-panel__list ds-comments-panel__list--caption">
              <li className="ds-comments-panel__item ds-comments-panel__item--caption">
                <Link
                  to={`/u/${encodeURIComponent(captionUsername)}`}
                  className="ds-comments-panel__avatar"
                  aria-label={captionUsername}
                >
                  {captionAvatarUrl ? (
                    <img src={captionAvatarUrl} alt="" />
                  ) : (
                    <UserRound size={16} strokeWidth={2.1} aria-hidden />
                  )}
                </Link>
                <div className="ds-comments-panel__body">
                  <p>
                    <Link to={`/u/${encodeURIComponent(captionUsername)}`}>{captionUsername}</Link>{' '}
                    <span>{caption}</span>
                  </p>
                </div>
              </li>
            </ul>
          ) : null}

          {commentsQuery.isLoading ? (
            <div className="ds-comments-panel__loading" role="status">
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {needsLogin ? (
            <p className="ds-comments-panel__notice">
              Sign in to view and join this comment thread. <Link to="/login">Log in</Link>
            </p>
          ) : null}

          {!needsLogin && commentsQuery.isError ? (
            <p className="ds-comments-panel__notice">We could not load these comments. Try again.</p>
          ) : null}

          {!commentsQuery.isLoading && !commentsQuery.isError && comments.length === 0 ? (
            <p className="ds-comments-panel__notice">
              {caption ? 'No other comments yet. Be the first to reply.' : 'No comments yet. Be the first to start the conversation.'}
            </p>
          ) : null}

          {comments.length > 0 ? (
            <ul className="ds-comments-panel__list">
              {comments.map((comment) => {
                const name = authorName(comment.author)
                const avatar = mediaUrl(comment.author.avatar ?? null)
                const liked = Boolean(comment.marked_helpful_by_me)
                return (
                  <li key={comment.id} className="ds-comments-panel__item">
                    <Link
                      to={`/u/${encodeURIComponent(comment.author.username)}`}
                      className="ds-comments-panel__avatar"
                      aria-label={name}
                    >
                      {avatar ? <img src={avatar} alt="" /> : <UserRound size={16} strokeWidth={2.1} aria-hidden />}
                    </Link>
                    <div className="ds-comments-panel__body">
                      <p>
                        <Link to={`/u/${encodeURIComponent(comment.author.username)}`}>{comment.author.username}</Link>{' '}
                        <span>{comment.body}</span>
                      </p>
                      <div className="ds-comments-panel__meta">
                        {comment.created_at ? <small>{formatCommentDate(comment.created_at)}</small> : null}
                        {signedIn ? (
                          <button
                            type="button"
                            className={`ds-comments-panel__like${liked ? ' is-active' : ''}`}
                            onClick={() => helpfulMut.mutate(comment.id)}
                            disabled={helpfulMut.isPending}
                            aria-label={liked ? 'Unlike comment' : 'Like comment'}
                            aria-pressed={liked}
                          >
                            <ThumbsUp size={13} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
                            {(comment.helpful_count ?? 0) > 0 ? comment.helpful_count : null}
                          </button>
                        ) : null}
                        <ReportButton
                          className="ds-comments-panel__report"
                          iconOnly
                          triggerLabel="Report comment"
                          target={{
                            target_type: 'comment',
                            target_id: String(comment.id),
                            target_label: comment.body.slice(0, 60),
                          }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        {signedIn ? (
          <DelversCommentComposer
            postId={postId}
            variant="compact"
            placeholder="Add a comment..."
            onCommented={handleCommented}
          />
        ) : (
          <p className="ds-comments-panel__composer-hint">
            <Link to="/login">Sign in</Link> to join the conversation.
          </p>
        )}
      </section>
    </div>,
    document.body,
  )
}
