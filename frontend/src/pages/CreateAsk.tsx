import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CreateStudioHeader } from '../components/create'
import { CommunityMediaAttach } from '../components/community/CommunityMediaAttach'
import type { FeedPost } from '../components/IgPostCard'
import { buildAskLocalsFormData } from '../utils/communityAsk'
import { startCreateSession, trackCreatePublish } from '../utils/createAnalytics'
import { invalidateSocialCaches } from '../utils/socialCache'
import './CreateAsk.css'

const TIPS = ['Parking', 'Safety', 'Prices', 'Transport', 'Food', 'Best time to visit']

function tipHashtag(tip: string): string {
  return `#${tip.toLowerCase().replace(/\s+/g, '')}`
}

export function CreateAsk() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const [place, setPlace] = useState('')
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const startedAt = useRef(startCreateSession())

  useEffect(() => {
    const prefill = searchParams.get('place')?.trim()
    if (prefill) setPlace(prefill)
  }, [searchParams])

  const isDirty = place.trim().length > 0 || question.trim().length > 0 || Boolean(imageFile || videoFile)
  const canPost = place.trim().length > 0 && question.trim().length > 0

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
  }, [imagePreview, videoPreview])

  const requestLeave = (to: string) => {
    if (isDirty && !window.confirm('Discard this question?')) return
    navigate(to)
  }

  const publish = useMutation({
    mutationFn: () =>
      apiFetch<FeedPost>('/api/social/posts/', {
        method: 'POST',
        body: buildAskLocalsFormData(
          place,
          question,
          profile?.region,
          videoFile
            ? { file: videoFile, kind: 'video' }
            : imageFile
              ? { file: imageFile, kind: 'image' }
              : null,
        ),
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
      navigate(`/community?posted=${post.id}`)
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
            placeholder="What do you need to know? Use #hashtags like #parking or #food."
          />
        </label>

        <CommunityMediaAttach
          imagePreview={imagePreview}
          videoPreview={videoPreview}
          onImageChange={(file, preview) => {
            if (imagePreview && imagePreview !== preview) URL.revokeObjectURL(imagePreview)
            setImageFile(file)
            setImagePreview(preview)
            if (file) {
              setVideoFile(null)
              if (videoPreview) URL.revokeObjectURL(videoPreview)
              setVideoPreview(null)
            }
          }}
          onVideoChange={(file, preview) => {
            if (videoPreview && videoPreview !== preview) URL.revokeObjectURL(videoPreview)
            setVideoFile(file)
            setVideoPreview(preview)
            if (file) {
              setImageFile(null)
              if (imagePreview) URL.revokeObjectURL(imagePreview)
              setImagePreview(null)
            }
          }}
        />

        <div className="create-ask__tips" aria-label="Suggested hashtags">
          {TIPS.map((tip) => {
            const hashtag = tipHashtag(tip)
            return (
            <button
              key={tip}
              type="button"
              className="create-ask__tip"
              onClick={() => {
                if (question.includes(hashtag)) return
                if (!question.trim()) {
                  setQuestion(`Any tips on ${tip.toLowerCase()}? ${hashtag}`)
                  return
                }
                setQuestion((q) => `${q.trim()} ${hashtag}`)
              }}
            >
              {hashtag}
            </button>
            )
          })}
        </div>

        {error ? <p className="create-ask__error">{error}</p> : null}
        <p className="create-ask__note">Your question goes straight to the community feed.</p>
      </div>
    </main>
  )
}
