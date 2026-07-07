import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch, asArray } from '../../api/client'
import { fetchTagTrending, type TagSummary } from '../../api/tags'
import { useAuth } from '../../auth/AuthContext'
import type { FeedPost } from '../IgPostCard'
import { ComposerPillInput } from '../ui/ComposerPillInput'
import { MessageComposer } from '../ui/MessageComposer'
import { buildAskLocalsFormData } from '../../utils/communityAsk'
import { startCreateSession, trackCreatePublish } from '../../utils/createAnalytics'
import { extractHashtags, MAX_TAGS_PER_POST } from '../../utils/hashtags'
import { invalidateSocialCaches } from '../../utils/socialCache'
import { CommunityComposeModalShell } from './CommunityComposeModalShell'
import { CommunityComposeTrendingTags } from './CommunityComposeTrendingTags'

const TRENDING_TAG_LIMIT = 8

type Props = {
  open: boolean
  onClose: () => void
  onPosted: (post: FeedPost) => void
}

export function CommunityAskModal({ open, onClose, onPosted }: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [place, setPlace] = useState('')
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const startedAt = useRef(startCreateSession())

  const trendingQuery = useQuery({
    queryKey: ['tags-trending', 'community'],
    queryFn: () => fetchTagTrending('community', TRENDING_TAG_LIMIT),
    enabled: open,
  })
  const trendingTags = useMemo(() => asArray<TagSummary>(trendingQuery.data), [trendingQuery.data])

  const tagCount = useMemo(() => extractHashtags(question).length, [question])
  const tooManyTags = tagCount > MAX_TAGS_PER_POST
  const isDirty = place.trim().length > 0 || question.trim().length > 0 || Boolean(imageFile || videoFile)
  const canPost = place.trim().length > 0 && question.trim().length > 0 && !tooManyTags

  const reset = () => {
    setPlace('')
    setQuestion('')
    setError('')
    setImageFile(null)
    setVideoFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
    setImagePreview(null)
    setVideoPreview(null)
    startedAt.current = startCreateSession()
  }

  const requestClose = () => {
    if (isDirty && !window.confirm('Discard this question?')) return
    reset()
    onClose()
  }

  useEffect(() => {
    if (!open) return
    startedAt.current = startCreateSession()
  }, [open])

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    if (videoPreview) URL.revokeObjectURL(videoPreview)
  }, [imagePreview, videoPreview])

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
      reset()
      onPosted(post)
      onClose()
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not post.'),
  })

  const submit = () => {
    if (!canPost || publish.isPending) return
    setError('')
    publish.mutate()
  }

  return (
    <CommunityComposeModalShell
      open={open}
      title="Ask a question"
      titleId="cm-ask-modal-title"
      onClose={requestClose}
    >
      <label className="cm-compose-modal__composer-block">
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

      <div className="cm-compose-modal__composer-block">
        <span>Your question</span>
        <MessageComposer
          theme="dark"
          value={question}
          onChange={setQuestion}
          onSubmit={submit}
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
            onImageChange: (file, preview) => {
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

      <CommunityComposeTrendingTags
        tags={trendingTags}
        text={question}
        onChange={setQuestion}
        onError={setError}
        variant="ask"
      />

      {tooManyTags ? (
        <p className="cm-compose-modal__error" role="alert">
          Use up to {MAX_TAGS_PER_POST} hashtags per post.
        </p>
      ) : null}

      {error ? <p className="cm-compose-modal__error">{error}</p> : null}
      <p className="cm-compose-modal__note">Your question goes straight to the community feed.</p>
    </CommunityComposeModalShell>
  )
}
