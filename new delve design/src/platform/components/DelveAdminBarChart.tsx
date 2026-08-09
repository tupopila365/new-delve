type Point = {
  date: string
  count: number
}

type Props = {
  title: string
  points: Point[]
  color?: string
  height?: number
}

function formatLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function DelveAdminBarChart({ title, points, color = '#ff9a52', height = 160 }: Props) {
  const max = Math.max(1, ...points.map((p) => p.count))
  const barW = points.length > 0 ? 100 / points.length : 100

  return (
    <div className="da-chart">
      <h3 className="da-chart__title">{title}</h3>
      {points.length === 0 ? (
        <p className="da-chart__empty">No data for this period.</p>
      ) : (
        <>
          <svg
            className="da-chart__svg"
            viewBox={`0 0 100 ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={title}
          >
            {points.map((p, i) => {
              const h = (p.count / max) * (height - 20)
              const x = i * barW + barW * 0.15
              const w = barW * 0.7
              return (
                <rect
                  key={p.date}
                  x={x}
                  y={height - h - 4}
                  width={w}
                  height={Math.max(h, p.count > 0 ? 2 : 0)}
                  fill={color}
                  opacity={0.85}
                  rx={0.8}
                >
                  <title>{`${formatLabel(p.date)}: ${p.count}`}</title>
                </rect>
              )
            })}
          </svg>
          <div className="da-chart__labels" aria-hidden>
            {points.length <= 14
              ? points.map((p) => (
                  <span key={p.date} className="da-chart__label">
                    {formatLabel(p.date)}
                  </span>
                ))
              : (
                  <>
                    <span>{formatLabel(points[0].date)}</span>
                    <span>{formatLabel(points[Math.floor(points.length / 2)].date)}</span>
                    <span>{formatLabel(points[points.length - 1].date)}</span>
                  </>
                )}
          </div>
        </>
      )}
    </div>
  )
}
