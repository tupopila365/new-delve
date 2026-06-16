import type { KeyboardEvent, PointerEvent, RefObject } from 'react'
import type { CaptionPosition, CropSettings, MediaFilter, MediaKind } from './types'
import { aspectRatioValue, clamp, filterClassName } from './mediaUtils'

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
  musicLabel?: string
  mode: 'post' | 'story'
  showCaptionOverlay?: boolean
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
  musicLabel,
  mode,
  showCaptionOverlay = true,
}: Props) {
  const ratio = aspectRatioValue(crop.aspect)
  const frameStyle = ratio
    ? { aspectRatio: String(ratio) }
    : mode === 'story'
      ? { aspectRatio: '9 / 16' }
      : { aspectRatio: '4 / 5' }

  const mediaStyle = {
    transform: `scale(${crop.zoom}) translate(${crop.offsetX}%, ${crop.offsetY}%)`,
  }

  const captionText = caption.trim() || 'Tap caption to edit'

  return (
    <div className="create-media" style={frameStyle}>
      <div ref={frameRef} className="create-media__frame">
        {preview && mediaKind === 'image' ? (
          <img
            src={preview}
            alt=""
            className={`create-media__asset ${filterClassName(filter)}`}
            style={mediaStyle}
          />
        ) : null}
        {preview && mediaKind === 'video' ? (
          <video
            src={preview}
            className={`create-media__asset ${filterClassName(filter)}`}
            style={mediaStyle}
            muted
            playsInline
            controls
          />
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

        {musicLabel ? <div className="create-media__music">{musicLabel}</div> : null}
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
