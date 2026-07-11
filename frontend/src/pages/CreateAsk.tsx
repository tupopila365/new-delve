import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { ApiError, apiFetch, asArray } from '../api/client'
import { fetchTagTrending, type TagSummary } from '../api/tags'
import { useAuth } from '../auth/AuthContext'
import { FormField, FormTextarea, TextInput } from '../components/create'
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

  const requestLeave = () => {
    if (isDirty && !window.confirm('Discard this question?')) return
    navigate('/create')
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
      <div className="create-ask-page">
        <div className="create-ask-header">
          <button type="button" className="create-ask__back" onClick={requestLeave} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2.25} />
          </button>
          <h1 className="create-ask__title">Ask locals</h1>
        </div>
        <div className="create-ask-empty">
          <p>Sign in to ask locals for tips, recommendations, and insider knowledge.</p>
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="create-ask-page">
      <div className="create-ask-header">
        <button type="button" className="create-ask__back" onClick={requestLeave} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="create-ask__title">Ask locals</h1>
        <button
          type="button"
          className="create-ask__post-btn"
          onClick={() => {
            if (!canPost || publish.isPending) return
            setError('')
            publish.mutate()
          }}
          disabled={!canPost || publish.isPending}
        >
          {publish.isPending ? 'Posting…' : 'Post'}
        </button>
      </div>

      <div className="create-ask-form">
        <FormField label="Where?">
          <TextInput
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="City and country, e.g. Windhoek, Namibia"
          />
        </FormField>

        <FormTextarea
          label="Your question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do you need to know? Use #hashtags like #parking or #food."
          rows={4}
        />

        <MessageComposer
          theme="dark"
          value={question}
          onChange={setQuestion}
          onSubmit={() => {
            if (!canPost || publish.isPending) return
            setError('')
            publish.mutate()
          }}
          placeholder="Add details, tips requests, or recommendations…"
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

        {trendingTags.length > 0 && (
          <div className="create-ask-trending">
            <p className="create-ask-trending__label">Trending</p>
            <div className="create-ask-trending__list">
              {trendingTags.map((tag) => {
                const hashtag = `#${tag.slug}`
                const active = extractHashtags(question).includes(tag.slug)
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    className={`create-ask-trending__chip ${active ? 'create-ask-trending__chip--active' : ''}`}
                    onClick={() => {
                      if (active) {
                        setQuestion((q) => q.replace(new RegExp(`#${tag.slug}\\b`, 'g'), '').trim())
                        return
                      }
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
          </div>
        )}

        {tooManyTags ? (
          <p className="create-ask__error" role="alert">
            Use up to {MAX_TAGS_PER_POST} hashtags per post.
          </p>
        ) : null}

        {error ? <p className="create-ask__error">{error}</p> : null}
        <p className="create-ask__note">Your question goes straight to the community feed.</p>
      </div>
    </div>
  )
}