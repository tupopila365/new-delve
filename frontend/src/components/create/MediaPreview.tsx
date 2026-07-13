import type { KeyboardEvent, PointerEvent, RefObject } from 'react'
import type { CaptionPosition, CropSettings, MediaFilter, MediaKind } from './types'
import { aspectRatioValue, clamp, filterClassName } from './mediaUtils'
import { useCropStage } from './useCropStage'

type Props = {
  frameRef: RefObject<HTMLDivElement | null>
  preview: string | null
  mediaKind: MediaKind
  filter: MediaFilter
  crop: CropSettings
  caption: string
  captionPosition: CaptionPosition
  captionDragging: boolean
  onCaptionPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onCaptionPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onCaptionPointerUp: (event: PointerEvent<HTMLDivElement>) => void
  onCaptionKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  mode: 'post' | 'story'
  showCaptionOverlay?: boolean
  /** Enable drag-to-reposition / pinch-to-zoom cropping (photos only). */
  cropInteractive?: boolean
  onCropChange?: (next: CropSettings) => void
  videoRef?: RefObject<HTMLVideoElement | null>
  onVideoTimeUpdate?: () => void
  onVideoPlay?: () => void
  /** Inline CSS filter (intensity + adjustments). Overrides the preset class. */
  filterStyle?: string
}

export function MediaPreview({
  frameRef,
  preview,
  mediaKind,
  filter,
  crop,
  caption,
  captionPosition,
  captionDragging,
  onCaptionPointerDown,
  onCaptionPointerMove,
  onCaptionPointerUp,
  onCaptionKeyDown,
  mode,
  showCaptionOverlay = true,
  cropInteractive = false,
  onCropChange,
  videoRef,
  onVideoTimeUpdate,
  onVideoPlay,
  filterStyle,
}: Props) {
  const ratio = aspectRatioValue(crop.aspect)

  const interactive = cropInteractive && mediaKind === 'image' && Boolean(onCropChange)
  const { transform, dragging, naturalRatio, onImageLoad, onVideoLoad, stageHandlers } = useCropStage({
    crop,
    onChange: onCropChange ?? (() => {}),
    frameRef,
    enabled: interactive,
  })

  const frameStyle = ratio
    ? { aspectRatio: String(ratio) }
    : naturalRatio
      ? { aspectRatio: String(naturalRatio) }
      : mode === 'story'
        ? { aspectRatio: '9 / 16' }
        : { aspectRatio: '4 / 5' }

  const mediaStyle = filterStyle ? { transform, filter: filterStyle } : { transform }
  const filterClass = filterStyle ? '' : filterClassName(filter)

  const captionText = caption.trim() || 'Tap caption to edit'

  return (
    <div className="create-media" style={frameStyle}>
      <div
        ref={frameRef}
        className={`create-media__frame${interactive ? ' create-media__frame--croppable' : ''}${interactive && dragging ? ' is-dragging' : ''}`}
        {...(interactive ? stageHandlers : {})}
      >
        {preview && mediaKind === 'image' ? (
          <img
            src={preview}
            alt=""
            className={`create-media__asset ${filterClass}`}
            style={mediaStyle}
            draggable={false}
            onLoad={(event) => onImageLoad(event.currentTarget)}
          />
        ) : null}
        {preview && mediaKind === 'video' ? (
          <video
            ref={videoRef}
            src={preview}
            className={`create-media__asset ${filterClass}`}
            style={mediaStyle}
            muted
            playsInline
            controls
            onLoadedMetadata={(event) => onVideoLoad(event.currentTarget)}
            onTimeUpdate={onVideoTimeUpdate}
            onPlay={onVideoPlay}
          />
        ) : null}

        {interactive ? (
          <div className="create-media__cropgrid" aria-hidden>
            <span /><span /><span /><span />
          </div>
        ) : null}

        {preview && showCaptionOverlay ? (
          <div
            className={`create-media__caption${captionDragging ? ' is-dragging' : ''}`}
            style={{ left: `${captionPosition.x}%`, top: `${captionPosition.y}%` }}
            role="button"
            tabIndex={0}
            aria-label="Drag caption"
            onPointerDown={onCaptionPointerDown}
            onPointerMove={onCaptionPointerMove}
            onPointerUp={onCaptionPointerUp}
            onPointerCancel={onCaptionPointerUp}
            onKeyDown={onCaptionKeyDown}
          >
            {captionText}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function nudgeCaptionPosition(
  position: CaptionPosition,
  dx: number,
  dy: number,
): CaptionPosition {
  return {
    x: clamp(position.x + dx, 9, 91),
    y: clamp(position.y + dy, 9, 91),
  }
}

export function captionPositionFromPointer(
  frame: HTMLDivElement,
  clientX: number,
  clientY: number,
): CaptionPosition {
  const rect = frame.getBoundingClientRect()
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 100, 9, 91),
    y: clamp(((clientY - rect.top) / rect.height) * 100, 9, 91),
  }
}
