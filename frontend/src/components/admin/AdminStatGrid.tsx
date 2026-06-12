type Stat = {
  value: string | number
  label: string
  accent?: boolean
  warn?: boolean
}

type Props = {
  stats: Stat[]
}

export function AdminStatGrid({ stats }: Props) {
  return (
    <div className="adm-stat-grid">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`adm-stat-grid__card${s.accent ? ' adm-stat-grid__card--accent' : ''}${s.warn ? ' adm-stat-grid__card--warn' : ''}`}
        >
          <strong>{s.value}</strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
