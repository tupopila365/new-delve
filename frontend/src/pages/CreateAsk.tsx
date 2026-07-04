import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CreateStudioHeader } from '../components/create'
import type { FeedPost } from '../components/IgPostCard'
import { buildAskLocalsPost } from '../utils/communityAsk'
import { startCreateSession, trackCreatePublish } from '../utils/createAnalytics'
import { communityPostPermalinkPath } from '../utils/postPermalink'
import { invalidateSocialCaches } from '../utils/socialCache'
import './CreateAsk.css'

const TIPS = ['Parking', 'Safety', 'Prices', 'Transport', 'Food', 'Best time to visit']

export function CreateAsk() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const [place, setPlace] = useState('')
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const startedAt = useRef(startCreateSession())

  useEffect(() => {
    const prefill = searchParams.get('place')?.trim()
    if (prefill) setPlace(prefill)
  }, [searchParams])

  const isDirty = place.trim().length > 0 || question.trim().length > 0
  const canPost = place.trim().length > 0 && question.trim().length > 0

  const requestLeave = (to: string) => {
    if (isDirty && !window.confirm('Discard this question?')) return
    navigate(to)
  }

  const publish = useMutation({
    mutationFn: () =>
      apiFetch<FeedPost>('/api/social/posts/', {
        method: 'POST',
        body: JSON.stringify(buildAskLocalsPost(place, question, profile?.region)),
      }),
    onSuccess: async (post) => {
      trackCreatePublish({
        format: 'ask',
        has_place: Boolean(place.trim()),
        startedAt: startedAt.current,
      })
      await invalidateSocialCaches(qc, { username: profile?.username })
      void qc.invalidateQueries({ queryKey: ['home-community-questions'] })
      void qc.invalidateQueries({ queryKey: ['feed'] })
      navigate(communityPostPermalinkPath(post.id))
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not post.'),
  })

  if (!profile) {
    return (
      <main className="create-ask create-ask--gate">
        <section className="create-ask-gate">
          <h1>Ask locals</h1>
          <p>Sign in to ask about a place and get answers from travellers and locals.</p>
          <div className="create-ask-gate__actions">
            <Link to="/login" className="btn btn-primary">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-ghost">
              Create account
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="create-ask">
      <CreateStudioHeader
        variant="light"
        title="Ask locals"
        subtitle="Community"
        onBack={() => requestLeave('/create')}
        actionLabel="Post"
        actionDisabled={!canPost}
        actionPending={publish.isPending}
        actionPendingLabel="Posting…"
        onAction={() => {
          setError('')
          publish.mutate()
        }}
      />

      <div className="create-ask__body">
        <p className="create-ask__intro">
          Ask anything about a place. Locals and travellers answer in plain language.
        </p>

        <label className="create-ask__field">
          <span>Where?</span>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="City and country, e.g. Windhoek, Namibia"
            autoFocus
          />
        </label>

        <label className="create-ask__field">
          <span>Your question</span>
          <textarea
            rows={5}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What do you need to know?"
          />
        </label>

        <div className="create-ask__tips" aria-label="Question ideas">
          {TIPS.map((tip) => (
            <button
              key={tip}
              type="button"
              className="create-ask__tip"
              onClick={() => {
                if (!question.trim()) setQuestion(`Any tips on ${tip.toLowerCase()}?`)
                else if (!question.toLowerCase().includes(tip.toLowerCase())) {
                  setQuestion((q) => `${q.trim()} (${tip.toLowerCase()})`)
                }
              }}
            >
              {tip}
            </button>
          ))}
        </div>

        {error ? <p className="create-ask__error">{error}</p> : null}
        <p className="create-ask__note">Your question appears on Ask locals for others to answer.</p>
      </div>
    </main>
  )
}
