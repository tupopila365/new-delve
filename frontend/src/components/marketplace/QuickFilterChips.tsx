import type { LucideIcon } from 'lucide-react'

type Chip = {
  id: string
  label: string
  emoji?: string
  Icon?: LucideIcon
  active?: boolean
}

type Props = {
  chips: Chip[]
  onChipClick: (id: string) => void
  ariaLabel?: string
  className?: string
}

export function QuickFilterChips({ chips, onChipClick, ariaLabel = 'Quick filters', className = '' }: Props) {
  return (
    <div className={`mk-chip-row ${className}`.trim()} role="group" aria-label={ariaLabel}>
      {chips.map((chip) => {
        const Icon = chip.Icon
        return (
          <button
            key={chip.id}
            type="button"
            className={`acc-quick-chip mk-chip${chip.active ? ' acc-quick-chip--active mk-chip--active' : ''}`}
            onClick={() => onChipClick(chip.id)}
            aria-pressed={chip.active ?? false}
          >
            {Icon ? (
              <Icon className="acc-quick-chip__icon" size={15} strokeWidth={2.25} aria-hidden />
            ) : chip.emoji ? (
              <span className="acc-quick-chip__emoji" aria-hidden>
                {chip.emoji}
              </span>
            ) : null}
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
