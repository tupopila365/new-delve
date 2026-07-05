import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, Heart, Reply, ThumbsDown, ThumbsUp } from 'lucide-react'
import { apiFetch } from '../../api/client'
import type { CommunityComment, PaginatedComments } from '../../utils/communityComments'
import {
  REPLY_PAGE_SIZE,
  communityCommentsPath,
  normalizeCommentsResponse,
} from '../../utils/communityComments'
import { formatCount, relativeTime } from '../../utils/relativeTime'
import { renderCommentBody } from '../../utils/renderCommentBody'
import { UserAvatar } from '../UserAvatar'
import { CommentOverflowMenu } from './CommunityOverflowMenu'
import { CommunityInlineReplyComposer } from './CommunityInlineReplyComposer'
import type { ReportTarget } from '../report/ReportButton'

type PostAuthor = {
  username: string
  display_name?: string | null
  avatar?: string | null
}

type ReplyTarget =
  | { kind: 'post' }
  | { kind: 'comment'; id: number; username: string }
  | null

function authorName(comment: CommunityComment): string {
  return comment.author?.display_name?.trim() || comment.author?.username || 'Local'
}

function authorHandle(comment: CommunityComment): string {
  return comment.author?.username ? `@${comment.author.username}` : '@local'
}

type Props = {
  comment: CommunityComment
  postId: number
  postAuthor: PostAuthor
  depth?: number
  signedIn: boolean
  isQuestion: boolean
  isQuestionAuthor: boolean
  isPostAuthor: boolean
  replyTarget: ReplyTarget
  onStartReply: (comment: CommunityComment) => void
  onCancelReply: () => void
  onCommented: () => void
  commentsQueryKey: readonly unknown[]
  composerPlaceholder: string
}

