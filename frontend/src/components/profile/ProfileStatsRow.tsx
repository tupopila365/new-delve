import './ProfileStatsRow.css'

type Stat = {
  label: string
  value: string | number
}

type Props = {
  stats: Stat[]
  blocked?: boolean
}

export function ProfileStatsRow({ stats, blocked = false }: Props) {
  return (
    <div className="profile-stats" role="group" aria-label="Profile stats">
      {stats.map((stat) => (
        <div key={stat.label} className="profile-stats__item">
          <strong>{blocked ? '—' : stat.value}</strong>
          <span>{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
