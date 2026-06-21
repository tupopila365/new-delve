import type { StatItem } from '../api/types'
import { DelveAdminStatCard } from './DelveAdminStatCard'

type Props = {
  stats: StatItem[]
}

export function DelveAdminStatGrid({ stats }: Props) {
  return (
    <div className="da-stat-grid">
      {stats.map((s) => (
        <DelveAdminStatCard
          key={s.label}
          value={s.value}
          label={s.label}
          accent={s.accent}
          warn={s.warn}
        />
      ))}
    </div>
  )
}
