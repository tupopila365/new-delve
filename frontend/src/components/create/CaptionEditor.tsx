import { CAPTION_PRESETS } from './types'
import type { CaptionPosition } from './types'

type Props = {
  value: string
  onChange: (value: string) => void
  onPositionPreset: (position: CaptionPosition) => void
  region: string
  onRegionChange: (value: string) => void
  maxLength?: number
}

export function CaptionEditor({
  value,
  onChange,
  onPositionPreset,
  region,
  onRegionChange,
  maxLength = 220,
}: Props) {
  return (
    <div className="create-panel">
      <p className="create-panel__title">Caption</p>
      <textarea
        className="create-panel__textarea"
        rows={3}
        value={value}
        maxLength={maxLength}
        placeholder="Write a caption travellers will feel…"
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="create-panel__meta">
        {value.length}/{maxLength} · drag caption on preview
      </p>
      <div className="create-caption-presets" role="group" aria-label="Caption position">
        {CAPTION_PRESETS.map((item) => (
          <button key={item.label} type="button" onClick={() => onPositionPreset(item.position)}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="create-panel__field">
        <span>Place</span>
        <input value={region} onChange={(event) => onRegionChange(event.target.value)} placeholder="City or region" />
      </label>
    </div>
  )
}
