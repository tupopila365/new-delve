type Stat = {
  value: string | number
  label: string
  accent?: boolean
}

type Props = {
  stats: Stat[]
}

export function ProviderStatGrid({ stats }: Props) {
  return (
    <div className="prov-page__stats">
      {stats.map((s) => (
        <div key={s.label} className={`prov-page__stat${s.accent ? ' prov-page__stat--accent' : ''}`}>
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
