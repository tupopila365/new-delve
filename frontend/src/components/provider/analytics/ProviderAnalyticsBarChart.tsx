import type { CategoryMetric } from '../../../data/providerAnalytics'

type Props = {
  title: string
  rows: CategoryMetric[]
  valueSuffix?: string
}

export function ProviderAnalyticsBarChart({ title, rows, valueSuffix = '' }: Props) {
  if (rows.length === 0) {
    return (
      <section className="prov-analytics__card">
        <h2 className="prov-analytics__card-title">{title}</h2>
        <p className="prov-analytics__insight">No data for this period yet.</p>
      </section>
    )
  }

  return (
    <section className="prov-analytics__card">
      <h2 className="prov-analytics__card-title">{title}</h2>
      <ul className="prov-ui-breakdown">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <div className="prov-ui-breakdown__bar" aria-hidden>
              <i style={{ width: `${row.pct}%` }} />
            </div>
            <span>
              {row.value}
              {valueSuffix}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
