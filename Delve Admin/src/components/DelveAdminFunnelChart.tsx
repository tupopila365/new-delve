type Step = {
  label: string
  value: number
  color?: string
}

type Props = {
  title: string
  steps: Step[]
}

const DEFAULT_COLORS = ['#6b7280', '#f59e0b', '#22c55e', '#ef4444']

export function DelveAdminFunnelChart({ title, steps }: Props) {
  const max = Math.max(1, ...steps.map((s) => s.value))
  const total = steps.reduce((n, s) => n + s.value, 0)

  return (
    <div className="da-funnel">
      <h3 className="da-chart__title">{title}</h3>
      {total === 0 ? (
        <p className="da-chart__empty">No verification data yet.</p>
      ) : (
        <ul className="da-funnel__list">
          {steps.map((step, i) => {
            const pct = Math.round((step.value / max) * 100)
            const share = total > 0 ? Math.round((step.value / total) * 100) : 0
            const color = step.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]
            return (
              <li key={step.label} className="da-funnel__row">
                <div className="da-funnel__head">
                  <span>{step.label}</span>
                  <span>
                    {step.value} ({share}%)
                  </span>
                </div>
                <div className="da-funnel__track">
                  <div className="da-funnel__fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
