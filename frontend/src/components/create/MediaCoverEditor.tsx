import { useEffect, useRef, useState } from 'react'
import { MediaPicker } from './MediaPicker'
import { MediaPreview } from './MediaPreview'
import { FilterStrip } from './FilterStrip'
import { CropControls } from './CropControls'
import { VideoTrimBar } from './VideoTrimBar'
import { CreateToolDock, type CreateTool } from './CreateToolDock'
import type { CropAspect, CropSettings, MediaFilter, MediaKind } from './types'
import { blobToDataUrl, renderEditedImage, videoPosterDataUrl } from './mediaUtils'
import './SocialCreateComposer.css'

const COVER_TOOLS: CreateTool[] = ['filters', 'crop', 'trim']

type Props = {
  label?: string
  value: string | null
  onChange: (coverUrl: string | null) => void
  onFileReady?: (file: File | null) => void
  defaultAspect?: CropAspect
  /** When true, hide video mode (e.g. listing cover slot). */
  imagesOnly?: boolean
}

const defaultCrop = (aspect: CropAspect): CropSettings => ({
  aspect,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
})

export function MediaCoverEditor({
  label = 'Cover photo or video',
  value,
  onChange,
  onFileReady,
  defaultAspect = '16:9',
  imagesOnly = false,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [filter, setFilter] = useState<MediaFilter>('original')
  const [crop, setCrop] = useState(defaultCrop(defaultAspect))
  const [activeTool, setActiveTool] = useState<CreateTool>('filters')
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 })
  const [exporting, setExporting] = useState(false)
  const [processError, setProcessError] = useState('')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onFileReadyRef = useRef(onFileReady)
  onFileReadyRef.current = onFileReady

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    if (!file) {
      onFileReadyRef.current?.(null)
      return
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setExporting(true)
        setProcessError('')
        try {
          if (mediaKind === 'image') {
            const blob = await renderEditedImage(file, filter, crop)
            onChangeRef.current(await blobToDataUrl(blob))
            onFileReadyRef.current?.(new File([blob], 'cover.jpg', { type: 'image/jpeg' }))
          } else {
            const dataUrl = await videoPosterDataUrl(file, videoTrim.start)
            onChangeRef.current(dataUrl)
            const posterBlob = await (await fetch(dataUrl)).blob()
            onFileReadyRef.current?.(new File([posterBlob], 'cover.jpg', { type: 'image/jpeg' }))
          }
        } catch {
          onChangeRef.current(null)
          onFileReadyRef.current?.(null)
          setProcessError('Could not process this file. Try a JPG or PNG under 12MB.')
        } finally {
          setExporting(false)
        }
      })()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [file, filter, crop, mediaKind, videoTrim.start])

  const onPickFile = (nextFile: File | null) => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    if (nextFile?.type.startsWith('video/') && imagesOnly) {
      setProcessError('Cover must be a photo. Add videos in the gallery slots below.')
      return
    }
    setFile(nextFile)
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null)
    if (nextFile) setActiveTool('filters')
    setProcessError('')
  }

  const onMediaKindChange = (kind: MediaKind) => {
    setMediaKind(kind)
    onPickFile(null)
  }

  const displayPreview = preview || value

  return (
    <section className="media-cover-editor" aria-label={label}>
      <p className="media-cover-editor__label">{label}</p>

      {displayPreview ? (
        <>
          <MediaPreview
            frameRef={frameRef}
            preview={displayPreview}
            mediaKind={mediaKind}
            filter={filter}
            crop={crop}
            caption=""
            captionPosition={{ x: 50, y: 78 }}
            captionDragging={false}
            onCaptionPointerDown={() => {}}
            onCaptionPointerMove={() => {}}
            onCaptionPointerUp={() => {}}
            onCaptionKeyDown={() => {}}
            mode="post"
            showCaptionOverlay={false}
          />

          <label className="create-studio__replace">
            <input
              type="file"
              accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
              onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
            />
            Replace {mediaKind}
          </label>

          {file ? (
            <>
              <CreateToolDock
                active={activeTool}
                onChange={setActiveTool}
                showTrim={mediaKind === 'video'}
                include={COVER_TOOLS}
              />
              {exporting ? <p className="media-cover-editor__status">Applying edits…</p> : null}
              {processError ? (
                <p className="media-cover-editor__status media-cover-editor__status--error" role="alert">
                  {processError}
                </p>
              ) : null}
              {activeTool === 'filters' ? <FilterStrip value={filter} onChange={setFilter} /> : null}
              {activeTool === 'crop' ? (
                <CropControls value={crop} onChange={setCrop} disabled={mediaKind !== 'image'} />
              ) : null}
              {activeTool === 'trim' && mediaKind === 'video' ? (
                <>
                  <video
                    src={preview ?? undefined}
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
            </>
          ) : null}
        </>
      ) : (
        <MediaPicker
          mediaKind={imagesOnly ? 'image' : mediaKind}
          onMediaKindChange={imagesOnly ? () => {} : onMediaKindChange}
          onPick={onPickFile}
          imagesOnly={imagesOnly}
        />
      )}
    </section>
  )
}
