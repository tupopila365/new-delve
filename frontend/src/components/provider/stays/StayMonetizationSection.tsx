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
  total_listing_views?: number
  total_room_views?: number
  total_views?: number
  views_trend?: {
    date: string
    listing_views: number
    room_views: number
    views: number
  }[]
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
    views?: number
    listing_views?: number
    room_views?: number
    views_count?: number
    rooms?: { name: string; views: number }[]
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

  const listingViews = analytics?.total_listing_views ?? 0
  const roomViews = analytics?.total_room_views ?? 0
  const totalViews = analytics?.total_views ?? listingViews + roomViews
  const likesSaves = (analytics?.total_likes ?? 0) + (analytics?.total_saves ?? 0)
  const hasPromo = (analytics?.promotion_impressions ?? 0) > 0
  const hasRows = (analytics?.listings?.length ?? 0) > 0

  const metaParts = [
    totalViews > 0 ? `${totalViews} views` : null,
    likesSaves > 0 ? `${likesSaves} likes & saves` : null,
  ].filter(Boolean)

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
          {metaParts.length > 0 ? (
            <span className="stay-perf__meta">{metaParts.join(' · ')} · 30d</span>
          ) : null}
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
          {totalViews > 0 ? (
            <p className="stay-perf__hint">
              Views · 30d: {listingViews} stay pages · {roomViews} room pages
            </p>
          ) : hasPromo ? (
            <p className="stay-perf__hint">
              Promotions: {analytics?.promotion_impressions ?? 0} impressions · {analytics?.promotion_clicks ?? 0}{' '}
              clicks · {analytics?.promotion_listing_opens ?? 0} listing opens
            </p>
          ) : (
            <p className="stay-perf__hint">
              Per-listing views, revenue, and engagement for the last 30 days. Boost visibility from Promotions.
            </p>
          )}

          {hasRows ? (
            <div className="ev-monetization__table-wrap">
              <table className="ev-monetization__table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Stay views</th>
                    <th>Room views</th>
                    <th>Revenue</th>
                    <th>Bookings</th>
                    <th>Likes</th>
                    <th>Saves</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics!.listings.map((row) => {
                    const stayViews = row.listing_views ?? row.views ?? 0
                    const rooms = row.rooms ?? []
                    return (
                      <tr key={row.id}>
                        <td>
                          <div>{row.title}</div>
                          {rooms.length > 0 ? (
                            <div className="stay-perf__rooms">
                              {rooms.map((r) => (
                                <span key={r.name}>
                                  {r.name}: {r.views}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td>{stayViews || '—'}</td>
                        <td>{row.room_views || '—'}</td>
                        <td>{row.revenue > 0 ? format(row.revenue) : '—'}</td>
                        <td>{row.bookings}</td>
                        <td>{row.likes_count || '—'}</td>
                        <td>{row.saves_count || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="stay-perf__hint">No listing performance yet — views and bookings will show here.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
