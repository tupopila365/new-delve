type Chip = {
  id: string
  label: string
  emoji?: string
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
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={`acc-quick-chip mk-chip${chip.active ? ' acc-quick-chip--active mk-chip--active' : ''}`}
          onClick={() => onChipClick(chip.id)}
        >
          {chip.emoji ? <span aria-hidden>{chip.emoji}</span> : null} {chip.label}
        </button>
      ))}
    </div>
  )
}
