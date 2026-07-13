import { ImagePlus, Images, Video } from 'lucide-react'
import type { MediaKind } from './types'

type Props = {
  mediaKind: MediaKind
  onMediaKindChange: (kind: MediaKind) => void
  onPick: (file: File | null) => void
  /** Called with all picked files when `multiple` is set. */
  onPickMany?: (files: File[]) => void
  imagesOnly?: boolean
  /** Allow selecting several files at once (carousel posts). */
  multiple?: boolean
  /** Allow photos and videos in a single pick (hides the type toggle). */
  allowMixed?: boolean
  maxFiles?: number
}

export function MediaPicker({
  mediaKind,
  onMediaKindChange,
  onPick,
  onPickMany,
  imagesOnly = false,
  multiple = false,
  allowMixed = false,
  maxFiles,
}: Props) {
  const accept = allowMixed
    ? 'image/*,video/mp4,video/webm,video/quicktime'
    : mediaKind === 'video'
      ? 'video/mp4,video/webm,video/quicktime'
      : 'image/*'

  const showToggle = !imagesOnly && !allowMixed

  return (
    <div className="create-media-picker">
      {showToggle ? (
        <div className="create-media-picker__toggle" role="tablist" aria-label="Media type">
          <button
            type="button"
            role="tab"
            aria-selected={mediaKind === 'image'}
            className={mediaKind === 'image' ? 'is-active' : ''}
            onClick={() => onMediaKindChange('image')}
          >
            Photo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mediaKind === 'video'}
            className={mediaKind === 'video' ? 'is-active' : ''}
            onClick={() => onMediaKindChange('video')}
          >
            Video
          </button>
        </div>
      ) : null}

      <label className="create-media-picker__drop">
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            if (multiple && onPickMany) {
              onPickMany(files)
            } else {
              onPick(files[0] ?? null)
            }
            event.target.value = ''
          }}
        />
        {allowMixed ? (
          <Images size={34} strokeWidth={1.75} aria-hidden />
        ) : mediaKind === 'video' ? (
          <Video size={34} strokeWidth={1.75} aria-hidden />
        ) : (
          <ImagePlus size={34} strokeWidth={1.75} aria-hidden />
        )}
        <strong>
          {allowMixed
            ? 'Tap to add photos or videos'
            : `Tap to add ${mediaKind === 'video' ? 'video' : 'photo'}`}
        </strong>
        <span>
          {allowMixed && maxFiles
            ? `Pick up to ${maxFiles} · edit each with filters, crop, and more`
            : 'Then edit with filters, crop, caption, and trim'}
        </span>
      </label>
    </div>
  )
}
