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
import { analyzeImageForEnhance, cssFilterForMedia } from '../create/mediaUtils'
import { MAX_TRIM_DURATION_SEC } from '../create/videoTrimUtils'
import { loadVideoMetadata } from '../../utils/delversVideoUtils'
import {
  computeHighlightEditFingerprint,
  eagerUploadIsReady,
  idleEagerUploadState,
  isRemoteMediaUrl,
  uploadHighlightEdit,
  type EagerHighlightUploadState,
} from './eagerHighlightUpload'
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
  const [upload, setUpload] = useState<EagerHighlightUploadState>(() =>
    initialSlide?.src && isRemoteMediaUrl(initialSlide.src)
      ? { status: 'ready', url: initialSlide.src, kind: initialSlide.kind === 'video' ? 'video' : 'image', progress: 1 }
      : idleEagerUploadState(),
  )
  const [saving, setSaving] = useState(false)
  const [autoEnhanceBusy, setAutoEnhanceBusy] = useState(false)
  const [hasAutoEnhance, setHasAutoEnhance] = useState(false)
  const uploadGenRef = useRef(0)

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
    setUpload(idleEagerUploadState())
    uploadGenRef.current += 1
    if (nextFile) setActiveTool('filters')
  }

  // Delvers-style: upload in the background while the provider edits.
  const editFingerprint = file
    ? computeHighlightEditFingerprint({
        file,
        mediaKind,
        filter,
        filterIntensity,
        adjustments,
        crop,
        videoDuration,
        videoTrim,
      })
    : ''

  useEffect(() => {
    if (!file || !editFingerprint) return
    if (mediaKind === 'video' && videoDuration <= 0) return
    if (eagerUploadIsReady(upload, editFingerprint)) return

    const gen = ++uploadGenRef.current
    const timer = window.setTimeout(() => {
      void (async () => {
        setUpload({ status: 'uploading', fingerprint: editFingerprint, progress: 0, error: undefined })
        const next = await uploadHighlightEdit(
          {
            file,
            mediaKind,
            filter,
            filterIntensity,
            adjustments,
            crop,
            videoDuration,
            videoTrim,
          },
          (ratio) => {
            if (gen !== uploadGenRef.current) return
            setUpload((prev) =>
              prev.fingerprint === editFingerprint || prev.status === 'uploading'
                ? { ...prev, status: 'uploading', fingerprint: editFingerprint, progress: ratio }
                : prev,
            )
          },
        )
        if (gen !== uploadGenRef.current) return
        setUpload(next)
        if (next.status === 'error' && next.error) {
          setError(next.error)
        }
      })()
    }, 450)

    return () => {
      window.clearTimeout(timer)
    }
    // Intentionally keyed on fingerprint — mirrors SocialCreateComposer uploadKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editFingerprint, mediaKind, videoDuration])

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
    setSaving(true)
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

      let url = ''
      let kind: MediaKind = mediaKind
      if (editFingerprint && eagerUploadIsReady(upload, editFingerprint) && upload.url) {
        url = upload.url
        kind = upload.kind ?? mediaKind
      } else {
        setUpload({ status: 'uploading', fingerprint: editFingerprint, progress: 0 })
        const next = await uploadHighlightEdit({
          file,
          mediaKind,
          filter,
          filterIntensity,
          adjustments,
          crop,
          videoDuration,
          videoTrim,
        })
        setUpload(next)
        if (next.status !== 'ready' || !next.url) {
          throw new Error(next.error || 'Could not upload media.')
        }
        url = next.url
        kind = next.kind ?? mediaKind
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
      setSaving(false)
    }
  }

  const uploadBusy = upload.status === 'uploading' || saving
  const uploadProgressLabel =
    upload.status === 'uploading' && typeof upload.progress === 'number'
      ? `Uploading… ${Math.round(upload.progress * 100)}%`
      : upload.status === 'ready' && file
        ? 'Ready'
        : saving
          ? 'Saving…'
          : 'Uploading…'

  const shareDisabled =
    (!file && !initialSlide?.src?.trim()) ||
    !caption.trim() ||
    uploadBusy ||
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
          subtitle={
            upload.status === 'ready' && file
              ? 'Uploaded — ready to add'
              : upload.status === 'uploading'
                ? 'Uploading to Cloudinary…'
                : 'Filters, adjust, crop, caption & trim'
          }
          onBack={onCancel}
          actionLabel={submitLabel}
          actionDisabled={shareDisabled}
          actionPending={uploadBusy}
          actionPendingLabel={uploadProgressLabel}
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
            {file ? (
              <button
                type="button"
                className={`hl-media-studio__upload-badge hl-media-studio__upload-badge--${upload.status}`}
                aria-live="polite"
                disabled={upload.status === 'uploading' || upload.status === 'ready'}
                onClick={() => {
                  if (upload.status !== 'error' || !file) return
                  uploadGenRef.current += 1
                  const gen = uploadGenRef.current
                  const fp = computeHighlightEditFingerprint({
                    file,
                    mediaKind,
                    filter,
                    filterIntensity,
                    adjustments,
                    crop,
                    videoDuration,
                    videoTrim,
                  })
                  setError('')
                  setUpload({ status: 'uploading', fingerprint: fp, progress: 0 })
                  void uploadHighlightEdit(
                    {
                      file,
                      mediaKind,
                      filter,
                      filterIntensity,
                      adjustments,
                      crop,
                      videoDuration,
                      videoTrim,
                    },
                    (ratio) => {
                      if (gen !== uploadGenRef.current) return
                      setUpload((prev) => ({ ...prev, status: 'uploading', fingerprint: fp, progress: ratio }))
                    },
                  ).then((next) => {
                    if (gen !== uploadGenRef.current) return
                    setUpload(next)
                    if (next.status === 'error' && next.error) setError(next.error)
                  })
                }}
              >
                {upload.status === 'ready'
                  ? 'Uploaded'
                  : upload.status === 'uploading'
                    ? typeof upload.progress === 'number'
                      ? `${Math.round(upload.progress * 100)}%`
                      : 'Uploading…'
                    : upload.status === 'error'
                      ? 'Retry upload'
                      : 'Pending'}
              </button>
            ) : null}
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
