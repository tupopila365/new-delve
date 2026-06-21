type Chip = {
  id: string
  label: string
}

type Props = {
  chips: Chip[]
  active: string
  onChange: (id: string) => void
  ariaLabel?: string
}

export function ProviderUiChips({ chips, active, onChange, ariaLabel }: Props) {
  return (
    <div className="prov-ui__chips" role="group" aria-label={ariaLabel}>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`prov-ui__chip${active === c.id ? ' prov-ui__chip--active' : ''}`}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}
