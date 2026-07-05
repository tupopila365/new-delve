import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CreateStudioHeader } from '../components/create'
import { CommunityMediaAttach } from '../components/community/CommunityMediaAttach'
import type { FeedPost } from '../components/IgPostCard'
import { startCreateSession, trackCreatePublish } from '../utils/createAnalytics'
import { buildCommunityTipFormData } from '../utils/communityTip'
import { invalidateSocialCaches } from '../utils/socialCache'
import './CreateAsk.css'

const TAGS = ['Food', 'Transport', 'Safety', 'Parking', 'Routes', 'Hidden gems']

function tagHashtag(tag: string): string {
  return `#${tag.toLowerCase().replace(/\s+/g, '')}`
}

export function CreateTip() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const [place, setPlace] = useState('')
  const [message, setMessage] = useState('')
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

  const isDirty = place.trim().length > 0 || message.trim().length > 0 || Boolean(imageFile || videoFile)
  const canPost = message.trim().length > 0 || Boolean(imageFile || videoFile)

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
  }, [imagePreview, videoPreview])

  const requestLeave = (to: string) => {
    if (isDirty && !window.confirm('Discard this tip?')) return
    navigate(to)
  }

  const publish = useMutation({
    mutationFn: () =>
      apiFetch<FeedPost>('/api/social/posts/', {
        method: 'POST',
        body: buildCommunityTipFormData(
          message,
          profile?.region,
          place,
          videoFile
            ? { file: videoFile, kind: 'video' }
            : imageFile
              ? { file: imageFile, kind: 'image' }
              : null,
        ),
      }),
    onSuccess: async (post) => {
      trackCreatePublish({
        format: 'tip',
        has_place: Boolean(place.trim()),
        startedAt: startedAt.current,
      })
      await invalidateSocialCaches(qc, { username: profile?.username })
      void qc.invalidateQueries({ queryKey: ['feed'] })
      navigate(`/community?postedTip=${post.id}`)
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not post.'),
  })

  if (!profile) {
    return (
      <main className="create-ask create-ask--gate">
        <section className="create-ask-gate">
          <h1>Share a tip</h1>
          <p>Sign in to share travel advice with the community.</p>
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
        title="Share a tip"
        subtitle="Community"
        onBack={() => requestLeave('/community')}
        actionLabel="Share"
        actionDisabled={!canPost}
        actionPending={publish.isPending}
        actionPendingLabel="Sharing…"
        onAction={() => {
          setError('')
          publish.mutate()
        }}
      />

      <div className="create-ask__body">
        <p className="create-ask__intro">
          Share advice like a message — text, photo, or short video. Keep it helpful and local.
        </p>

        <label className="create-ask__field">
          <span>About a place (optional)</span>
          <input
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="e.g. Windhoek, Sossusvlei"
          />
        </label>

        <label className="create-ask__field">
          <span>Your tip</span>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What should travellers know? Use #hashtags to help people find it."
            autoFocus
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
          {TAGS.map((tag) => {
            const hashtag = tagHashtag(tag)
            return (
              <button
                key={tag}
                type="button"
                className="create-ask__tip"
                onClick={() => {
                  if (message.includes(hashtag)) return
                  setMessage((value) => (value.trim() ? `${value.trim()} ${hashtag}` : `${hashtag} `))
                }}
              >
                {hashtag}
              </button>
            )
          })}
        </div>

        {error ? <p className="create-ask__error">{error}</p> : null}
        <p className="create-ask__note">Your tip appears on the community feed right away.</p>
      </div>
    </main>
  )
}
