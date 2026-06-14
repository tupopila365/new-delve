import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { MessageCircle, RefreshCw, UserRound } from 'lucide-react'
import { ApiError, apiFetch, mediaUrl } from '../api/client'
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
}

type Props = {
  postId: number
  open: boolean
  count?: number
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

export function DelversCommentsPanel({ postId, open, count = 0 }: Props) {
  const commentsQuery = useQuery({
    queryKey: ['delvers-post-comments', postId],
    enabled: open,
    queryFn: () => apiFetch<DelversComment[]>(`/api/social/posts/${postId}/comments/`, { auth: false }),
    staleTime: 20_000,
  })

  if (!open) return null

  const comments = commentsQuery.data ?? []
  const error = commentsQuery.error
  const needsLogin = error instanceof ApiError && error.status === 401

  return (
    <section className="ds-comments-panel" aria-label="Post comments">
      <div className="ds-comments-panel__head">
        <span>
          <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
          {count > 0 ? `${count} ${count === 1 ? 'comment' : 'comments'}` : 'Comments'}
        </span>
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
      </div>

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
        <p className="ds-comments-panel__notice">No comments yet. Be the first to start the conversation.</p>
      ) : null}

      {comments.length > 0 ? (
        <ul className="ds-comments-panel__list">
          {comments.map((comment) => {
            const name = authorName(comment.author)
            const avatar = mediaUrl(comment.author.avatar ?? null)
            return (
              <li key={comment.id} className="ds-comments-panel__item">
                <Link to={`/u/${encodeURIComponent(comment.author.username)}`} className="ds-comments-panel__avatar" aria-label={name}>
                  {avatar ? <img src={avatar} alt="" /> : <UserRound size={16} strokeWidth={2.1} aria-hidden />}
                </Link>
                <div className="ds-comments-panel__body">
                  <p>
                    <Link to={`/u/${encodeURIComponent(comment.author.username)}`}>{comment.author.username}</Link>{' '}
                    <span>{comment.body}</span>
                  </p>
                  {comment.created_at ? <small>{formatCommentDate(comment.created_at)}</small> : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
