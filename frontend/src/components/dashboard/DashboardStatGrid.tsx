import { Link } from 'react-router-dom'

type Stat = {
  value: string | number
  label: string
  accent?: boolean
  to?: string
}

type Props = {
  stats: Stat[]
  className?: string
}

export function DashboardStatGrid({ stats, className = '' }: Props) {
  return (
    <div className={`dash-stat-grid ${className}`.trim()}>
      {stats.map((s) => {
        const inner = (
          <>
            <strong className="dash-stat-grid__value">{s.value}</strong>
            <span className="dash-stat-grid__label">{s.label}</span>
          </>
        )
        const cls = `dash-stat-grid__card${s.accent ? ' dash-stat-grid__card--accent' : ''}`
        if (s.to) {
          return (
            <Link key={s.label} to={s.to} className={cls}>
              {inner}
            </Link>
          )
        }
        return (
          <div key={s.label} className={cls}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
