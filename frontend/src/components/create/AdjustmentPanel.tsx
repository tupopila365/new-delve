import { Sparkles } from 'lucide-react'
import { ADJUSTMENT_LABELS, type Adjustments } from './types'

type Props = {
  value: Adjustments
  onChange: (next: Adjustments) => void
  onCommit?: () => void
  onAutoEnhance: () => void
  autoEnhanceBusy: boolean
  hasAutoEnhance: boolean
}

const KEYS = ['brightness', 'contrast', 'saturation', 'warmth', 'sharpen'] as const

export function AdjustmentPanel({
  value,
  onChange,
  onCommit,
  onAutoEnhance,
  autoEnhanceBusy,
  hasAutoEnhance,
}: Props) {
  const update = (key: keyof Adjustments, val: number) => {
    onChange({ ...value, [key]: val })
  }

  const resetAll = () => {
    onChange({ brightness: 100, contrast: 100, saturation: 100, warmth: 100, sharpen: 0 })
    onCommit?.()
  }

  const isDefault =
    value.brightness === 100 &&
    value.contrast === 100 &&
    value.saturation === 100 &&
    value.warmth === 100 &&
    value.sharpen === 0

  return (
    <div className="create-panel create-panel--adjust">
      <div className="create-panel__header">
        <p className="create-panel__title">Adjust</p>
        <div className="create-panel__header-actions">
          {!isDefault ? (
            <button type="button" className="create-panel__reset" onClick={resetAll}>
              Reset
            </button>
          ) : null}
          <button
            type="button"
            className={`create-panel__auto${hasAutoEnhance ? ' is-active' : ''}`}
            onClick={onAutoEnhance}
            disabled={autoEnhanceBusy}
            aria-label="Auto-enhance photo"
          >
            <Sparkles size={14} strokeWidth={2.5} aria-hidden />
            {autoEnhanceBusy ? 'Analysing…' : hasAutoEnhance ? 'Enhanced' : 'Auto'}
          </button>
        </div>
      </div>

      <div className="create-adjust-list">
        {KEYS.map((key) => {
          const label = ADJUSTMENT_LABELS[key]
          const min = key === 'sharpen' ? 0 : 0
          const max = 200
          const current = value[key]

          return (
            <label key={key} className="create-adjust-slider">
              <span className="create-adjust-slider__label">
                {label}
                <span className="create-adjust-slider__value">{current}</span>
              </span>
              <span className="create-adjust-slider__track">
                <span
                  className="create-adjust-slider__fill"
                  style={{ width: `${(current / max) * 100}%` }}
                />
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={current}
                  onChange={(e) => update(key, Number(e.target.value))}
                  onPointerUp={onCommit}
                  onKeyUp={onCommit}
                  className="create-adjust-slider__input"
                />
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}