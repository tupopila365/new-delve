import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../../api/client'
import type { FeedPost } from '../IgPostCard'
import { useAuth } from '../../auth/AuthContext'
import { startCreateSession, trackCreatePublish } from '../../utils/createAnalytics'
import { CreateStudioHeader } from './CreateStudioHeader'
import { MediaPicker } from './MediaPicker'
import {
  MediaPreview,
  captionPositionFromPointer,
  nudgeCaptionPosition,
} from './MediaPreview'
import { FilterStrip } from './FilterStrip'
import { CropControls } from './CropControls'
import { CaptionEditor } from './CaptionEditor'
import { PostVideoTrimPanel } from './PostVideoTrimPanel'
import { CreateToolDock, type CreateTool } from './CreateToolDock'
import { CreateToolSheet } from './CreateToolSheet'
import { PlaceSearchSheet } from './PlaceSearchSheet'
import {
  DEFAULT_CROP,
  DEFAULT_PLACE_LINK,
  type CreateStudioMode,
  type MediaFilter,
  type MediaKind,
  type PlaceLink,
  type PostDestination,
} from './types'
import { renderEditedImage } from './mediaUtils'
import { isFullVideoTrim, MAX_TRIM_DURATION_SEC } from './videoTrimUtils'
import { invalidateSocialCaches } from '../../utils/socialCache'
import { loadVideoMetadata, prepareDelversVideoForUpload, probeDelversVideoFile } from '../../utils/delversVideoUtils'
import './SocialCreateComposer.css'

type Props = {
  mode: CreateStudioMode
}

const TOOL_TITLES: Record<CreateTool, string> = {
  filters: 'Filters',
  crop: 'Crop',
  caption: 'Caption',
  trim: 'Trim',
}

