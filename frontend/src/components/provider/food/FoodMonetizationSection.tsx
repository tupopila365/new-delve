import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart3, Sparkles } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { ProviderUiStats } from '../ui'

export type FoodMonetizationAnalytics = {
  days: number
  total_reservations: number
  confirmed_reservations: number
  pending_requests: number
  seated_visits: number
  total_saves: number
  total_reviews: number
  promotion_impressions: number
  promotion_clicks: number
  promotion_listing_opens: number
  venues: {
    id: number
    name: string
    reservations: number
    confirmed_reservations: number
    seated_visits: number
    saves_count: number
    reviews_count: number
    rating_avg: number
  }[]
}

type Props = {
  enabled: boolean
  canManage?: boolean
}

export function FoodMonetizationSection({ enabled, canManage = false }: Props) {
  const { data: analytics } = useQuery({
    queryKey: ['food-provider-analytics'],
    queryFn: () => apiFetch<FoodMonetizationAnalytics>('/api/food/provider-analytics/?days=30'),
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
          { value: analytics?.confirmed_reservations ?? 0, label: 'Confirmed tables' },
          { value: analytics?.seated_visits ?? 0, label: 'Seated visits' },
          { value: analytics?.pending_requests ?? 0, label: 'Pending requests' },
          {
            value: (analytics?.total_saves ?? 0) + (analytics?.total_reviews ?? 0),
            label: 'Saves & reviews',
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

      {analytics?.venues?.length ? (
        <div className="ev-monetization__table-wrap">
          <table className="ev-monetization__table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Reservations</th>
                <th>Seated</th>
                <th>Saves</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {analytics.venues.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.reservations}</td>
                  <td>{row.seated_visits || '—'}</td>
                  <td>{row.saves_count || '—'}</td>
                  <td>{row.reviews_count || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {canManage ? (
        <div className="ev-monetization__templates-head">
          <p className="ev-monetization__hint">
            Boost a venue on the homepage food rail or category spotlight from promotions.
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
