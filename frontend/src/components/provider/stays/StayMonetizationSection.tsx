import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, Sparkles } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { ProviderUiStats } from '../ui'

export type StayMonetizationAnalytics = {
  days: number
  on_platform_revenue: number
  total_bookings: number
  confirmed_bookings: number
  pending_requests: number
  total_likes: number
  total_saves: number
  promotion_impressions: number
  promotion_clicks: number
  promotion_listing_opens: number
  listings: {
    id: number
    title: string
    bookings: number
    confirmed_bookings: number
    revenue: number
    likes_count: number
    saves_count: number
  }[]
}

type Props = {
  enabled: boolean
  canManage?: boolean
}

export function StayMonetizationSection({ enabled, canManage = false }: Props) {
  const { data: analytics } = useQuery({
    queryKey: ['stay-provider-analytics'],
    queryFn: () => apiFetch<StayMonetizationAnalytics>('/api/accommodation/provider-analytics/?days=30'),
    enabled,
  })

  if (!enabled) return null

  return (
    <section className="ev-monetization adm-section">
      <h2 className="adm-section__title">
        <BarChart3 size={18} strokeWidth={2.25} aria-hidden />
        Monetization · 30 days
      </h2>
      <ProviderUiStats
        stats={[
          { value: `N$${(analytics?.on_platform_revenue ?? 0).toFixed(0)}`, label: 'Stay revenue' },
          { value: analytics?.confirmed_bookings ?? 0, label: 'Confirmed stays' },
          { value: analytics?.pending_requests ?? 0, label: 'Pending requests' },
          {
            value: (analytics?.total_likes ?? 0) + (analytics?.total_saves ?? 0),
            label: 'Likes & saves',
          },
        ]}
        columns={4}
      />

      {(analytics?.promotion_impressions ?? 0) > 0 ? (
        <p className="ev-monetization__hint">
          Promotions: {analytics?.promotion_impressions ?? 0} impressions · {analytics?.promotion_clicks ?? 0}{' '}
          clicks · {analytics?.promotion_listing_opens ?? 0} listing opens
        </p>
      ) : null}

      {analytics?.listings?.length ? (
        <div className="ev-monetization__table-wrap">
          <table className="ev-monetization__table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Revenue</th>
                <th>Bookings</th>
                <th>Likes</th>
                <th>Saves</th>
              </tr>
            </thead>
            <tbody>
              {analytics.listings.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.revenue > 0 ? `N$${row.revenue.toFixed(0)}` : '—'}</td>
                  <td>{row.bookings}</td>
                  <td>{row.likes_count || '—'}</td>
                  <td>{row.saves_count || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canManage ? (
        <div className="ev-monetization__templates-head">
          <p className="ev-monetization__hint">
            Boost a stay on the homepage rail or category hero spotlight from promotions.
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
