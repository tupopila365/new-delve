import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { CreateStudioHeader } from '../create/CreateStudioHeader'
import { CreateToolSheet } from '../create/CreateToolSheet'
import { MediaPicker } from '../create/MediaPicker'
import {
  MediaPreview,
  captionPositionFromPointer,
  nudgeCaptionPosition,
} from '../create/MediaPreview'
import { FilterStrip } from '../create/FilterStrip'
import { CropControls } from '../create/CropControls'
import { CaptionEditor } from '../create/CaptionEditor'
import { AdjustmentPanel } from '../create/AdjustmentPanel'
import { CreateToolDock, type CreateTool } from '../create/CreateToolDock'
import { PostVideoTrimPanel } from '../create/PostVideoTrimPanel'
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_CROP,
  type Adjustments,
  type CropSettings,
  type MediaFilter,
  type MediaKind,
} from '../create/types'
import { analyzeImageForEnhance, cssFilterForMedia, renderEditedImage } from '../create/mediaUtils'
import { prepareVideoEffects } from '../create/videoEffects'
import { MAX_TRIM_DURATION_SEC } from '../create/videoTrimUtils'
import { loadVideoMetadata } from '../../utils/delversVideoUtils'
import { uploadHighlightMedia } from './highlightMediaApi'
import type { HighlightSlide } from './types'
import '../create/SocialCreateComposer.css'

const STUDIO_TOOLS: CreateTool[] = ['filters', 'adjust', 'crop', 'caption', 'trim']

const TOOL_TITLES: Record<CreateTool, string> = {
  filters: 'Filters',
  crop: 'Crop',
  caption: 'Caption',
  trim: 'Trim video',
  adjust: 'Adjust',
  text: 'Text',
  stickers: 'Stickers',
  draw: 'Draw',
}

type SavedSlide = Pick<HighlightSlide, 'src' | 'kind' | 'headline' | 'sub' | 'captionX' | 'captionY'>

type Props = {
  onSaved: (slide: SavedSlide) => void
  onCancel?: () => void
  submitLabel?: string
  /** When editing an existing slide (caption/media replace). */
  initialSlide?: {
    src: string
    kind?: 'image' | 'video'
    headline?: string
    sub?: string
    captionX?: number
    captionY?: number
  } | null
}

