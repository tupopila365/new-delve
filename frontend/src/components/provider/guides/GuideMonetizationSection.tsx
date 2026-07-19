import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, Sparkles } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { ProviderUiStats } from '../ui'
import '../../events/event-detail.css'

export type GuideMonetizationAnalytics = {
  days: number
  total_bookings: number
  confirmed_bookings: number
  completed_tours: number
  pending_requests: number
  revenue: string
  total_saves: number
  rating_avg: number
  rating_count: number
  promotion_impressions: number
  promotion_clicks: number
  promotion_listing_opens: number
  profiles: {
    id: number
    headline: string
    bookings: number
    confirmed_bookings: number
    completed_tours: number
    saves_count: number
    revenue: string
    rating_avg: number
    rating_count: number
    packages_count: number
    is_active: boolean
  }[]
}

type Props = {
  enabled: boolean
  canManage?: boolean
}

function formatRevenue(value?: string) {
  const n = Number.parseFloat(value ?? '0')
  if (!Number.isFinite(n) || n <= 0) return 'N$0'
  return `N$${n.toLocaleString('en-NA', { maximumFractionDigits: 0 })}`
}

export function GuideMonetizationSection({ enabled, canManage = false }: Props) {
  const { data: analytics } = useQuery({
    queryKey: ['guide-provider-analytics'],
    queryFn: () => apiFetch<GuideMonetizationAnalytics>('/api/guides/provider-analytics/?days=30'),
    enabled,
  })

  if (!enabled) return null

  return (
    <section className="ev-monetization">
      <h2 className="prov-ui__section-title">
        <BarChart3 size={18} strokeWidth={2.25} aria-hidden />
        {' '}
        Monetization · 30 days
      </h2>
      <ProviderUiStats
        stats={[
          { value: analytics?.confirmed_bookings ?? 0, label: 'Confirmed tours' },
          { value: analytics?.completed_tours ?? 0, label: 'Completed tours' },
          { value: analytics?.pending_requests ?? 0, label: 'Pending requests' },
          { value: formatRevenue(analytics?.revenue), label: 'Revenue' },
        ]}
        columns={4}
      />

      <ProviderUiStats
        stats={[
          { value: analytics?.total_saves ?? 0, label: 'Profile saves' },
          {
            value: analytics?.rating_count
              ? `${(analytics.rating_avg ?? 0).toFixed(1)}`
              : '—',
            label: analytics?.rating_count
              ? `${analytics.rating_count} review${analytics.rating_count === 1 ? '' : 's'} · avg rating`
              : 'Reviews',
          },
          {
            value: analytics?.promotion_impressions ?? 0,
            label: 'Promo impressions',
          },
          {
            value: analytics?.promotion_clicks ?? 0,
            label: 'Promo clicks',
          },
        ]}
        columns={4}
      />

      {(analytics?.promotion_impressions ?? 0) > 0 ? (
        <p className="ev-monetization__hint">
          Promotions: {analytics?.promotion_impressions ?? 0} impressions ·{' '}
          {analytics?.promotion_clicks ?? 0} clicks · {analytics?.promotion_listing_opens ?? 0}{' '}
          listing opens
        </p>
      ) : null}

      {analytics?.profiles?.length ? (
        <div className="ev-monetization__table-wrap">
          <table className="ev-monetization__table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Bookings</th>
                <th>Completed</th>
                <th>Saves</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {analytics.profiles.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.headline}
                    {!row.is_active ? ' (draft)' : ''}
                  </td>
                  <td>{row.bookings}</td>
                  <td>{row.completed_tours || '—'}</td>
                  <td>{row.saves_count || '—'}</td>
                  <td>{formatRevenue(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canManage ? (
        <div className="ev-monetization__templates-head">
          <p className="ev-monetization__hint">
            Boost your guide on the homepage guides rail or category spotlight from promotions.
          </p>
          <Link to="/provider/promotions" className="btn btn-primary btn-sm">
            <Sparkles size={14} aria-hidden />
            Manage promotions
          </Link>
        </div>
      ) : null}
    </section>
  )
}
