import { Minus, Plus, Users } from 'lucide-react'

type Props = {
  id?: string
  label?: string
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  hint?: string
  className?: string
}

export function BookingGuestSelector({
  id = 'bk-guests',
  label = 'Guests',
  value,
  min = 1,
  max,
  onChange,
  hint,
  className = '',
}: Props) {
  return (
    <div className={`bk-guests field ${className}`.trim()}>
      <span className="label bk-guests__label" id={`${id}-label`}>
        <Users size={14} strokeWidth={2.25} aria-hidden />
        {label}
      </span>
      <div className="bk-guests__stepper" role="group" aria-labelledby={`${id}-label`}>
        <button
          type="button"
          className="bk-guests__btn"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus size={16} strokeWidth={2.5} aria-hidden />
        </button>
        <span className="bk-guests__value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="bk-guests__btn"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
      {hint ? <p className="bk-guests__hint">{hint}</p> : null}
    </div>
  )
}
