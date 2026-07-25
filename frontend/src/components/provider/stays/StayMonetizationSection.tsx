import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { apiFetch } from '../../../api/client'
import { useDisplayMoney } from '../../../hooks/useDisplayMoney'

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

/** Collapsed by default — avoids duplicating the page summary stats. */
export function StayMonetizationSection({ enabled, canManage = false }: Props) {
  const { format } = useDisplayMoney()
  const [open, setOpen] = useState(false)
  const { data: analytics } = useQuery({
    queryKey: ['stay-provider-analytics'],
    queryFn: () => apiFetch<StayMonetizationAnalytics>('/api/accommodation/provider-analytics/?days=30'),
    enabled,
  })

  if (!enabled) return null

  const likesSaves = (analytics?.total_likes ?? 0) + (analytics?.total_saves ?? 0)
  const hasPromo = (analytics?.promotion_impressions ?? 0) > 0
  const hasRows = (analytics?.listings?.length ?? 0) > 0

  return (
    <section className="stay-perf">
      <div className="stay-perf__bar">
        <button
          type="button"
          className={`stay-perf__toggle${open ? ' is-open' : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
          Performance details
          {likesSaves > 0 ? <span className="stay-perf__meta">{likesSaves} likes & saves · 30d</span> : null}
        </button>
        <div className="stay-perf__acts">
          <Link to="/provider/analytics" className="stay-perf__link">
            Full analytics
          </Link>
          {canManage ? (
            <Link to="/provider/promotions" className="stay-perf__promo">
              <Sparkles size={14} strokeWidth={2.25} aria-hidden />
              Boost on Delve
            </Link>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="stay-perf__body">
          {hasPromo ? (
            <p className="stay-perf__hint">
              Promotions: {analytics?.promotion_impressions ?? 0} impressions · {analytics?.promotion_clicks ?? 0}{' '}
              clicks · {analytics?.promotion_listing_opens ?? 0} listing opens
            </p>
          ) : (
            <p className="stay-perf__hint">
              Per-listing revenue and engagement for the last 30 days. Boost visibility from Promotions.
            </p>
          )}

          {hasRows ? (
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
                  {analytics!.listings.map((row) => (
                    <tr key={row.id}>
                      <td>{row.title}</td>
                      <td>{row.revenue > 0 ? format(row.revenue) : '—'}</td>
                      <td>{row.bookings}</td>
                      <td>{row.likes_count || '—'}</td>
                      <td>{row.saves_count || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="stay-perf__hint">No listing performance yet — bookings and engagement will show here.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
