import { CROP_ASPECTS, type CropAspect, type CropSettings } from './types'

type Props = {
  value: CropSettings
  onChange: (next: CropSettings) => void
  disabled?: boolean
}

export function CropControls({ value, onChange, disabled }: Props) {
  if (disabled) {
    return (
      <div className="create-panel">
        <p className="create-panel__title">Crop</p>
        <p className="create-panel__hint">Crop works on photos. Pick a photo to adjust framing.</p>
      </div>
    )
  }

  const setAspect = (aspect: CropAspect) => onChange({ ...value, aspect })

  return (
    <div className="create-panel">
      <p className="create-panel__title">Crop &amp; zoom</p>
      <div className="create-crop-aspects" role="group" aria-label="Aspect ratio">
        {CROP_ASPECTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={value.aspect === item.id ? 'is-active' : ''}
            onClick={() => setAspect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="create-slider">
        <span>Zoom</span>
        <input
          type="range"
          min={1}
          max={2.5}
          step={0.05}
          value={value.zoom}
          onChange={(event) => onChange({ ...value, zoom: Number(event.target.value) })}
        />
      </label>
      <label className="create-slider">
        <span>Move left / right</span>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={value.offsetX}
          onChange={(event) => onChange({ ...value, offsetX: Number(event.target.value) })}
        />
      </label>
      <label className="create-slider">
        <span>Move up / down</span>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={value.offsetY}
          onChange={(event) => onChange({ ...value, offsetY: Number(event.target.value) })}
        />
      </label>
    </div>
  )
}
