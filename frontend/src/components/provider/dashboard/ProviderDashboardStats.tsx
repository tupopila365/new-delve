import { ProviderUiStats } from '../ui'

type Stat = {
  value: string | number
  label: string
  highlight?: boolean
}

type Props = {
  stats: Stat[]
}

export function ProviderDashboardStats({ stats }: Props) {
  return (
    <ProviderUiStats
      columns={4}
      stats={stats.map((s) => ({
        value: s.value,
        label: s.label,
        accent: s.highlight,
      }))}
    />
  )
}
