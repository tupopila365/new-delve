import { useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, ThumbsUp } from 'lucide-react'
import { apiFetch, mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { JourneySection } from '../journeys/JourneySection'
import '../journeys/journey-detail.css'

type CommentAuthor = {
  id?: number
  username: string
  display_name?: string | null
  avatar?: string | null
}

type EventComment = {
  id: number
  author: CommentAuthor | string
  body: string
  ago?: string
  created_at?: string
  parent_id?: number | null
  replies_count?: number
  helpful_count?: number
  marked_helpful_by_me?: boolean
  is_official?: boolean
  replies?: EventComment[]
}

type Props = {
  eventId: string
  /** Preferred section title count — falls back to loaded roots when omitted. */
  commentsCount?: number
  sectionRef?: RefObject<HTMLElement | null>
  composerRef?: RefObject<HTMLInputElement | null>
  className?: string
}

function normalizeAuthor(author: CommentAuthor | string): CommentAuthor {
  if (typeof author === 'string') {
    const label = author.trim() || 'Guest'
    return { username: label, display_name: label, avatar: null }
  }
  return {
    id: author.id,
    username: author.username || author.display_name?.trim() || 'Guest',
    display_name: author.display_name,
    avatar: author.avatar ?? null,
  }
}

function authorLabel(author: CommentAuthor): string {
  return author.display_name?.trim() || author.username || 'Guest'
}

function authorInitial(author: CommentAuthor): string {
  return authorLabel(author).charAt(0).toUpperCase() || '?'
}

function normalizeList(data: unknown): EventComment[] {
  if (Array.isArray(data)) return data as EventComment[]
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: EventComment[] }).results
  }
  return []
}

type CommentNodeProps = {
  comment: EventComment
  eventId: string
  depth?: number
  signedIn: boolean
  commentsPath: string
  onRefresh: () => void
}

