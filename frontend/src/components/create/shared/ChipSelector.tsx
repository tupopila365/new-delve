import type { ReactNode } from 'react'
import './ChipSelector.css'

type Chip = {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

type Props = {
  label: string
  chips: readonly Chip[]
  selected: readonly string[]
  onChange: (values: string[]) => void
  emptyLabel?: string
  className?: string
}

export function ChipSelector({
  label,
  chips,
  selected,
  onChange,
  emptyLabel,
  className = '',
}: Props) {
  return (
    <div className={`chip-field ${className}`}>
      <label className="chip-field__label">
        {label}
        {emptyLabel && <span className="chip-field__opt">{emptyLabel}</span>}
      </label>
      <div className="chip-field__list">
        {chips.map((chip) => {
          const active = selected.includes(chip.value)
          return (
            <button
              key={chip.value}
              type="button"
              className={`chip${active ? ' chip--active active' : ''}`}
              onClick={() =>
                onChange(
                  active
                    ? selected.filter((v) => v !== chip.value)
                    : [...selected, chip.value],
                )
              }
              disabled={chip.disabled}
              aria-pressed={active}
            >
              {chip.icon && <span className="chip__icon" aria-hidden>{chip.icon}</span>}
              <span className="chip__label">{chip.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}