export function HighlightMediaStudio({
  onSaved,
  onCancel,
  submitLabel = 'Add slide',
  initialSlide = null,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const [mediaKind, setMediaKind] = useState<MediaKind>(initialSlide?.kind ?? 'image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialSlide?.src ? initialSlide.src : null)
  const [filter, setFilter] = useState<MediaFilter>('original')
  const [filterIntensity, setFilterIntensity] = useState(100)
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS)
  const [crop, setCrop] = useState<CropSettings>(DEFAULT_CROP)
  const [activeTool, setActiveTool] = useState<CreateTool | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 })
  const [videoPlayheadSec, setVideoPlayheadSec] = useState(0)
  const [caption, setCaption] = useState(initialSlide?.headline ?? '')
  const [captionPosition, setCaptionPosition] = useState({
    x: initialSlide?.captionX ?? 50,
    y: initialSlide?.captionY ?? 78,
  })
  const [captionDragging, setCaptionDragging] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [autoEnhanceBusy, setAutoEnhanceBusy] = useState(false)
  const [hasAutoEnhance, setHasAutoEnhance] = useState(false)

  const handleAutoEnhance = () => {
    if (!file || mediaKind !== 'image') return
    setAutoEnhanceBusy(true)
    void analyzeImageForEnhance(file)
      .then((next) => {
        setAdjustments((prev) => ({ ...prev, ...next }))
        setHasAutoEnhance(true)
      })
      .catch(() => {})
      .finally(() => setAutoEnhanceBusy(false))
  }

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    if (!preview || mediaKind !== 'video' || videoDuration > 0) return
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
  }, [preview, mediaKind, videoDuration])

  const handlePreviewTimeUpdate = () => {
    const v = previewVideoRef.current
    if (!v) return
    const { start, end } = videoTrim
    if (end > start && v.currentTime >= end - 0.03) {
      v.currentTime = start
      if (!v.paused) void v.play().catch(() => {})
    }
    if (activeTool === 'trim') setVideoPlayheadSec(v.currentTime)
  }

  const handlePreviewPlay = () => {
    const v = previewVideoRef.current
    if (!v) return
    const { start, end } = videoTrim
    if (end > start && (v.currentTime < start - 0.1 || v.currentTime >= end - 0.03)) {
      v.currentTime = start
    }
  }

  const seekPreviewTo = (sec: number) => {
    const v = previewVideoRef.current
    if (!v) return
    if (!v.paused) v.pause()
    v.currentTime = sec
    setVideoPlayheadSec(sec)
  }

  function onPickFile(nextFile: File | null) {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setFile(nextFile)
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null)
    setMediaKind(nextFile?.type.startsWith('video/') ? 'video' : 'image')
    setVideoDuration(0)
    setVideoTrim({ start: 0, end: 0 })
    setVideoPlayheadSec(0)
    setFilterIntensity(100)
    setAdjustments(DEFAULT_ADJUSTMENTS)
    setHasAutoEnhance(false)
    setError('')
    if (nextFile) setActiveTool('filters')
  }

  function moveCaption(event: PointerEvent<HTMLElement>) {
    const frame = frameRef.current
    if (!frame) return
    setCaptionPosition(captionPositionFromPointer(frame, event.clientX, event.clientY))
  }

  function startCaptionDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    setCaptionDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    moveCaption(event)
  }

  function stopCaptionDrag(event: PointerEvent<HTMLDivElement>) {
    setCaptionDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  async function handleSave() {
    if (!file && !initialSlide?.src?.trim()) {
      setError('Add a photo or video first.')
      return
    }
    if (!caption.trim()) {
      setError('Add a caption for this slide.')
      return
    }
    if (
      mediaKind === 'video' &&
      videoDuration > 0 &&
      videoTrim.end - videoTrim.start > MAX_TRIM_DURATION_SEC
    ) {
      setError(`Trimmed video must be ${MAX_TRIM_DURATION_SEC} seconds or less.`)
      return
    }
    setError('')
    setUploading(true)
    try {
      if (!file && initialSlide?.src?.trim()) {
        onSaved({
          src: initialSlide.src,
          kind: initialSlide.kind === 'video' ? 'video' : 'image',
          headline: caption.trim(),
          sub: initialSlide.sub,
          captionX: captionPosition.x,
          captionY: captionPosition.y,
        })
        return
      }
      if (!file) return

      let url: string
      let kind: MediaKind
      if (mediaKind === 'video') {
        const effects = await prepareVideoEffects(file, {
          filter,
          filterIntensity,
          adjustments,
          textOverlays: [],
          stickers: [],
          strokes: [],
        })
        const result = await uploadHighlightMedia(file, 'video', videoTrim, videoDuration, effects)
        url = result.url
        kind = result.kind
      } else {
        const blob = await renderEditedImage(file, filter, crop, adjustments, filterIntensity)
        const uploadFile = new File([blob], 'slide.jpg', { type: 'image/jpeg' })
        const result = await uploadHighlightMedia(uploadFile, 'image')
        url = result.url
        kind = result.kind
      }
      onSaved({
        src: url,
        kind,
        headline: caption.trim(),
        captionX: captionPosition.x,
        captionY: captionPosition.y,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload media.')
    } finally {
      setUploading(false)
    }
  }

  const shareDisabled =
    (!file && !initialSlide?.src?.trim()) ||
    !caption.trim() ||
    uploading ||
    (mediaKind === 'video' &&
      file != null &&
      videoDuration > 0 &&
      videoTrim.end - videoTrim.start > MAX_TRIM_DURATION_SEC)

  return (
    <div
      className={`create-studio create-studio--immersive hl-media-studio${preview ? ' has-media' : ''}${activeTool ? ' create-studio--tool-open' : ''}`}
    >
      {onCancel ? (
        <CreateStudioHeader
          title="Edit slide"
          subtitle="Filters, adjust, crop, caption & trim"
          onBack={onCancel}
          actionLabel={submitLabel}
          actionDisabled={shareDisabled}
          actionPending={uploading}
          actionPendingLabel="Uploading…"
          onAction={() => void handleSave()}
        />
      ) : null}

      <section className="create-studio__stage">
        {preview ? (
          <div className="create-media" style={{ aspectRatio: '9 / 16' }}>
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
              onCaptionPointerMove={(event) => {
                if (captionDragging) moveCaption(event)
              }}
              onCaptionPointerUp={stopCaptionDrag}
              onCaptionKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'ArrowLeft') setCaptionPosition((pos) => nudgeCaptionPosition(pos, -3, 0))
                if (event.key === 'ArrowRight') setCaptionPosition((pos) => nudgeCaptionPosition(pos, 3, 0))
                if (event.key === 'ArrowUp') setCaptionPosition((pos) => nudgeCaptionPosition(pos, 0, -3))
                if (event.key === 'ArrowDown') setCaptionPosition((pos) => nudgeCaptionPosition(pos, 0, 3))
              }}
              mode="story"
              showCaptionOverlay={activeTool !== 'crop'}
              cropInteractive={activeTool === 'crop'}
              onCropChange={setCrop}
              videoRef={previewVideoRef}
              onVideoTimeUpdate={handlePreviewTimeUpdate}
              onVideoPlay={handlePreviewPlay}
              filterStyle={cssFilterForMedia(filter, filterIntensity, adjustments)}
            />
          </div>
        ) : (
          <MediaPicker
            mediaKind={mediaKind}
            onMediaKindChange={setMediaKind}
            onPick={onPickFile}
          />
        )}
      </section>

      {preview ? (
        <footer className="create-studio__footer">
          {error ? <p className="create-studio__error" role="alert">{error}</p> : null}

          <div className="create-studio__toolbar">
            <label className="create-studio__replace">
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                onChange={(event) => {
                  onPickFile(event.target.files?.[0] ?? null)
                  event.currentTarget.value = ''
                }}
              />
              Replace
            </label>
            <CreateToolDock
              active={activeTool}
              onChange={(tool) => setActiveTool((current) => (current === tool ? null : tool))}
              showTrim={mediaKind === 'video'}
              include={STUDIO_TOOLS}
            />
          </div>
        </footer>
      ) : error ? (
        <p className="create-studio__error hl-media-studio__error" role="alert">{error}</p>
      ) : null}

      <CreateToolSheet
        open={Boolean(preview && activeTool)}
        title={activeTool ? TOOL_TITLES[activeTool] : ''}
        onClose={() => setActiveTool(null)}
      >
        {activeTool === 'filters' ? (
          <FilterStrip
            value={filter}
            onChange={setFilter}
            intensity={filterIntensity}
            onIntensityChange={setFilterIntensity}
            previewUrl={preview}
            hasMedia={mediaKind === 'image'}
          />
        ) : null}
        {activeTool === 'adjust' ? (
          <AdjustmentPanel
            value={adjustments}
            onChange={setAdjustments}
            onCommit={() => {}}
            onAutoEnhance={handleAutoEnhance}
            autoEnhanceBusy={autoEnhanceBusy}
            hasAutoEnhance={hasAutoEnhance}
          />
        ) : null}
        {activeTool === 'crop' ? (
          <CropControls value={crop} onChange={setCrop} disabled={mediaKind !== 'image'} />
        ) : null}
        {activeTool === 'caption' ? (
          <CaptionEditor
            value={caption}
            onChange={setCaption}
            onPositionPreset={setCaptionPosition}
            showRegion={false}
          />
        ) : null}
        {activeTool === 'trim' && mediaKind === 'video' && preview ? (
          <PostVideoTrimPanel
            preview={preview}
            videoDuration={videoDuration}
            videoTrim={videoTrim}
            onDuration={setVideoDuration}
            onTrimChange={setVideoTrim}
            playheadSec={videoPlayheadSec}
            onScrub={seekPreviewTo}
          />
        ) : null}
      </CreateToolSheet>
    </div>
  )
}
