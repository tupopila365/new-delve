import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch, asArray } from '../../api/client'
import { fetchTagTrending, type TagSummary } from '../../api/tags'
import { useAuth } from '../../auth/AuthContext'
import type { FeedPost } from '../IgPostCard'
import { ComposerPillInput } from '../ui/ComposerPillInput'
import { MessageComposer } from '../ui/MessageComposer'
import { buildCommunityTipFormData } from '../../utils/communityTip'
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

export function CommunityTipModal({ open, onClose, onPosted }: Props) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [place, setPlace] = useState('')
  const [message, setMessage] = useState('')
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

  const tagCount = useMemo(() => extractHashtags(message).length, [message])
  const tooManyTags = tagCount > MAX_TAGS_PER_POST
  const isDirty = place.trim().length > 0 || message.trim().length > 0 || Boolean(imageFile || videoFile)
  const canPost = (message.trim().length > 0 || Boolean(imageFile || videoFile)) && !tooManyTags

  const reset = () => {
    setPlace('')
    setMessage('')
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
    if (isDirty && !window.confirm('Discard this tip?')) return
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
      title="Create tip"
      titleId="cm-tip-modal-title"
      onClose={requestClose}
    >
      <label className="cm-compose-modal__composer-block">
        <span>About a place (optional)</span>
        <ComposerPillInput
          theme="dark"
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="e.g. Windhoek, Sossusvlei"
        />
      </label>

      <div className="cm-compose-modal__composer-block">
        <span>Your tip</span>
        <MessageComposer
          theme="dark"
          value={message}
          onChange={setMessage}
          onSubmit={submit}
          placeholder="What should travellers know? Use #hashtags to help people find it."
          inputAriaLabel="Your tip"
          sendAriaLabel="Share tip"
          sendDisabled={!canPost}
          sending={publish.isPending}
          autoFocus
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
        text={message}
        onChange={setMessage}
        onError={setError}
        variant="tip"
      />

      {tooManyTags ? (
        <p className="cm-compose-modal__error" role="alert">
          Use up to {MAX_TAGS_PER_POST} hashtags per post.
        </p>
      ) : null}

      {error ? <p className="cm-compose-modal__error">{error}</p> : null}
      <p className="cm-compose-modal__note">Your tip appears on the community feed right away.</p>
    </CommunityComposeModalShell>
  )
}
