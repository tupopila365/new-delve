import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch, asArray } from '../api/client'
import { fetchTagTrending, type TagSummary } from '../api/tags'
import { useAuth } from '../auth/AuthContext'
import { CreateStudioHeader } from '../components/create'
import { ComposerPillInput } from '../components/ui/ComposerPillInput'
import { MessageComposer } from '../components/ui/MessageComposer'
import type { FeedPost } from '../components/IgPostCard'
import { buildAskLocalsFormData } from '../utils/communityAsk'
import { validateCommunityImageFile, validateCommunityVideoFile } from '../utils/communityMediaUpload'
import { startCreateSession, trackCreatePublish } from '../utils/createAnalytics'
import { extractHashtags, MAX_TAGS_PER_POST } from '../utils/hashtags'
import { invalidateSocialCaches } from '../utils/socialCache'
import './CreateAsk.css'

const TRENDING_TAG_LIMIT = 8

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

  const trendingQuery = useQuery({
    queryKey: ['tags-trending', 'community'],
    queryFn: () => fetchTagTrending('community', TRENDING_TAG_LIMIT),
  })
  const trendingTags = useMemo(() => asArray<TagSummary>(trendingQuery.data), [trendingQuery.data])

  const tagCount = useMemo(() => extractHashtags(question).length, [question])
  const tooManyTags = tagCount > MAX_TAGS_PER_POST

  const isDirty = place.trim().length > 0 || question.trim().length > 0 || Boolean(imageFile || videoFile)
  const canPost = place.trim().length > 0 && question.trim().length > 0 && !tooManyTags

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
      navigate(`/community/posts/${post.id}`)
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
      />

      <div className="create-ask__body">
        <label className="create-ask__field create-ask__composer-block">
          <span>Where?</span>
          <ComposerPillInput
            theme="dark"
            type="text"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="City and country, e.g. Windhoek, Namibia"
            autoFocus
          />
        </label>

        <div className="create-ask__field create-ask__composer-block">
          <span>Your question</span>
          <MessageComposer
            theme="dark"
            value={question}
            onChange={setQuestion}
            onSubmit={() => {
              if (!canPost || publish.isPending) return
              setError('')
              publish.mutate()
            }}
            placeholder="What do you need to know? Use #hashtags like #parking or #food."
            inputAriaLabel="Your question"
            sendAriaLabel="Post question"
            sendDisabled={!canPost}
            sending={publish.isPending}
            hashtags={{
              scope: 'community',
              maxTags: MAX_TAGS_PER_POST,
              onMaxTags: () => setError(`Use up to ${MAX_TAGS_PER_POST} hashtags per post.`),
            }}
            media={{
              imagePreview,
              videoPreview,
              onVideoError: (message) => setError(message),
              onImageChange: (file, preview) => {
                if (file) {
                  const message = validateCommunityImageFile(file)
                  if (message) {
                    setError(message)
                    return
                  }
                }
                setError('')
                if (imagePreview && imagePreview !== preview) URL.revokeObjectURL(imagePreview)
                setImageFile(file)
                setImagePreview(preview)
                if (file) {
                  setVideoFile(null)
                  if (videoPreview) URL.revokeObjectURL(videoPreview)
                  setVideoPreview(null)
                }
              },
              onVideoChange: (file, preview) => {
                if (file) {
                  const message = validateCommunityVideoFile(file)
                  if (message) {
                    setError(message)
                    return
                  }
                }
                setError('')
                if (videoPreview && videoPreview !== preview) URL.revokeObjectURL(videoPreview)
                setVideoFile(file)
                setVideoPreview(preview)
                if (file) {
                  setImageFile(null)
                  if (imagePreview) URL.revokeObjectURL(imagePreview)
                  setImagePreview(null)
                }
              },
            }}
          />
        </div>

        <div className="create-ask__tips" aria-label="Trending hashtags">
          {trendingTags.map((tag) => {
            const hashtag = `#${tag.slug}`
            return (
              <button
                key={tag.slug}
                type="button"
                className="create-ask__tip"
                onClick={() => {
                  if (extractHashtags(question).includes(tag.slug)) return
                  if (extractHashtags(question).length >= MAX_TAGS_PER_POST) {
                    setError(`Use up to ${MAX_TAGS_PER_POST} hashtags per post.`)
                    return
                  }
                  setError('')
                  if (!question.trim()) {
                    setQuestion(`Any tips on ${tag.slug}? ${hashtag}`)
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

        {tooManyTags ? (
          <p className="create-ask__error" role="alert">
            Use up to {MAX_TAGS_PER_POST} hashtags per post.
          </p>
        ) : null}

        {error ? <p className="create-ask__error">{error}</p> : null}
        <p className="create-ask__note">Your question goes straight to the community feed.</p>
      </div>
    </main>
  )
}