export function SocialCreateComposer({ mode }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const frameRef = useRef<HTMLDivElement>(null)

  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [filter, setFilter] = useState<MediaFilter>('original')
  const [crop, setCrop] = useState(DEFAULT_CROP)
  const [captionPosition, setCaptionPosition] = useState({ x: 50, y: 78 })
  const [captionDragging, setCaptionDragging] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 })
  const [activeTool, setActiveTool] = useState<CreateTool | null>(null)
  const [destination, setDestination] = useState<PostDestination>(
    mode === 'story' ? 'delvers' : 'delvers',
  )
  const [board, setBoard] = useState(mode === 'story' ? 'Highlights' : '')
  const [postAsHighlight, setPostAsHighlight] = useState(false)
  const [placeLink, setPlaceLink] = useState<PlaceLink>(DEFAULT_PLACE_LINK)
  const [error, setError] = useState('')
  const startedAt = useRef(startCreateSession())

  const hostStory =
    searchParams.get('host_story') === '1' || searchParams.get('host_story') === 'true'
  const returnTo = searchParams.get('return')?.trim() || ''

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    if (!profile?.region) return
    setRegion(profile.region)
  }, [profile?.region])

  useEffect(() => {
    const listing = searchParams.get('listing')
    const event = searchParams.get('event')
    const vehicle = searchParams.get('vehicle')
    const busTrip = searchParams.get('bus_trip')
    const food = searchParams.get('food')
    if (listing && Number.isFinite(Number(listing)) && Number(listing) > 0) {
      if (!hostStory) setDestination('delvers')
      setPlaceLink({ kind: 'accommodation', id: Number(listing), title: '' })
      return
    }
    if (event && Number.isFinite(Number(event)) && Number(event) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'event', id: Number(event), title: '' })
      return
    }
    if (vehicle && Number.isFinite(Number(vehicle)) && Number(vehicle) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'vehicle', id: Number(vehicle), title: '' })
      return
    }
    if (busTrip && Number.isFinite(Number(busTrip)) && Number(busTrip) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'bus_trip', id: Number(busTrip), title: '' })
      return
    }
    if (food && Number.isFinite(Number(food)) && Number(food) > 0) {
      setDestination('delvers')
      setPlaceLink({ kind: 'food', id: Number(food), title: '' })
    }
  }, [hostStory, searchParams])

  const postsToDelvers = !hostStory && (mode === 'story' || destination === 'delvers')
  const publishAsHighlight = !hostStory && (mode === 'story' || (mode === 'post' && postAsHighlight && destination === 'delvers'))
  const isDirty = Boolean(
    file || caption.trim() || placeLink.kind !== 'none' || board.trim() || postAsHighlight,
  )

  const requestLeave = (to: string) => {
    if (isDirty && !window.confirm('Discard this draft?')) return
    navigate(to)
  }

  const onPickFile = async (nextFile: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setError('')
    if (nextFile && mediaKind === 'video') {
      const probeError = await probeDelversVideoFile(nextFile)
      if (probeError) {
        setError(probeError)
        return
      }
    }
    setFile(nextFile)
    const nextPreview = nextFile ? URL.createObjectURL(nextFile) : null
    setPreview(nextPreview)
    setVideoDuration(0)
    setVideoTrim({ start: 0, end: 0 })
    if (nextFile) setActiveTool('filters')
  }

  useEffect(() => {
    if (!preview || mediaKind !== 'video') return
    let cancelled = false
    void loadVideoMetadata(preview)
      .then(({ duration, trim }) => {
        if (cancelled) return
        setVideoDuration(duration)
        setVideoTrim(trim)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load video.')
      })
    return () => {
      cancelled = true
    }
  }, [preview, mediaKind])

  const onMediaKindChange = (kind: MediaKind) => {
    setMediaKind(kind)
    onPickFile(null)
  }

  const moveCaption = (event: PointerEvent<HTMLElement>) => {
    const frame = frameRef.current
    if (!frame) return
    setCaptionPosition(captionPositionFromPointer(frame, event.clientX, event.clientY))
  }

  const startCaptionDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    setCaptionDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    moveCaption(event)
  }

  const stopCaptionDrag = (event: PointerEvent<HTMLDivElement>) => {
    setCaptionDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const publish = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Add a photo or video first.')
      if (hostStory && (placeLink.kind !== 'accommodation' || placeLink.id <= 0)) {
        throw new Error('Link a stay listing for this host story.')
      }

      const fd = new FormData()
      fd.append('body', caption.trim())
      fd.append('region', region.trim())
      fd.append('is_delvers', postsToDelvers ? 'true' : 'false')
      fd.append('is_accommodation_story', hostStory ? 'true' : 'false')
      fd.append('is_delvers_highlight', publishAsHighlight ? 'true' : 'false')
      if (postsToDelvers) {
        const boardName = board.trim() || (publishAsHighlight ? 'Highlights' : 'Posts')
        fd.append('delvers_board', boardName)
      }
      if (placeLink.kind === 'accommodation' && placeLink.id > 0) {
        fd.append('listing', String(placeLink.id))
      }
      if (postsToDelvers && placeLink.kind === 'event' && placeLink.id > 0) {
        fd.append('event', String(placeLink.id))
      }
      if (postsToDelvers && placeLink.kind === 'vehicle' && placeLink.id > 0) {
        fd.append('vehicle_listing', String(placeLink.id))
      }
      if (postsToDelvers && placeLink.kind === 'bus_trip' && placeLink.id > 0) {
        fd.append('bus_trip', String(placeLink.id))
      }
      if (postsToDelvers && placeLink.kind === 'food' && placeLink.id > 0) {
        fd.append('food_venue', String(placeLink.id))
      }

      if (mediaKind === 'video') {
        const videoFile = await prepareDelversVideoForUpload(file, videoTrim, videoDuration)
        fd.append('video', videoFile)
      } else {
        const blob = await renderEditedImage(file, filter, crop)
        fd.append('image', new File([blob], 'post.jpg', { type: 'image/jpeg' }))
      }

      return apiFetch<FeedPost>('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: async (data) => {
      trackCreatePublish({
        format: hostStory ? 'host_story' : mode === 'story' ? 'highlight' : 'post',
        has_place: placeLink.kind !== 'none',
        startedAt: startedAt.current,
      })
      await invalidateSocialCaches(qc, {
        username: profile?.username,
        accommodationStories: hostStory,
        listingId: data.listing?.id ?? (placeLink.kind === 'accommodation' ? placeLink.id : undefined),
        eventId: data.event?.id,
        vehicleListingId:
          data.vehicle_listing?.id ?? (placeLink.kind === 'vehicle' ? placeLink.id : undefined),
        busTripId: data.bus_trip?.id ?? (placeLink.kind === 'bus_trip' ? placeLink.id : undefined),
        foodVenueId: data.food_venue?.id ?? (placeLink.kind === 'food' ? placeLink.id : undefined),
      })
      if (returnTo) {
        navigate(returnTo)
      } else if (hostStory) {
        navigate('/provider/stays')
      } else if (postsToDelvers) {
        navigate('/delvers')
      } else {
        navigate(profile ? `/u/${encodeURIComponent(profile.username)}` : '/')
      }
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not publish.'),
  })

  if (!profile) {
    return (
      <main className="create-studio create-studio--gate">
        <section className="create-studio-gate">
          <h1>{hostStory ? 'Host story' : mode === 'story' ? 'Add a highlight' : 'Create a post'}</h1>
          <p>Sign in to share photos and videos with filters, captions, and trim.</p>
          <div className="create-studio-gate__actions">
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

  const title = hostStory ? 'Host story' : mode === 'story' ? 'New highlight' : 'New post'
  const subtitle = hostStory
    ? 'Stay story rings'
    : mode === 'story'
      ? 'Delvers highlights'
      : destination === 'delvers'
        ? 'Show on Delvers'
        : 'Profile only'

  const shareDisabled =
    !file ||
    (hostStory && (placeLink.kind !== 'accommodation' || placeLink.id <= 0)) ||
    (mediaKind === 'video' &&
      videoDuration > 0 &&
      videoTrim.end - videoTrim.start > MAX_TRIM_DURATION_SEC)

  const leaveTarget = returnTo || (hostStory ? '/provider/stays' : '/create')

  return (
    <main
      className={`create-studio create-studio--immersive${preview ? ' has-media' : ''}${activeTool ? ' create-studio--tool-open' : ''}`}
    >
      <CreateStudioHeader
        title={title}
        subtitle={subtitle}
        onBack={() => requestLeave(leaveTarget)}
        actionLabel="Share"
        actionDisabled={shareDisabled}
        actionPending={publish.isPending}
        actionPendingLabel={
          publish.isPending && mediaKind === 'video' && !isFullVideoTrim(videoTrim, videoDuration)
            ? 'Preparing…'
            : 'Sharing…'
        }
        onAction={() => {
          setError('')
          publish.mutate()
        }}
      />

      <section className="create-studio__stage">
        {preview ? (
          <MediaPreview
            frameRef={frameRef}
            preview={preview}
            mediaKind={mediaKind}
            filter={filter}
            crop={crop}
            caption={caption}
            captionPosition={captionPosition}
            captionDragging={captionDragging}
            onCaptionPointerDown={startCaptionDrag}
            onCaptionPointerMove={(event) => captionDragging && moveCaption(event)}
            onCaptionPointerUp={stopCaptionDrag}
            onCaptionKeyDown={(event) => {
              if (event.key === 'ArrowLeft') setCaptionPosition((pos) => nudgeCaptionPosition(pos, -3, 0))
              if (event.key === 'ArrowRight') setCaptionPosition((pos) => nudgeCaptionPosition(pos, 3, 0))
              if (event.key === 'ArrowUp') setCaptionPosition((pos) => nudgeCaptionPosition(pos, 0, -3))
              if (event.key === 'ArrowDown') setCaptionPosition((pos) => nudgeCaptionPosition(pos, 0, 3))
            }}
            mode={mode}
          />
        ) : (
          <MediaPicker mediaKind={mediaKind} onMediaKindChange={onMediaKindChange} onPick={onPickFile} />
        )}
      </section>

      {preview ? (
        <footer className="create-studio__footer">
          {error ? <p className="create-studio__error">{error}</p> : null}

          {mode === 'post' && !hostStory ? (
            <div className="create-studio__dest" role="tablist" aria-label="Where to share">
              <button
                type="button"
                className={destination === 'delvers' ? 'is-active' : ''}
                onClick={() => setDestination('delvers')}
              >
                Delvers
              </button>
              <button
                type="button"
                className={destination === 'feed' ? 'is-active' : ''}
                onClick={() => {
                  setDestination('feed')
                  setPlaceLink(DEFAULT_PLACE_LINK)
                }}
              >
                Profile only
              </button>
            </div>
          ) : null}

          {mode === 'post' && !hostStory && destination === 'delvers' ? (
            <label className="create-studio__highlight-toggle">
              <input
                type="checkbox"
                checked={postAsHighlight}
                onChange={(event) => setPostAsHighlight(event.target.checked)}
              />
              <span>Also save as a highlight ring (story-style, not in the feed)</span>
            </label>
          ) : null}

          {postsToDelvers || hostStory ? (
            <div className="create-studio__meta">
              {(mode === 'post' && !hostStory) || mode === 'story' ? (
                <input
                  className="create-studio__board"
                  value={board}
                  onChange={(event) => setBoard(event.target.value)}
                  placeholder={
                    mode === 'story' || postAsHighlight
                      ? 'Highlight ring name · Weekend trips, food finds…'
                      : 'Board · Weekend trips, food finds…'
                  }
                />
              ) : null}
              <PlaceSearchSheet
                value={placeLink}
                onChange={setPlaceLink}
                disabled={publish.isPending}
                allowedKinds={hostStory ? ['accommodation'] : undefined}
                triggerLabel={hostStory ? 'Link a stay' : 'Link a place'}
              />
            </div>
          ) : null}

          <div className="create-studio__footer-row">
            <label className="create-studio__replace">
              <input
                type="file"
                accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
                onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
              />
              Replace
            </label>
            <CreateToolDock
              active={activeTool}
              onChange={(tool) => setActiveTool((current) => (current === tool ? null : tool))}
              showTrim={mediaKind === 'video'}
            />
          </div>
        </footer>
      ) : null}

      <CreateToolSheet
        open={Boolean(preview && activeTool)}
        title={activeTool ? TOOL_TITLES[activeTool] : ''}
        onClose={() => setActiveTool(null)}
      >
        {activeTool === 'filters' ? <FilterStrip value={filter} onChange={setFilter} /> : null}
        {activeTool === 'crop' ? (
          <CropControls value={crop} onChange={setCrop} disabled={mediaKind !== 'image'} />
        ) : null}
        {activeTool === 'caption' ? (
          <CaptionEditor
            value={caption}
            onChange={setCaption}
            onPositionPreset={setCaptionPosition}
            region={region}
            onRegionChange={setRegion}
          />
        ) : null}
        {activeTool === 'trim' && mediaKind === 'video' && preview ? (
          <PostVideoTrimPanel
            preview={preview}
            videoDuration={videoDuration}
            videoTrim={videoTrim}
            onDuration={setVideoDuration}
            onTrimChange={setVideoTrim}
          />
        ) : null}
      </CreateToolSheet>
    </main>
  )
}
