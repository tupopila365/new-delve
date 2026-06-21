import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { PromotionAnalyticsSummary } from '../api/types'
import {
  DelveAdminDataRow,
  DelveAdminEmpty,
  DelveAdminError,
  DelveAdminFunnelChart,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
  DelveAdminStatGrid,
  DelveAdminStatusBadge,
} from '../components'

const PERIODS = [7, 30, 90] as const

export function PromotionsAnalyticsPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promotion-analytics', days],
    queryFn: () => apiFetch<PromotionAnalyticsSummary>(`/api/accounts/admin/promotions/analytics/?days=${days}`),
  })

  const funnelSteps = useMemo(() => {
    if (!data) return []
    return data.funnel.map((step, i) => ({
      label: step.label,
      value: step.value,
      color: ['#6366f1', '#8b5cf6', '#a855f7', '#22c55e'][i] ?? '#6b7280',
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Promotion analytics" subtitle="Impressions, CTR, and conversion by campaign." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Promotion analytics" subtitle="Impressions, CTR, and conversion by campaign." />
        <DelveAdminError message="Could not load promotion analytics." onRetry={() => void refetch()} />
      </div>
    )
  }

  const t = data.totals

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Promotion analytics"
        subtitle={`Last ${days} days — engagement-weighted ranking demotes poor CTR paid slots.`}
        action={
          <Link to="/admin/promotions/analytics" className="da-btn da-btn--ghost">
            View analytics
          </Link>
        }
      />

      <div className="da-filter-row">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={`da-chip${days === p ? ' da-chip--active' : ''}`}
            onClick={() => setDays(p)}
          >
            {p} days
          </button>
        ))}
      </div>

      <DelveAdminStatGrid
        stats={[
          { label: 'Impressions', value: t.impressions.toLocaleString() },
          { label: 'CTR', value: `${t.ctr_pct}%` },
          { label: 'Bookings (proxy)', value: String(t.bookings) },
          {
            label: 'Paid revenue',
            value: t.revenue_cents ? `N$${(t.revenue_cents / 100).toLocaleString()}` : '—',
          },
          { label: 'Underperforming', value: String(t.underperforming) },
        ]}
      />

      <div className="da-grid da-grid--2">
        <DelveAdminPanel title="Conversion funnel">
          <DelveAdminFunnelChart title="Promotion funnel" steps={funnelSteps} />
          <p className="da-panel__hint">
            Impressions → clicks → listing opens → confirmed bookings during each campaign window.
          </p>
        </DelveAdminPanel>

        <DelveAdminPanel title="Impressions by placement">
          {data.by_placement.length ? (
            <ul className="da-stack">
              {data.by_placement.map((row) => (
                <li key={row.placement} className="da-mini-row">
                  <strong>{row.label}</strong>
                  <span>
                    {row.impressions.toLocaleString()} imp · {row.ctr_pct}% CTR · {row.bookings} bookings
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <DelveAdminEmpty title="No data yet" message="Tracking starts when featured cards are viewed." />
          )}
        </DelveAdminPanel>
      </div>

      <DelveAdminPanel title="Campaign performance">
        {data.campaigns.length === 0 ? (
          <DelveAdminEmpty title="No campaigns" message="Active or recent campaigns will appear here." />
        ) : (
          <div className="da-stack">
            {data.campaigns.map((row) => (
              <DelveAdminDataRow
                key={row.id}
                primary={row.target_label}
                secondary={`${row.placement_label} · ${row.region} · ${row.impressions.toLocaleString()} imp · ${row.ctr_pct}% CTR · ${row.bookings} bookings · priority ${row.priority} → effective ${row.effective_priority}`}
                badge={
                  <>
                    <DelveAdminStatusBadge status={row.status_label} variant={row.status === 'active' ? 'success' : 'neutral'} />
                    {row.underperforming ? (
                      <DelveAdminStatusBadge status="Low CTR" variant="danger" />
                    ) : null}
                  </>
                }
              />
            ))}
          </div>
        )}
      </DelveAdminPanel>
    </div>
  )
}
