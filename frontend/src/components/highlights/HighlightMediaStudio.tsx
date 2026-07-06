import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { MediaPicker } from '../create/MediaPicker'

import {

  MediaPreview,

  captionPositionFromPointer,

  nudgeCaptionPosition,

} from '../create/MediaPreview'

import { FilterStrip } from '../create/FilterStrip'

import { CropControls } from '../create/CropControls'

import { CaptionEditor } from '../create/CaptionEditor'

import { CreateToolDock, type CreateTool } from '../create/CreateToolDock'

import { VideoTrimBar } from '../create/VideoTrimBar'

import { DEFAULT_CROP, type CropSettings, type MediaFilter, type MediaKind } from '../create/types'

import { renderEditedImage } from '../create/mediaUtils'

import { prepareVideoForUpload } from '../create/videoTrimUtils'

import { uploadHighlightMedia } from './highlightMediaApi'

import type { HighlightSlide } from './types'

import '../create/SocialCreateComposer.css'

import './highlights.css'



const STUDIO_TOOLS: CreateTool[] = ['filters', 'crop', 'caption', 'trim']



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



export function HighlightMediaStudio({ onSaved, onCancel, submitLabel = 'Add slide', initialSlide = null }: Props) {

  const frameRef = useRef<HTMLDivElement>(null)

  const [mediaKind, setMediaKind] = useState<MediaKind>(initialSlide?.kind ?? 'image')

  const [file, setFile] = useState<File | null>(null)

  const [preview, setPreview] = useState<string | null>(initialSlide?.src ? (initialSlide.src) : null)

  const [filter, setFilter] = useState<MediaFilter>('original')

  const [crop, setCrop] = useState<CropSettings>(DEFAULT_CROP)

  const [activeTool, setActiveTool] = useState<CreateTool>('filters')

  const [videoDuration, setVideoDuration] = useState(0)

  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 })

  const [caption, setCaption] = useState(initialSlide?.headline ?? '')

  const [captionPosition, setCaptionPosition] = useState({
    x: initialSlide?.captionX ?? 50,
    y: initialSlide?.captionY ?? 78,
  })

  const [captionDragging, setCaptionDragging] = useState(false)

  const [error, setError] = useState('')

  const [uploading, setUploading] = useState(false)



  useEffect(() => {

    return () => {

      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)

    }

  }, [preview])



  function onPickFile(nextFile: File | null) {

    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)

    setFile(nextFile)

    setPreview(nextFile ? URL.createObjectURL(nextFile) : null)

    setVideoDuration(0)

    setVideoTrim({ start: 0, end: 0 })

    setError('')

    if (nextFile) setActiveTool('filters')

  }



  function onMediaKindChange(kind: MediaKind) {

    setMediaKind(kind)

    onPickFile(null)

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

      let uploadFile: File

      if (mediaKind === 'video') {

        uploadFile = await prepareVideoForUpload(file, videoTrim, videoDuration)

      } else {

        const blob = await renderEditedImage(file, filter, crop)

        uploadFile = new File([blob], 'slide.jpg', { type: 'image/jpeg' })

      }

      const { url, kind } = await uploadHighlightMedia(uploadFile, mediaKind)

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



  return (

    <div className="hl-media-studio">

      {preview ? (

        <>

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

            showCaptionOverlay

          />



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

            include={STUDIO_TOOLS}

          />

          {activeTool === 'filters' ? <FilterStrip value={filter} onChange={setFilter} /> : null}

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

        </>

      ) : (

        <MediaPicker mediaKind={mediaKind} onMediaKindChange={onMediaKindChange} onPick={onPickFile} />

      )}



      {error ? (

        <p className="hl-media-studio__error" role="alert">

          {error}

        </p>

      ) : null}



      <div className="hl-media-studio__actions">

        {onCancel ? (

          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={uploading}>

            Cancel

          </button>

        ) : null}

        <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSave()} disabled={uploading}>

          {uploading ? 'Uploading…' : submitLabel}

        </button>

      </div>

    </div>

  )

}