function EventCommentNode({
  comment,
  eventId,
  depth = 0,
  signedIn,
  commentsPath,
  onRefresh,
}: CommentNodeProps) {
  const qc = useQueryClient()
  const author = normalizeAuthor(comment.author)
  const name = authorLabel(author)
  const avatar = mediaUrl(author.avatar ?? null)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replies, setReplies] = useState<EventComment[]>(comment.replies ?? [])
  const [repliesLoaded, setRepliesLoaded] = useState(Boolean(comment.replies?.length))
  const [repliesOpen, setRepliesOpen] = useState(depth < 1)
  const [loadingReplies, setLoadingReplies] = useState(false)

  const repliesCount = comment.replies_count ?? replies.length
  const helpfulCount = comment.helpful_count ?? 0
  const markedHelpful = Boolean(comment.marked_helpful_by_me)

  const replyMut = useMutation({
    mutationFn: (body: string) =>
      apiFetch(commentsPath, {
        method: 'POST',
        body: JSON.stringify({ body, parent_id: comment.id }),
      }),
    onSuccess: () => {
      setReplyDraft('')
      setReplyOpen(false)
      setRepliesLoaded(false)
      setRepliesOpen(true)
      void loadReplies()
      onRefresh()
    },
  })

  const helpfulMut = useMutation({
    mutationFn: () =>
      apiFetch<{ marked_helpful: boolean; helpful_count: number }>(
        `/api/events/comments/${comment.id}/helpful/`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['event-comments', eventId] })
      onRefresh()
    },
  })

  async function loadReplies() {
    setLoadingReplies(true)
    try {
      const data = await apiFetch<EventComment[] | { results: EventComment[] }>(
        `${commentsPath}?parent=${comment.id}`,
        { auth: false },
      )
      setReplies(normalizeList(data))
      setRepliesLoaded(true)
    } finally {
      setLoadingReplies(false)
    }
  }

  async function toggleReplies() {
    if (repliesOpen) {
      setRepliesOpen(false)
      return
    }
    setRepliesOpen(true)
    if (!repliesLoaded) await loadReplies()
  }

  function postReply() {
    const text = replyDraft.trim()
    if (!text || replyMut.isPending) return
    replyMut.mutate(text)
  }

  return (
    <li className={`jd-comments__item${depth > 0 ? ' jd-comments__item--nested' : ''}`}>
      <Link to={`/u/${encodeURIComponent(author.username)}`} className="jd-comments__avatar" aria-label={name}>
        {avatar ? <img src={avatar} alt="" /> : <span aria-hidden>{authorInitial(author)}</span>}
      </Link>
      <div className="jd-comments__body-wrap">
        <p className="jd-comments__meta">
          <Link to={`/u/${encodeURIComponent(author.username)}`}>
            <strong>{name}</strong>
          </Link>
          {comment.is_official ? <span className="jd-comments__badge">Host</span> : null}
          <span>{comment.ago || ''}</span>
        </p>
        <p className="jd-comments__text">{comment.body}</p>

        <div className="jd-comments__actions">
          {signedIn ? (
            <button
              type="button"
              className={`jd-comments__action${markedHelpful ? ' jd-comments__action--on' : ''}`}
              onClick={() => helpfulMut.mutate()}
              disabled={helpfulMut.isPending}
              aria-pressed={markedHelpful}
            >
              <ThumbsUp size={13} strokeWidth={2.25} fill={markedHelpful ? 'currentColor' : 'none'} aria-hidden />
              {helpfulCount > 0 ? helpfulCount : 'Helpful'}
            </button>
          ) : null}
          {signedIn ? (
            <button
              type="button"
              className="jd-comments__action"
              onClick={() => setReplyOpen((open) => !open)}
              aria-expanded={replyOpen}
            >
              Reply
            </button>
          ) : null}
          {repliesCount > 0 ? (
            <button type="button" className="jd-comments__action" onClick={() => void toggleReplies()}>
              {repliesOpen
                ? 'Hide replies'
                : `${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}`}
            </button>
          ) : null}
        </div>

        {replyOpen && signedIn ? (
          <div className="jd-comments__reply-bar">
            <input
              className="jd-comments__input jd-comments__input--reply"
              type="text"
              placeholder={`Reply to ${name}…`}
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              disabled={replyMut.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  postReply()
                }
              }}
            />
            <button
              type="button"
              className="jd-comments__post jd-comments__post--reply"
              disabled={!replyDraft.trim() || replyMut.isPending}
              onClick={postReply}
            >
              {replyMut.isPending ? 'Posting…' : 'Reply'}
            </button>
          </div>
        ) : null}

        {repliesOpen && loadingReplies ? <p className="jd-comments__loading">Loading replies…</p> : null}

        {repliesOpen && replies.length > 0 ? (
          <ul className="jd-comments__replies">
            {replies.map((reply) => (
              <EventCommentNode
                key={reply.id}
                comment={reply}
                eventId={eventId}
                depth={depth + 1}
                signedIn={signedIn}
                commentsPath={commentsPath}
                onRefresh={onRefresh}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  )
}

export function EventCommentsSection({
  eventId,
  commentsCount,
  sectionRef,
  composerRef,
  className = '',
}: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const fallbackComposerRef = useRef<HTMLInputElement>(null)
  const inputRef = composerRef ?? fallbackComposerRef
  const [composerDraft, setComposerDraft] = useState('')

  const commentsPath = `/api/events/${eventId}/comments/`
  const commentsQueryKey = ['event-comments', eventId] as const

  const { data: comments = [], isLoading, refetch } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: async () =>
      normalizeList(await apiFetch<EventComment[] | { results: EventComment[] }>(commentsPath, { auth: false })),
  })

  const titleCount = Math.max(commentsCount ?? 0, comments.length)

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: commentsQueryKey })
    void qc.invalidateQueries({ queryKey: ['event-questions', eventId] })
    void qc.invalidateQueries({ queryKey: ['event', eventId] })
    void qc.invalidateQueries({ queryKey: ['events'] })
  }

  const commentMut = useMutation({
    mutationFn: (body: string) =>
      apiFetch(commentsPath, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setComposerDraft('')
      invalidateAll()
    },
  })

  function postComment() {
    const text = composerDraft.trim()
    if (!text || commentMut.isPending) return
    commentMut.mutate(text)
  }

  return (
    <JourneySection
      title={`Comments${titleCount > 0 ? ` · ${titleCount}` : ''}`}
      className={`jd-comments ${className}`.trim()}
    >
      <section id="event-comments" ref={sectionRef} className="jd-comments__anchor" aria-label="Event comments">
        {profile ? (
          <div className="jd-comments__composer">
            <span className="jd-comments__composer-avatar" aria-hidden>
              {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
            </span>
            <input
              ref={inputRef}
              className="jd-comments__input"
              type="text"
              value={composerDraft}
              onChange={(e) => setComposerDraft(e.target.value)}
              placeholder="Ask about tickets, vibe, parking — or share a tip…"
              aria-label="Write a comment"
              disabled={commentMut.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  postComment()
                }
              }}
            />
            <button
              type="button"
              className="jd-comments__post"
              onClick={postComment}
              disabled={!composerDraft.trim() || commentMut.isPending}
            >
              {commentMut.isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        ) : (
          <p className="jd-comments__signin">
            <Link to="/login">Sign in</Link> to comment on this event.
          </p>
        )}

        {isLoading ? <p className="jd-comments__loading">Loading comments…</p> : null}

        {!isLoading && comments.length === 0 ? (
          <div className="jd-comments__empty">
            <MessageCircle size={22} strokeWidth={2} aria-hidden />
            <p>No comments yet. Be the first to ask a question or share a local tip.</p>
          </div>
        ) : null}

        {comments.length > 0 ? (
          <ul className="jd-comments__list">
            {comments.map((comment) => (
              <EventCommentNode
                key={comment.id}
                comment={comment}
                eventId={eventId}
                signedIn={Boolean(profile)}
                commentsPath={commentsPath}
                onRefresh={() => {
                  invalidateAll()
                  void refetch()
                }}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </JourneySection>
  )
}
