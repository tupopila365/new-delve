import { CAPTION_PRESETS } from './types'
import type { CaptionPosition } from './types'

type Props = {
  value: string
  onChange: (value: string) => void
  /** Only used when the caption is drawn on the media (e.g. story highlights). */
  onPositionPreset?: (position: CaptionPosition) => void
  region?: string
  onRegionChange?: (value: string) => void
  maxLength?: number
  showRegion?: boolean
  /** Show on-media position presets. Off for feed posts (caption sits under the post). */
  showPositionPresets?: boolean
}

export function CaptionEditor({
  value,
  onChange,
  onPositionPreset,
  region = '',
  onRegionChange,
  maxLength = 220,
  showRegion = true,
  showPositionPresets = true,
}: Props) {
  return (
    <div className="create-panel">
      <p className="create-panel__title">Caption</p>
      {!showPositionPresets ? (
        <p className="create-panel__hint">This appears under your post, like an Instagram caption.</p>
      ) : null}
      <textarea
        className="create-panel__textarea"
        rows={3}
        value={value}
        maxLength={maxLength}
        placeholder="Write a caption travellers will feel…"
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="create-panel__meta">
        {value.length}/{maxLength}
        {showPositionPresets ? ' · drag caption on preview' : ''}
      </p>
      {showPositionPresets && onPositionPreset ? (
        <div className="create-caption-presets" role="group" aria-label="Caption position">
          {CAPTION_PRESETS.map((item) => (
            <button key={item.label} type="button" onClick={() => onPositionPreset(item.position)}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {showRegion ? (
        <label className="create-panel__field">
          <span>Place</span>
          <input
            value={region}
            onChange={(event) => onRegionChange?.(event.target.value)}
            placeholder="City or region"
          />
        </label>
      ) : null}
    </div>
  )
}
