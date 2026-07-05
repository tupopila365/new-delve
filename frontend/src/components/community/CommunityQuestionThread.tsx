import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Heart, ThumbsUp } from 'lucide-react'
import { apiFetch, mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { FeedPost } from '../IgPostCard'
import { UserAvatar } from '../UserAvatar'
import { DelversCommentComposer } from '../DelversCommentComposer'
import { ReportButton } from '../report/ReportButton'
import { renderTextWithHashtags } from '../../utils/hashtags'
import { invalidatePostEngagementCaches } from '../../utils/socialCache'
import { CommunityEngagementActions } from './CommunityEngagementActions'
import './community-question-thread.css'

type PostComment = {
  id: number
  author?: {
    username: string
    display_name?: string | null
    avatar?: string | null
  } | null
  body: string
  created_at?: string
  is_accepted_answer?: boolean
  helpful_count?: number
  marked_helpful_by_me?: boolean
}

type Props = {
  post: FeedPost
  queryKey: unknown[]
  highlighted?: boolean
  defaultOpen?: boolean
}

function commentAuthorName(comment: PostComment): string {
  return comment.author?.display_name?.trim() || comment.author?.username || 'Local'
}

export function CommunityQuestionThread({ post, queryKey, highlighted = false, defaultOpen = false }: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const signedIn = Boolean(profile)
  const [answersOpen, setAnswersOpen] = useState(defaultOpen)
  const [heartBurst, setHeartBurst] = useState(false)
  const openedOnce = useRef(defaultOpen)

  const isQuestionAuthor = Boolean(profile && profile.username === post.author.username)
  const answerCount = post.comments_count ?? 0
  const name = post.author.display_name || post.author.username
  const hasMedia = Boolean(post.image || post.video)
  const imageUrl = mediaUrl(post.image)
  const videoUrl = mediaUrl(post.video)

  useEffect(() => {
    if (defaultOpen && !openedOnce.current) {
      setAnswersOpen(true)
      openedOnce.current = true
    }
  }, [defaultOpen])

  const commentsQueryKey = ['community-answers', post.id, profile?.username] as const
  const { data: answers = [], isLoading: answersLoading } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => apiFetch<PostComment[]>(`/api/social/posts/${post.id}/comments/`),
    enabled: answersOpen,
    retry: false,
  })

  const likeMut = useMutation({
    mutationFn: () => apiFetch<{ liked: boolean }>(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onSuccess: () => {
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const saveMut = useMutation({
    mutationFn: () => apiFetch<{ saved: boolean }>(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onSuccess: () => {
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const helpfulMut = useMutation({
    mutationFn: (commentId: number) =>
      apiFetch<{ marked_helpful: boolean; helpful_count: number }>(
        `/api/social/comments/${commentId}/helpful/`,
        { method: 'POST' },
      ),
    onMutate: (commentId) => {
      qc.setQueryData<PostComment[]>(commentsQueryKey, (old) =>
        (old ?? []).map((comment) => {
          if (comment.id !== commentId) return comment
          const marked = !comment.marked_helpful_by_me
          const count = comment.helpful_count ?? 0
          return {
            ...comment,
            marked_helpful_by_me: marked,
            helpful_count: Math.max(0, count + (marked ? 1 : -1)),
          }
        }),
      )
    },
    onSuccess: (data, commentId) => {
      qc.setQueryData<PostComment[]>(commentsQueryKey, (old) =>
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

  const acceptMut = useMutation({
    mutationFn: (commentId: number) =>
      apiFetch(`/api/social/comments/${commentId}/accept/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentsQueryKey })
      void qc.invalidateQueries({ queryKey: ['post', post.id] })
      void invalidatePostEngagementCaches(qc, { queryKey, authorUsername: post.author.username })
    },
  })

  const triggerHeartBurst = () => {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 720)
  }

  const handleLike = () => {
    const liking = !post.liked_by_me
    likeMut.mutate()
    if (liking) triggerHeartBurst()
  }

  const handleCommented = () => {
    void qc.invalidateQueries({ queryKey: commentsQueryKey })
    void invalidatePostEngagementCaches(qc, { queryKey, authorUsername: post.author.username })
  }

  const statusLabel =
    post.accepted_answer
      ? 'Answered'
      : answerCount > 0
        ? `${answerCount} ${answerCount === 1 ? 'answer' : 'answers'}`
        : 'Needs answer'

  return (
    <article className={`cm-thread${highlighted ? ' cm-thread--highlight' : ''}`}>
      <div className="cm-thread__rail" aria-hidden />

      <div className="cm-thread__card">
        {heartBurst ? (
          <span className="cm-thread__heart-burst" aria-hidden>
            <Heart size={52} strokeWidth={1.75} fill="currentColor" />
          </span>
        ) : null}

        <header className="cm-thread__head">
          <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="cm-thread__author">
            <UserAvatar src={post.author.avatar} name={name} className="cm-thread__author-avatar" fill />
            <span className="cm-thread__author-meta">
              <strong>{name}</strong>
              <small>@{post.author.username}</small>
            </span>
          </Link>
        </header>

        {post.place_label ? <span className="cm-thread__place">{post.place_label}</span> : null}

        <p className="cm-thread__question">{renderTextWithHashtags(post.body)}</p>

        {hasMedia ? (
          <div className="cm-thread__media">
            <div className="cm-thread__thumb">
              {videoUrl ? (
                <video src={videoUrl} controls playsInline preload="metadata" aria-label="Question video" />
              ) : imageUrl ? (
                <img src={imageUrl} alt="" />
              ) : null}
            </div>
          </div>
        ) : null}

        <p className={`cm-thread__status${answerCount === 0 && !post.accepted_answer ? ' cm-thread__status--open' : ''}`}>
          {statusLabel}
        </p>

        <CommunityEngagementActions
          signedIn={signedIn}
          liked={post.liked_by_me}
          saved={post.saved_by_me}
          likeBusy={likeMut.isPending}
          saveBusy={saveMut.isPending}
          commentsOpen={answersOpen}
          answerLabel={answerCount > 0 ? 'Answers' : 'Answer'}
          onLike={handleLike}
          onSave={() => saveMut.mutate()}
          onToggleAnswers={() => setAnswersOpen((open) => !open)}
          reportTarget={{
            target_type: 'post',
            target_id: String(post.id),
            target_label: post.body?.slice(0, 60) || `Question by @${post.author.username}`,
          }}
        />

        {post.accepted_answer && !answersOpen ? (
          <div className="cm-thread__answer-body">
            <div className="cm-thread__answer-meta">
              <strong>Accepted answer</strong>
              <span className="cm-thread__answer-badge">Best</span>
            </div>
            <p className="cm-thread__answer-text">{post.accepted_answer.body}</p>
          </div>
        ) : null}
      </div>

      {answersOpen ? (
        <div className="cm-thread__answers">
          <div className="cm-thread__answers-head">
            <h3>{answerCount === 1 ? '1 answer' : `${Math.max(answerCount, answers.length)} answers`}</h3>
          </div>

          {answersLoading ? (
            <p className="cm-thread__empty">Loading answers…</p>
          ) : answers.length === 0 ? (
            <p className="cm-thread__empty">No answers yet — be the first to help.</p>
          ) : (
            <ul className="cm-thread__answers-list">
              {answers.map((answer) => (
                <li
                  key={answer.id}
                  className={`cm-thread__answer${answer.is_accepted_answer ? ' cm-thread__answer--accepted' : ''}`}
                >
                  <div className="cm-thread__answer-rail" aria-hidden />
                  <div className="cm-thread__answer-body">
                    <div className="cm-thread__answer-meta">
                      <strong>{commentAuthorName(answer)}</strong>
                      {answer.is_accepted_answer ? (
                        <span className="cm-thread__answer-badge">Accepted</span>
                      ) : null}
                      {answer.created_at
                        ? new Date(answer.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : null}
                    </div>
                    <p className="cm-thread__answer-text">{answer.body}</p>
                    <div className="cm-thread__answer-actions">
                      {signedIn ? (
                        <button
                          type="button"
                          className={`cm-thread__answer-btn${answer.marked_helpful_by_me ? ' cm-thread__answer-btn--active' : ''}`}
                          onClick={() => helpfulMut.mutate(answer.id)}
                          disabled={helpfulMut.isPending}
                          aria-pressed={answer.marked_helpful_by_me}
                        >
                          <ThumbsUp
                            size={13}
                            strokeWidth={2.25}
                            fill={answer.marked_helpful_by_me ? 'currentColor' : 'none'}
                            aria-hidden
                          />
                          {(answer.helpful_count ?? 0) > 0 ? answer.helpful_count : 'Helpful'}
                        </button>
                      ) : null}
                      {isQuestionAuthor ? (
                        <button
                          type="button"
                          className={`cm-thread__answer-btn${answer.is_accepted_answer ? ' cm-thread__answer-btn--active' : ''}`}
                          onClick={() => acceptMut.mutate(answer.id)}
                          disabled={acceptMut.isPending}
                        >
                          <CheckCircle2 size={13} strokeWidth={2.25} aria-hidden />
                          {answer.is_accepted_answer ? 'Accepted' : 'Accept'}
                        </button>
                      ) : null}
                      <ReportButton
                        className="cm-thread__answer-btn"
                        iconOnly
                        iconSize={13}
                        triggerLabel="Report answer"
                        target={{
                          target_type: 'comment',
                          target_id: String(answer.id),
                          target_label: answer.body.slice(0, 60),
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="cm-thread__composer">
            {signedIn ? (
              <DelversCommentComposer
                postId={post.id}
                onCommented={handleCommented}
                placeholder="Write an answer…"
                variant="compact"
              />
            ) : (
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in to answer
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </article>
  )
}

export function CommunityTipCard({ post, queryKey, highlighted = false }: {
  post: FeedPost
  queryKey: unknown[]
  highlighted?: boolean
}) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const signedIn = Boolean(profile)
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)

  const name = post.author.display_name || post.author.username
  const hasMedia = Boolean(post.image || post.video)
  const imageUrl = mediaUrl(post.image)
  const videoUrl = mediaUrl(post.video)
  const replyCount = post.comments_count ?? 0

  const commentsQueryKey = ['community-tip-replies', post.id, profile?.username] as const
  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: commentsQueryKey,
    queryFn: () => apiFetch<PostComment[]>(`/api/social/posts/${post.id}/comments/`),
    enabled: repliesOpen,
    retry: false,
  })

  const likeMut = useMutation({
    mutationFn: () => apiFetch<{ liked: boolean }>(`/api/social/posts/${post.id}/like/`, { method: 'POST' }),
    onSuccess: () => {
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const saveMut = useMutation({
    mutationFn: () => apiFetch<{ saved: boolean }>(`/api/social/posts/${post.id}/save/`, { method: 'POST' }),
    onSuccess: () => {
      void invalidatePostEngagementCaches(qc, {
        queryKey,
        authorUsername: post.author.username,
        savedByUsername: profile?.username,
      })
    },
  })

  const helpfulMut = useMutation({
    mutationFn: (commentId: number) =>
      apiFetch<{ marked_helpful: boolean; helpful_count: number }>(
        `/api/social/comments/${commentId}/helpful/`,
        { method: 'POST' },
      ),
    onMutate: (commentId) => {
      qc.setQueryData<PostComment[]>(commentsQueryKey, (old) =>
        (old ?? []).map((comment) => {
          if (comment.id !== commentId) return comment
          const marked = !comment.marked_helpful_by_me
          const count = comment.helpful_count ?? 0
          return {
            ...comment,
            marked_helpful_by_me: marked,
            helpful_count: Math.max(0, count + (marked ? 1 : -1)),
          }
        }),
      )
    },
    onSuccess: (data, commentId) => {
      qc.setQueryData<PostComment[]>(commentsQueryKey, (old) =>
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

  const triggerHeartBurst = () => {
    setHeartBurst(true)
    window.setTimeout(() => setHeartBurst(false), 720)
  }

  const handleLike = () => {
    const liking = !post.liked_by_me
    likeMut.mutate()
    if (liking) triggerHeartBurst()
  }

  const handleReplied = () => {
    void qc.invalidateQueries({ queryKey: commentsQueryKey })
    void invalidatePostEngagementCaches(qc, { queryKey, authorUsername: post.author.username })
  }

  return (
    <article className={`cm-thread cm-thread--tip${highlighted ? ' cm-thread--highlight' : ''}`}>
      <div className="cm-thread__rail" aria-hidden />

      <div className="cm-thread__card">
        {heartBurst ? (
          <span className="cm-thread__heart-burst" aria-hidden>
            <Heart size={52} strokeWidth={1.75} fill="currentColor" />
          </span>
        ) : null}

        <header className="cm-thread__head">
          <Link to={`/u/${encodeURIComponent(post.author.username)}`} className="cm-thread__author">
            <UserAvatar src={post.author.avatar} name={name} className="cm-thread__author-avatar" fill />
            <span className="cm-thread__author-meta">
              <strong>{name}</strong>
              <small>@{post.author.username}</small>
            </span>
          </Link>
          <span className="cm-thread__kind">Tip</span>
        </header>

        {post.place_label ? <span className="cm-thread__place cm-thread__place--tip">{post.place_label}</span> : null}

        {post.body?.trim() ? (
          <p className="cm-thread__question cm-thread__message">{renderTextWithHashtags(post.body)}</p>
        ) : null}

        {hasMedia ? (
          <div className="cm-thread__media">
            <div className="cm-thread__thumb">
              {videoUrl ? (
                <video src={videoUrl} controls playsInline preload="metadata" aria-label="Tip video" />
              ) : imageUrl ? (
                <img src={imageUrl} alt="" />
              ) : null}
            </div>
          </div>
        ) : null}

        {replyCount > 0 ? (
          <p className="cm-thread__status">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</p>
        ) : null}

        <CommunityEngagementActions
          signedIn={signedIn}
          liked={post.liked_by_me}
          saved={post.saved_by_me}
          likeBusy={likeMut.isPending}
          saveBusy={saveMut.isPending}
          commentsOpen={repliesOpen}
          answerLabel={replyCount > 0 ? 'Replies' : 'Reply'}
          onLike={handleLike}
          onSave={() => saveMut.mutate()}
          onToggleAnswers={() => setRepliesOpen((open) => !open)}
          reportTarget={{
            target_type: 'post',
            target_id: String(post.id),
            target_label: post.body?.slice(0, 60) || `Tip by @${post.author.username}`,
          }}
        />
      </div>

      {repliesOpen ? (
        <div className="cm-thread__answers">
          <div className="cm-thread__answers-head">
            <h3>{replyCount === 1 ? '1 reply' : `${Math.max(replyCount, replies.length)} replies`}</h3>
          </div>

          {repliesLoading ? (
            <p className="cm-thread__empty">Loading replies…</p>
          ) : replies.length === 0 ? (
            <p className="cm-thread__empty">No replies yet.</p>
          ) : (
            <ul className="cm-thread__answers-list">
              {replies.map((reply) => (
                <li key={reply.id} className="cm-thread__answer">
                  <div className="cm-thread__answer-rail" aria-hidden />
                  <div className="cm-thread__answer-body">
                    <div className="cm-thread__answer-meta">
                      <strong>{commentAuthorName(reply)}</strong>
                      {reply.created_at
                        ? new Date(reply.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : null}
                    </div>
                    <p className="cm-thread__answer-text">{reply.body}</p>
                    <div className="cm-thread__answer-actions">
                      {signedIn ? (
                        <button
                          type="button"
                          className={`cm-thread__answer-btn${reply.marked_helpful_by_me ? ' cm-thread__answer-btn--active' : ''}`}
                          onClick={() => helpfulMut.mutate(reply.id)}
                          disabled={helpfulMut.isPending}
                          aria-pressed={reply.marked_helpful_by_me}
                        >
                          <ThumbsUp
                            size={13}
                            strokeWidth={2.25}
                            fill={reply.marked_helpful_by_me ? 'currentColor' : 'none'}
                            aria-hidden
                          />
                          {(reply.helpful_count ?? 0) > 0 ? reply.helpful_count : 'Helpful'}
                        </button>
                      ) : null}
                      <ReportButton
                        className="cm-thread__answer-btn"
                        iconOnly
                        iconSize={13}
                        triggerLabel="Report reply"
                        target={{
                          target_type: 'comment',
                          target_id: String(reply.id),
                          target_label: reply.body.slice(0, 60),
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="cm-thread__composer">
            {signedIn ? (
              <DelversCommentComposer
                postId={post.id}
                onCommented={handleReplied}
                placeholder="Add a reply…"
                variant="compact"
              />
            ) : (
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in to reply
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </article>
  )
}
