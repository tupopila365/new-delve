import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
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
import { MusicPicker } from './MusicPicker'
import { VideoTrimBar } from './VideoTrimBar'
import { CreateToolDock, type CreateTool } from './CreateToolDock'
import { DEFAULT_CROP, type CreateStudioMode, type MediaFilter, type MediaKind, type PostDestination } from './types'
import { renderEditedImage } from './mediaUtils'
import './SocialCreateComposer.css'

type Props = {
  mode: CreateStudioMode
}

export function SocialCreateComposer({ mode }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
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
  const [music, setMusic] = useState('No music')
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 })
  const [activeTool, setActiveTool] = useState<CreateTool>('filters')
  const [destination, setDestination] = useState<PostDestination>(mode === 'story' ? 'delvers' : 'delvers')
  const [board, setBoard] = useState(mode === 'story' ? 'Stories' : '')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    if (!profile?.region) return
    setRegion(profile.region)
  }, [profile?.region])

  const onPickFile = (nextFile: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(nextFile)
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null)
    setVideoDuration(0)
    setVideoTrim({ start: 0, end: 0 })
    if (nextFile) setActiveTool('filters')
  }

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

  const musicLabel =
    music !== 'No music' || musicFile ? `♪ ${musicFile?.name || music}` : undefined

  const publish = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Add a photo or video first.')

      const fd = new FormData()
      fd.append('body', caption.trim())
      fd.append('region', region.trim())
      fd.append('is_delvers', mode === 'story' || destination === 'delvers' ? 'true' : 'false')
      if (mode === 'story' || destination === 'delvers') {
        fd.append('delvers_board', board.trim() || (mode === 'story' ? 'Stories' : 'Posts'))
      }

      if (mediaKind === 'video') {
        fd.append('video', file)
      } else {
        const blob = await renderEditedImage(file, filter, crop)
        fd.append('image', new File([blob], 'post.jpg', { type: 'image/jpeg' }))
      }

      return apiFetch('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['feed'] })
      await qc.invalidateQueries({ queryKey: ['delvers'] })
      navigate(mode === 'story' ? '/delvers' : destination === 'delvers' ? '/delvers' : '/')
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not publish.'),
  })

  if (!profile) {
    return (
      <main className="create-studio create-studio--gate">
        <section className="create-studio-gate">
          <h1>{mode === 'story' ? 'Create a story' : 'Create a post'}</h1>
          <p>Sign in to share photos and videos with filters, captions, and music.</p>
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

  const title = mode === 'story' ? 'New story' : 'New post'
  const subtitle = mode === 'post' ? (destination === 'delvers' ? 'Delvers' : 'Feed') : 'Photo or video'

  return (
    <main className="create-studio">
      <CreateStudioHeader
        title={title}
        subtitle={subtitle}
        onBack={() => navigate('/create')}
        actionLabel="Share"
        actionDisabled={!file}
        actionPending={publish.isPending}
        onAction={() => {
          setError('')
          publish.mutate()
        }}
      />

      {mode === 'post' ? (
        <div className="create-studio__dest" role="tablist" aria-label="Post destination">
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
            onClick={() => setDestination('feed')}
          >
            Feed
          </button>
        </div>
      ) : null}

      <section className="create-studio__body">
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
            musicLabel={musicLabel}
            mode={mode}
          />
        ) : (
          <MediaPicker mediaKind={mediaKind} onMediaKindChange={onMediaKindChange} onPick={onPickFile} />
        )}

        {preview ? (
          <>
            <label className="create-studio__replace">
              <input
                type="file"
                accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
                onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
              />
              Replace {mediaKind}
            </label>

            <CreateToolDock
              active={activeTool}
              onChange={setActiveTool}
              showTrim={mediaKind === 'video'}
            />

            {error ? <p className="create-studio__error">{error}</p> : null}

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
            {activeTool === 'music' ? (
              <MusicPicker
                music={music}
                onMusicChange={setMusic}
                musicFile={musicFile}
                onMusicFileChange={setMusicFile}
              />
            ) : null}
            {activeTool === 'trim' && mediaKind === 'video' ? (
              <>
                <video
                  src={preview}
                  className="visually-hidden"
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration || 0
                    setVideoDuration(duration)
                    setVideoTrim({ start: 0, end: duration })
                  }}
                />
                <VideoTrimBar value={videoTrim} duration={videoDuration} onChange={setVideoTrim} />
              </>
            ) : null}

            {destination === 'delvers' && mode === 'post' ? (
              <div className="create-panel">
                <p className="create-panel__title">Board</p>
                <input
                  className="create-panel__field-input"
                  value={board}
                  onChange={(event) => setBoard(event.target.value)}
                  placeholder="Weekend trips, food finds…"
                />
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
