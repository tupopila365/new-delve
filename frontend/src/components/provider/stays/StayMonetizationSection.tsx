import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart3, Sparkles } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { useDisplayMoney } from '../../../hooks/useDisplayMoney'

export type OccupancyRevenuePoint = {
  date: string
  occupied_room_nights: number
  available_room_nights: number
  occupancy_rate: number
  revenue: number
}

export type RoomPerformanceRow = {
  listing_id: number
  listing_title: string
  room_id: number | null
  room_name: string
  units: number
  bookings: number
  booked_nights: number
  available_room_nights: number
  revenue: number
  occupancy_rate: number
}

export type ExpiringStayRequest = {
  id: number
  listing_id: number
  listing_title: string
  guest?: string
  guest_display_name?: string
  status: string
  hold_expires_at: string
  minutes_remaining: number
}

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
  occupancy_rate?: number
  occupied_room_nights?: number
  available_room_nights?: number
  occupancy_revenue_trend?: OccupancyRevenuePoint[]
  room_performance?: RoomPerformanceRow[]
  expiring_requests?: ExpiringStayRequest[]
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
  activeBusinessId?: number | null
}

const shortDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

function chartPoints(rows: OccupancyRevenuePoint[]) {
  if (rows.length === 0) return ''
  const width = 600
  const x = (index: number) => (rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width)
  return rows
    .map((row, index) => `${x(index).toFixed(1)},${(150 - Math.min(100, row.occupancy_rate) * 1.2).toFixed(1)}`)
    .join(' ')
}

function OperationsChart({ rows }: { rows: OccupancyRevenuePoint[] }) {
  const maxRevenue = Math.max(1, ...rows.map((row) => row.revenue))
  const labelIndexes = new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])

  if (rows.length === 0) {
    return (
      <div className="stay-ops__empty">
        Occupancy and revenue will appear as completed and active stays build up.
      </div>
    )
  }

  return (
    <div className="stay-ops-chart">
      <div className="stay-ops-chart__legend" aria-hidden>
        <span><i className="is-occupancy" /> Occupancy</span>
        <span><i className="is-revenue" /> Revenue</span>
      </div>
      <svg
        viewBox="0 0 600 184"
        role="img"
        aria-label={`Thirty-day chart ending ${shortDate.format(new Date(`${rows.at(-1)?.date}T12:00:00`))}`}
        preserveAspectRatio="none"
      >
        {[30, 70, 110, 150].map((y) => (
          <line key={y} x1="0" x2="600" y1={y} y2={y} className="stay-ops-chart__grid" />
        ))}
        {rows.map((row, index) => {
          const barWidth = Math.max(5, 480 / rows.length)
          const x = rows.length === 1 ? 300 : (index / (rows.length - 1)) * 600
          const height = (row.revenue / maxRevenue) * 76
          return (
            <rect
              key={row.date}
              x={x - barWidth / 2}
              y={150 - height}
              width={barWidth}
              height={height}
              rx="2"
              className="stay-ops-chart__bar"
            >
              <title>{`${shortDate.format(new Date(`${row.date}T12:00:00`))}: ${row.occupancy_rate}% occupied`}</title>
            </rect>
          )
        })}
        <polyline points={chartPoints(rows)} className="stay-ops-chart__line" />
        {rows.map((row, index) => {
          if (!labelIndexes.has(index)) return null
          const x = rows.length === 1 ? 300 : (index / (rows.length - 1)) * 600
          return (
            <text key={row.date} x={x} y="178" textAnchor={index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'middle'}>
              {shortDate.format(new Date(`${row.date}T12:00:00`))}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function RoomPerformance({
  rows,
  formatMoney,
}: {
  rows: RoomPerformanceRow[]
  formatMoney: (value: number) => string
}) {
  const topRows = [...rows]
    .sort((a, b) => b.revenue - a.revenue || b.occupancy_rate - a.occupancy_rate)
    .slice(0, 8)

  if (topRows.length === 0) {
    return (
      <div className="stay-ops__empty">
        Add room inventory to compare booked nights, occupancy, and revenue.
      </div>
    )
  }

  return (
    <div className="stay-room-performance">
      {topRows.map((row) => (
        <article key={`${row.listing_id}:${row.room_id ?? 'property'}`} className="stay-room-performance__row">
          <div className="stay-room-performance__name">
            <strong>{row.room_name || 'Whole property'}</strong>
            <span>{row.listing_title} · {row.units} unit{row.units === 1 ? '' : 's'}</span>
          </div>
          <div className="stay-room-performance__bar" aria-label={`${row.occupancy_rate}% occupancy`}>
            <span style={{ width: `${Math.max(0, Math.min(100, row.occupancy_rate))}%` }} />
          </div>
          <div className="stay-room-performance__numbers">
            <strong>{row.occupancy_rate}%</strong>
            <span>{row.booked_nights} nights · {row.revenue > 0 ? formatMoney(row.revenue) : '—'}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

export function StayMonetizationSection({
  enabled,
  canManage = false,
  activeBusinessId = null,
}: Props) {
  const { format } = useDisplayMoney()
  const businessQuery = activeBusinessId ? `&business=${activeBusinessId}` : ''
  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ['stay-provider-analytics', activeBusinessId ?? 'all'],
    queryFn: () =>
      apiFetch<StayMonetizationAnalytics>(
        `/api/accommodation/provider-analytics/?days=30${businessQuery}`,
      ),
    enabled,
  })

  if (!enabled) return null

  const trend = analytics?.occupancy_revenue_trend ?? []
  const rooms = analytics?.room_performance ?? []

  return (
    <section className="stay-ops" aria-labelledby="stay-ops-title">
      <header className="stay-ops__head">
        <div>
          <span className="stay-ops__eyebrow">Last 30 days</span>
          <h2 id="stay-ops-title">Operating pulse</h2>
          <p>See demand and room yield at a glance, then act on what needs attention.</p>
        </div>
        <div className="stay-ops__actions">
          <Link to="/provider/analytics" className="stay-ops__link">
            Full analytics <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden />
          </Link>
          {canManage ? (
            <Link to="/provider/promotions" className="stay-ops__link stay-ops__link--accent">
              <Sparkles size={14} strokeWidth={2.25} aria-hidden />
              Boost
            </Link>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className="stay-ops__empty">Loading operating data…</div>
      ) : isError ? (
        <div className="stay-ops__empty">Operating data is temporarily unavailable.</div>
      ) : (
        <div className="stay-ops__grid">
          <article className="stay-ops__panel stay-ops__panel--chart">
            <div className="stay-ops__panel-head">
              <div>
                <span>Occupancy + revenue</span>
                <strong>{analytics?.occupancy_rate ?? 0}% occupied</strong>
              </div>
              <span className="stay-ops__panel-total">{format(analytics?.on_platform_revenue ?? 0)}</span>
            </div>
            <OperationsChart rows={trend} />
          </article>

          <article className="stay-ops__panel stay-ops__panel--rooms">
            <div className="stay-ops__panel-head">
              <div>
                <span>Room comparison</span>
                <strong>Performance by inventory</strong>
              </div>
              <BarChart3 size={20} strokeWidth={2} aria-hidden />
            </div>
            <RoomPerformance rows={rooms} formatMoney={(value) => format(value)} />
          </article>
        </div>
      )}
    </section>
  )
}
