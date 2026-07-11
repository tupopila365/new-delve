import { MEDIA_FILTERS, type MediaFilter } from './types'
import { cssFilterForMedia } from './mediaUtils'

type Props = {
  value: MediaFilter
  onChange: (filter: MediaFilter) => void
  intensity: number
  onIntensityChange: (value: number) => void
  previewUrl?: string | null
  hasMedia?: boolean
}

export function FilterStrip({ value, onChange, intensity, onIntensityChange, previewUrl, hasMedia }: Props) {

  return (
    <div className="create-panel">
      <p className="create-panel__title">Filters</p>

      <div className="create-filter-strip" role="list" aria-label="Photo filters">
        {MEDIA_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className={`create-filter-strip__btn ${value === item.id ? 'is-active' : ''}`}
            onClick={() => onChange(item.id as MediaFilter)}
          >
            <span className="create-filter-strip__thumb" aria-hidden>
              {previewUrl && hasMedia ? (
                <img
                  src={previewUrl}
                  alt=""
                  className={`create-filter-strip__img ${item.id !== 'original' ? `create-media__asset--${item.id}` : ''}`}
                  style={{ filter: cssFilterForMedia(item.id, 100) }}
                />
              ) : (
                <span className={`create-filter-strip__dot create-filter-strip__dot--${item.id}`} />
              )}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Filter intensity slider (only shown when a non-original filter is selected) */}
      {value !== 'original' ? (
        <label className="create-slider">
          <span>
            Intensity{intensity < 100 ? ` · ${intensity}%` : ''}
            {intensity < 100 ? (
              <button
                type="button"
                className="create-slider__reset"
                onClick={() => onIntensityChange(100)}
              >
                Reset
              </button>
            ) : null}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={intensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
          />
        </label>
      ) : (
        <p className="create-panel__hint">Tap a filter to apply, then adjust its strength.</p>
      )}
    </div>
  )
}