import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { PlatformAnalytics } from '../api/types'
import {
  DelveAdminBarChart,
  DelveAdminError,
  DelveAdminFunnelChart,
  DelveAdminLoading,
  DelveAdminPageHeader,
  DelveAdminPanel,
  DelveAdminStatGrid,
} from '../components'

const PERIODS = [7, 30, 90] as const

export function AnalyticsPage() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', days],
    queryFn: () => apiFetch<PlatformAnalytics>(`/api/accounts/admin/analytics/?days=${days}`),
  })

  const funnelSteps = useMemo(() => {
    if (!data) return []
    const f = data.verification_funnel
    return [
      { label: 'Unverified', value: f.unverified, color: '#6b7280' },
      { label: 'Pending review', value: f.pending, color: '#f59e0b' },
      { label: 'Verified', value: f.verified, color: '#22c55e' },
      { label: 'Rejected / suspended', value: f.rejected, color: '#ef4444' },
    ]
  }, [data])

  if (isLoading) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Analytics" subtitle="Signups, bookings, and verification trends." />
        <DelveAdminLoading count={4} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="da-page">
        <DelveAdminPageHeader title="Analytics" subtitle="Signups, bookings, and verification trends." />
        <DelveAdminError message="Could not load analytics." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="da-page">
      <DelveAdminPageHeader
        title="Analytics"
        subtitle={`Last ${days} days — proactive platform health.`}
      />

      <div className="da-period-tabs" role="tablist" aria-label="Time period">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={days === p}
            className={days === p ? 'da-period-tabs__tab da-period-tabs__tab--active' : 'da-period-tabs__tab'}
            onClick={() => setDays(p)}
          >
            {p}d
          </button>
        ))}
      </div>

      <DelveAdminStatGrid
        stats={[
          { value: data.totals.signups, label: 'New signups' },
          { value: data.totals.bookings, label: 'Bookings' },
          { value: data.verification_funnel.pending, label: 'Pending verifications', warn: data.verification_funnel.pending > 0 },
          { value: data.verification_funnel.verified, label: 'Verified businesses', accent: true },
        ]}
      />

      <div className="da-page__split">
        <DelveAdminPanel title="Signups">
          <DelveAdminBarChart title="Daily signups" points={data.signups} color="#ff9a52" />
        </DelveAdminPanel>
        <DelveAdminPanel title="Bookings">
          <DelveAdminBarChart title="Daily bookings (all services)" points={data.bookings} color="#60a5fa" />
        </DelveAdminPanel>
      </div>

      <div className="da-page__split">
        <DelveAdminPanel title="Bookings by vertical">
          <DelveAdminStatGrid
            stats={[
              { value: data.bookings_by_vertical.stays, label: 'Stays' },
              { value: data.bookings_by_vertical.guides, label: 'Guides' },
              { value: data.bookings_by_vertical.transport, label: 'Transport' },
            ]}
          />
        </DelveAdminPanel>
        <DelveAdminPanel title="Verification funnel">
          <DelveAdminFunnelChart title="Business verification pipeline" steps={funnelSteps} />
        </DelveAdminPanel>
      </div>
    </div>
  )
}
