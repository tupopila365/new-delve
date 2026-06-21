import type { FunnelStep } from '../../../data/providerAnalytics'

type Props = {
  steps: FunnelStep[]
}

export function ProviderAnalyticsFunnel({ steps }: Props) {
  return (
    <section className="prov-analytics__card">
      <h2 className="prov-analytics__card-title">Conversion funnel</h2>
      <div className="prov-analytics__funnel">
        {steps.map((step) => (
          <div key={step.id} className="prov-analytics__funnel-step">
            <div className="prov-analytics__funnel-copy">
              <strong>{step.label}</strong>
              <span>
                {step.value.toLocaleString()} · {step.pct}% of profile views
              </span>
            </div>
            <div className="prov-analytics__funnel-bar" aria-hidden>
              <i style={{ width: `${step.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
