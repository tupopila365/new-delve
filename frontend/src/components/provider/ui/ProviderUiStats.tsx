type Stat = {
  value: string | number
  label: string
  accent?: boolean
  wide?: boolean
}

type Props = {
  stats: Stat[]
  columns?: 2 | 4
}

export function ProviderUiStats({ stats, columns = 2 }: Props) {
  return (
    <div className={`prov-ui__stats${columns === 4 ? ' prov-ui__stats--4' : ''}`}>
      {stats.map((s) => (
        <div
          key={s.label}
          className={`prov-ui__stat${s.accent ? ' prov-ui__stat--accent' : ''}${s.wide ? ' prov-ui__stat--wide' : ''}`}
        >
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
