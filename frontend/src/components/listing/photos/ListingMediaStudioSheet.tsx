import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { MediaCoverEditor } from '../../create/MediaCoverEditor'
import { MediaPicker } from '../../create/MediaPicker'
import { MediaPreview } from '../../create/MediaPreview'
import { CreateToolDock } from '../../create/CreateToolDock'
import { VideoTrimBar } from '../../create/VideoTrimBar'
import type { MediaKind } from '../../create/types'
import { videoPosterDataUrl } from '../../create/mediaUtils'
import { prepareVideoForUpload } from '../../create/videoTrimUtils'
import type { ListingPhotoDraft } from './types'
import { newPhotoId } from './listingPhotoUtils'
import './listing-photos.css'

type Props = {
  open: boolean
  /** Cover slot accepts images only; gallery accepts photo or video. */
  slot: 'cover' | 'gallery'
  title: string
  initial?: ListingPhotoDraft | null
  submitLabel?: string
  onClose: () => void
  onSave: (photo: ListingPhotoDraft) => void
}

export function ListingMediaStudioSheet({
  open,
  slot,
  title,
  initial = null,
  submitLabel = 'Add',
  onClose,
  onSave,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [mediaKind, setMediaKind] = useState<MediaKind>(initial?.kind ?? 'image')
  const [preview, setPreview] = useState<string | null>(initial?.src ?? null)
  const [posterSrc, setPosterSrc] = useState<string | null>(initial?.posterSrc ?? null)
  const [file, setFile] = useState<File | null>(initial?.file ?? null)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setMediaKind(initial?.kind ?? 'image')
    setPreview(initial?.src ?? null)
    setPosterSrc(initial?.posterSrc ?? null)
    setFile(initial?.file ?? null)
    setVideoDuration(0)
    setVideoTrim({ start: 0, end: 0 })
    setError('')
  }, [open, initial])

  if (!open) return null

  const isCover = slot === 'cover'
  const isVideo = !isCover && mediaKind === 'video'
  const canSaveImage = Boolean(preview?.trim() && (file || preview.startsWith('http') || preview.startsWith('data:')))
  const canSaveVideo = Boolean(
    (file && videoDuration > 0) || (initial?.kind === 'video' && initial.src?.trim() && !file),
  )
  const canSave = isVideo ? canSaveVideo : canSaveImage

  function onPick(next: File | null) {
    if (!next) return
    setError('')
    const kind: MediaKind = isCover || !next.type.startsWith('video/') ? 'image' : 'video'
    setMediaKind(kind)
    setFile(next)
    setPreview(URL.createObjectURL(next))
    setPosterSrc(null)
    setVideoDuration(0)
    setVideoTrim({ start: 0, end: 0 })
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      if (isVideo) {
        if (file) {
          const uploadFile = await prepareVideoForUpload(file, videoTrim, videoDuration)
          const blobUrl = URL.createObjectURL(uploadFile)
          const poster = await videoPosterDataUrl(uploadFile, 0)
          onSave({
            id: initial?.id ?? newPhotoId(),
            src: blobUrl,
            kind: 'video',
            posterSrc: poster,
            file: uploadFile,
          })
        } else if (initial?.src?.trim()) {
          onSave({
            id: initial.id,
            src: initial.src,
            kind: 'video',
            posterSrc: initial.posterSrc ?? posterSrc,
            file: null,
          })
        } else {
          setError('Pick a video first.')
          return
        }
      } else {
        onSave({
          id: initial?.id ?? newPhotoId(),
          src: preview!.trim(),
          kind: 'image',
          posterSrc: null,
          file,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save media.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="listing-photos-sheet" role="dialog" aria-modal="true" aria-labelledby="listing-photos-sheet-title">
      <button type="button" className="listing-photos-sheet__backdrop" aria-label="Close" onClick={onClose} />
      <div className="listing-photos-sheet__panel">
        <header className="listing-photos-sheet__head">
          <h2 id="listing-photos-sheet-title">{title}</h2>
          <button type="button" className="listing-photos-sheet__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        {isVideo ? (
          <div className="listing-media-studio">
            {preview ? (
              <>
                <MediaPreview
                  frameRef={frameRef}
                  preview={preview}
                  mediaKind="video"
                  filter="original"
                  crop={{ aspect: '16:9', zoom: 1, offsetX: 0, offsetY: 0 }}
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
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  />
                  Replace video
                </label>
                <CreateToolDock active="trim" onChange={() => {}} showTrim include={['trim']} />
                <video
                  src={preview}
                  className="visually-hidden"
                  onLoadedMetadata={(event) => {
                    const duration = event.currentTarget.duration || 0
                    setVideoDuration(duration)
                    setVideoTrim({ start: 0, end: duration })
                  }}
                />
                <VideoTrimBar
                  value={videoTrim}
                  duration={videoDuration}
                  onChange={setVideoTrim}
                  previewUrl={preview}
                />
              </>
            ) : (
              <MediaPicker mediaKind="video" onMediaKindChange={() => {}} onPick={onPick} />
            )}
          </div>
        ) : isCover || preview || initial ? (
          <MediaCoverEditor
            label=""
            value={preview}
            onChange={setPreview}
            onFileReady={setFile}
            initialFile={file}
            defaultAspect="16:9"
            imagesOnly
          />
        ) : (
          <MediaPicker
            mediaKind={mediaKind}
            onMediaKindChange={(kind) => {
              setMediaKind(kind)
              setPreview(null)
              setFile(null)
            }}
            onPick={onPick}
          />
        )}

        {error ? (
          <p className="listing-media-studio__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="listing-photos-sheet__foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSave()} disabled={!canSave || saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
