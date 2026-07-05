import type { TrendPoint } from '../../../data/providerAnalytics'

type Props = {
  title: string
  points: TrendPoint[]
  emptyMessage?: string
}

export function ProviderAnalyticsTrendChart({ title, points, emptyMessage }: Props) {
  const total = points.reduce((sum, point) => sum + point.value, 0)
  const max = Math.max(1, ...points.map((p) => p.value))

  return (
    <section className="prov-analytics__card">
      <h2 className="prov-analytics__card-title">{title}</h2>
      {total === 0 ? (
        <p className="prov-analytics__trend-empty" role="status">
          {emptyMessage ?? 'No data for this period yet.'}
        </p>
      ) : (
        <div className="prov-analytics__trend" role="img" aria-label={`${title} chart`}>
          {points.map((point) => (
            <div key={point.label} className="prov-analytics__trend-col">
              <span className="prov-analytics__trend-value">{point.value}</span>
              <div className="prov-analytics__trend-bar-wrap">
                <div
                  className="prov-analytics__trend-bar"
                  style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
                />
              </div>
              <span className="prov-analytics__trend-label">{point.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
