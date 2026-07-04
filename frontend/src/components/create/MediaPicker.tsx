import { ImagePlus, Video } from 'lucide-react'
import type { MediaKind } from './types'

type Props = {
  mediaKind: MediaKind
  onMediaKindChange: (kind: MediaKind) => void
  onPick: (file: File | null) => void
}

export function MediaPicker({ mediaKind, onMediaKindChange, onPick }: Props) {
  return (
    <div className="create-media-picker">
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

      <label className="create-media-picker__drop">
        <input
          type="file"
          accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        />
        {mediaKind === 'video' ? <Video size={34} strokeWidth={1.75} aria-hidden /> : <ImagePlus size={34} strokeWidth={1.75} aria-hidden />}
        <strong>Tap to add {mediaKind === 'video' ? 'video' : 'photo'}</strong>
        <span>Then edit with filters, crop, caption, and trim</span>
      </label>
    </div>
  )
}