export function CommunityCommentNode({
  comment: commentProp,
  postId,
  postAuthor,
  depth = 0,
  signedIn,
  isQuestion,
  isQuestionAuthor,
  isPostAuthor,
  replyTarget,
  onStartReply,
  onCancelReply,
  onCommented,
  commentsQueryKey,
  composerPlaceholder,
}: Props) {
  const qc = useQueryClient()
  const [comment, setComment] = useState(commentProp)
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [loadedReplies, setLoadedReplies] = useState<CommunityComment[]>([])
  const [replyTotal, setReplyTotal] = useState(commentProp.replies_count ?? 0)
  const [nextReplyOffset, setNextReplyOffset] = useState<number | null>(null)
  const [repliesLoading, setRepliesLoading] = useState(false)

  useEffect(() => {
    setComment(commentProp)
    setReplyTotal(commentProp.replies_count ?? 0)
  }, [commentProp])

  const replyActive = replyTarget?.kind === 'comment' && replyTarget.id === comment.id
  const helpfulCount = comment.helpful_count ?? 0
  const dislikeCount = comment.dislike_count ?? 0
  const repliesCount = comment.replies_count ?? replyTotal
  const nested = depth > 0

  const fetchReplies = async (offset: number, append: boolean) => {
    setRepliesLoading(true)
    try {
      const raw = await apiFetch<CommunityComment[] | PaginatedComments>(
        communityCommentsPath(postId, { parentId: comment.id, limit: REPLY_PAGE_SIZE, offset }),
      )
      const page = normalizeCommentsResponse(raw)
      setLoadedReplies((prev) => (append ? [...prev, ...page.results] : page.results))
      setReplyTotal(page.count)
      setNextReplyOffset(page.next_offset)
    } finally {
      setRepliesLoading(false)
    }
  }

  const toggleReplies = async () => {
    if (repliesOpen) {
      setRepliesOpen(false)
      return
    }
    setRepliesOpen(true)
    await fetchReplies(0, false)
  }

  const helpfulMut = useMutation({
    mutationFn: () =>
      apiFetch<{ marked_helpful: boolean; helpful_count: number }>(
        `/api/social/comments/${comment.id}/helpful/`,
        { method: 'POST' },
      ),
    onSuccess: (data) =>
      setComment((prev) => ({ ...prev, marked_helpful_by_me: data.marked_helpful, helpful_count: data.helpful_count })),
  })

  const dislikeMut = useMutation({
    mutationFn: () =>
      apiFetch<{ marked_disliked: boolean; dislike_count: number }>(
        `/api/social/comments/${comment.id}/dislike/`,
        { method: 'POST' },
      ),
    onSuccess: (data) =>
      setComment((prev) => ({ ...prev, marked_disliked_by_me: data.marked_disliked, dislike_count: data.dislike_count })),
  })

  const heartMut = useMutation({
    mutationFn: () =>
      apiFetch<{ hearted_by_author: boolean }>(`/api/social/comments/${comment.id}/heart/`, { method: 'POST' }),
    onSuccess: (data) => setComment((prev) => ({ ...prev, hearted_by_author: data.hearted_by_author })),
  })

  const acceptMut = useMutation({
    mutationFn: () => apiFetch(`/api/social/comments/${comment.id}/accept/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentsQueryKey })
      void qc.invalidateQueries({ queryKey: ['post', postId] })
    },
  })

  const reportTarget: ReportTarget = {
    target_type: 'comment',
    target_id: String(comment.id),
    target_label: comment.body.slice(0, 60),
  }

  const name = authorName(comment)
  const handle = authorHandle(comment)

  return (
    <div className={`cm-reply-block${nested ? ' cm-reply-block--nested' : ''}`}>
      <article className={`cm-comment cm-comment--reply${nested ? ' cm-comment--nested' : ''}`}>
        <Link
          to={comment.author?.username ? `/u/${encodeURIComponent(comment.author.username)}` : '#'}
          className="cm-comment__avatar"
          aria-label={name}
        >
          <UserAvatar src={comment.author?.avatar} name={name} fill />
        </Link>

        <div className="cm-comment__body">
          <div className="cm-comment__head">
            <Link
              to={comment.author?.username ? `/u/${encodeURIComponent(comment.author.username)}` : '#'}
              className="cm-comment__handle"
            >
              {handle}
            </Link>
            {comment.created_at ? (
              <time className="cm-comment__time" dateTime={comment.created_at}>
                {relativeTime(comment.created_at)}
              </time>
            ) : null}
            {comment.is_accepted_answer ? (
              <span className="cm-comment__badge cm-comment__badge--accepted">Best answer</span>
            ) : null}
            {comment.hearted_by_author ? (
              <span className="cm-comment__creator-heart" title={`Hearted by @${postAuthor.username}`}>
                <UserAvatar src={postAuthor.avatar} name={postAuthor.display_name || postAuthor.username} fill />
                <Heart size={10} strokeWidth={2.5} fill="currentColor" aria-hidden className="cm-comment__creator-heart-icon" />
              </span>
            ) : null}
            <CommentOverflowMenu reportTarget={reportTarget} />
          </div>

          <p className="cm-comment__text">{renderCommentBody(comment.body)}</p>

          <div className="cm-comment__bar" aria-label="Comment actions">
            {signedIn ? (
              <button
                type="button"
                className={`cm-comment__bar-btn${comment.marked_helpful_by_me ? ' is-active' : ''}`}
                onClick={() => helpfulMut.mutate()}
                disabled={helpfulMut.isPending}
                aria-pressed={comment.marked_helpful_by_me}
                aria-label="Helpful"
              >
                <ThumbsUp size={16} strokeWidth={2.25} fill={comment.marked_helpful_by_me ? 'currentColor' : 'none'} aria-hidden />
                {helpfulCount > 0 ? <span>{formatCount(helpfulCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="cm-comment__bar-btn" aria-label="Helpful">
                <ThumbsUp size={16} strokeWidth={2.25} aria-hidden />
              </Link>
            )}
            {signedIn ? (
              <button
                type="button"
                className={`cm-comment__bar-btn${comment.marked_disliked_by_me ? ' is-active' : ''}`}
                onClick={() => dislikeMut.mutate()}
                disabled={dislikeMut.isPending}
                aria-pressed={comment.marked_disliked_by_me}
                aria-label="Not helpful"
              >
                <ThumbsDown size={16} strokeWidth={2.25} fill={comment.marked_disliked_by_me ? 'currentColor' : 'none'} aria-hidden />
                {dislikeCount > 0 ? <span>{formatCount(dislikeCount)}</span> : null}
              </button>
            ) : (
              <Link to="/login" className="cm-comment__bar-btn" aria-label="Not helpful">
                <ThumbsDown size={16} strokeWidth={2.25} aria-hidden />
              </Link>
            )}
            {signedIn ? (
              <button
                type="button"
                className={`cm-comment__bar-btn${replyActive ? ' is-active' : ''}`}
                onClick={() => onStartReply(comment)}
                aria-label={`Reply to ${name}`}
                aria-expanded={replyActive}
              >
                <Reply size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : (
              <Link to="/login" className="cm-comment__bar-btn" aria-label="Reply">
                <Reply size={16} strokeWidth={2.25} aria-hidden />
              </Link>
            )}
            {isQuestion && isQuestionAuthor ? (
              <button
                type="button"
                className={`cm-comment__bar-btn cm-comment__bar-btn--accept${comment.is_accepted_answer ? ' is-active' : ''}`}
                onClick={() => acceptMut.mutate()}
                disabled={acceptMut.isPending}
                aria-label={comment.is_accepted_answer ? 'Accepted answer' : 'Accept as best answer'}
                aria-pressed={comment.is_accepted_answer}
              >
                <CheckCircle2 size={16} strokeWidth={2.25} aria-hidden />
              </button>
            ) : null}
            {isPostAuthor && signedIn ? (
              <button
                type="button"
                className={`cm-comment__bar-btn cm-comment__bar-btn--heart${comment.hearted_by_author ? ' is-active' : ''}`}
                onClick={() => heartMut.mutate()}
                disabled={heartMut.isPending}
                aria-label={comment.hearted_by_author ? 'Remove creator heart' : 'Heart as creator'}
                aria-pressed={comment.hearted_by_author}
              >
                <Heart size={16} strokeWidth={2.25} fill={comment.hearted_by_author ? 'currentColor' : 'none'} aria-hidden />
              </button>
            ) : null}
          </div>

          {replyActive && signedIn ? (
            <CommunityInlineReplyComposer
              postId={postId}
              parentId={comment.id}
              mention={comment.author?.username}
              placeholder={composerPlaceholder}
              onCommented={() => {
                onCommented()
                if (repliesOpen) void fetchReplies(0, false)
              }}
              onCancel={onCancelReply}
            />
          ) : null}
        </div>
      </article>

      {repliesCount > 0 ? (
        <button
          type="button"
          className={`cm-thread__replies-toggle cm-thread__replies-toggle--nested${repliesOpen ? ' is-open' : ''}`}
          onClick={() => void toggleReplies()}
          aria-expanded={repliesOpen}
        >
          {repliesOpen ? 'Hide replies' : `${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}`}
          <ChevronDown size={16} strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}

      {repliesOpen ? (
        <div className="cm-thread__replies cm-thread__replies--nested">
          {repliesLoading && loadedReplies.length === 0 ? (
            <p className="cm-thread__replies-loading" role="status">Loading replies…</p>
          ) : (
            loadedReplies.map((reply) => (
              <CommunityCommentNode
                key={reply.id}
                comment={reply}
                postId={postId}
                postAuthor={postAuthor}
                depth={depth + 1}
                signedIn={signedIn}
                isQuestion={isQuestion}
                isQuestionAuthor={isQuestionAuthor}
                isPostAuthor={isPostAuthor}
                replyTarget={replyTarget}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
                onCommented={onCommented}
                commentsQueryKey={commentsQueryKey}
                composerPlaceholder={composerPlaceholder}
              />
            ))
          )}
          {nextReplyOffset != null ? (
            <button
              type="button"
              className="cm-thread__show-more"
              onClick={() => void fetchReplies(nextReplyOffset, true)}
              disabled={repliesLoading}
            >
              Show more replies
              <ChevronDown size={16} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
