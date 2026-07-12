import { useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { apiFetch, asArray } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { JourneySection } from './JourneySection'
import './journey-detail.css'

type ApiAnswer = {
  id: number
  author: string
  body: string
  ago: string
  is_official?: boolean
}

type ApiComment = {
  id: number
  author: string
  body: string
  ago: string
  answers?: ApiAnswer[]
}

type Props = {
  journeyId: string
  sectionRef?: RefObject<HTMLElement | null>
  composerRef?: RefObject<HTMLInputElement | null>
  className?: string
}

export function JourneyCommentsSection({
  journeyId,
  sectionRef,
  composerRef,
  className = '',
}: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const fallbackComposerRef = useRef<HTMLInputElement>(null)
  const inputRef = composerRef ?? fallbackComposerRef
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [composerDraft, setComposerDraft] = useState('')

  const questionsPath = `/api/journeys/${journeyId}/questions/`

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['journey-questions', journeyId],
    queryFn: async () =>
      asArray<ApiComment>(await apiFetch<ApiComment[]>(questionsPath, { auth: false })),
  })

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['journey-questions', journeyId] })
    void qc.invalidateQueries({ queryKey: ['journey', journeyId] })
    void qc.invalidateQueries({ queryKey: ['journeys'] })
    void qc.invalidateQueries({ queryKey: ['me-journey-questions'] })
  }

  const commentMut = useMutation({
    mutationFn: (body: string) =>
      apiFetch(questionsPath, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setComposerDraft('')
      invalidateAll()
    },
  })

  const replyMut = useMutation({
    mutationFn: ({ commentId, body }: { commentId: number; body: string }) =>
      apiFetch(`/api/journeys/questions/${commentId}/answers/`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => invalidateAll(),
  })

  function postComment() {
    const text = composerDraft.trim()
    if (!text || commentMut.isPending) return
    commentMut.mutate(text)
  }

  function postReply(commentId: number) {
    const key = String(commentId)
    const text = (drafts[key] ?? '').trim()
    if (!text || replyMut.isPending) return
    replyMut.mutate({ commentId, body: text })
    setDrafts((prev) => ({ ...prev, [key]: '' }))
  }

  return (
    <JourneySection
      title={`Comments${comments.length > 0 ? ` · ${comments.length}` : ''}`}
      className={`jd-comments ${className}`.trim()}
    >
      <section id="journey-comments" ref={sectionRef} className="jd-comments__anchor" aria-label="Journey comments">
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
              placeholder="Ask about the route, costs, or share a tip…"
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
            <Link to="/login">Sign in</Link> to comment on this journey.
          </p>
        )}

        {isLoading ? <p className="jd-comments__loading">Loading comments…</p> : null}

        {!isLoading && comments.length === 0 ? (
          <div className="jd-comments__empty">
            <MessageCircle size={22} strokeWidth={2} aria-hidden />
            <p>No comments yet. Be the first to ask about this route or share a travel tip.</p>
          </div>
        ) : null}

        {comments.length > 0 ? (
          <ul className="jd-comments__list">
            {comments.map((comment) => {
              const replyKey = String(comment.id)
              const replies = comment.answers ?? []
              return (
                <li key={comment.id} className="jd-comments__item">
                  <span className="jd-comments__avatar" aria-hidden>
                    {comment.author.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="jd-comments__body-wrap">
                    <p className="jd-comments__meta">
                      <strong>{comment.author}</strong>
                      <span>{comment.ago}</span>
                    </p>
                    <p className="jd-comments__text">{comment.body}</p>

                    {replies.length > 0 ? (
                      <ul className="jd-comments__replies">
                        {replies.map((reply) => (
                          <li key={reply.id} className="jd-comments__reply">
                            <p className="jd-comments__meta">
                              <strong>{reply.author}</strong>
                              {reply.is_official ? (
                                <span className="jd-comments__badge">Creator</span>
                              ) : null}
                              <span>{reply.ago}</span>
                            </p>
                            <p className="jd-comments__text">{reply.body}</p>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {profile ? (
                      <div className="jd-comments__reply-bar">
                        <input
                          className="jd-comments__input jd-comments__input--reply"
                          type="text"
                          placeholder="Write a reply…"
                          value={drafts[replyKey] ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [replyKey]: e.target.value }))
                          }
                          disabled={replyMut.isPending}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              postReply(comment.id)
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="jd-comments__post jd-comments__post--reply"
                          disabled={!(drafts[replyKey] ?? '').trim() || replyMut.isPending}
                          onClick={() => postReply(comment.id)}
                        >
                          Reply
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>
    </JourneySection>
  )
}
