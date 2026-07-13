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

  // Changing the shape re-centres the pan so nothing gets stuck off-frame.
  const setAspect = (aspect: CropAspect) =>
    onChange({ ...value, aspect, offsetX: 0, offsetY: 0 })

  return (
    <div className="create-panel">
      <p className="create-panel__title">Crop</p>
      <p className="create-panel__hint">Drag the photo to reposition · pinch or scroll to zoom.</p>
      <div className="create-crop-aspects" role="group" aria-label="Crop shape">
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
          max={3}
          step={0.02}
          value={value.zoom}
          onChange={(event) => onChange({ ...value, zoom: Number(event.target.value) })}
        />
      </label>
      {(value.zoom !== 1 || value.offsetX !== 0 || value.offsetY !== 0) ? (
        <button
          type="button"
          className="create-slider__reset"
          onClick={() => onChange({ ...value, zoom: 1, offsetX: 0, offsetY: 0 })}
        >
          Reset position
        </button>
      ) : null}
    </div>
  )
}
