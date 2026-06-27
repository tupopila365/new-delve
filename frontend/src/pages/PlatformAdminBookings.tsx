import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import {
  AdminFilterBar,
  AdminFilterChip,
  AdminPageHeader,
  AdminStatGrid,
  AdminStatusBadge,
} from '../components/admin'
import { BookingStatusBadge } from '../components/booking'
import { EmptyState } from '../components/ui'
import { apiFetch, asArray } from '../api/client'
import { getBookingStats, type AdminBooking } from '../data/adminData'

const STATUS_FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Refunded', 'Disputed'] as const
const CATEGORY_FILTERS = ['All categories', 'Stay', 'Guide', 'Transport', 'Food', 'Event'] as const
const PAYMENT_FILTERS = ['All payments', 'Paid', 'Unpaid', 'Refunded', 'Failed'] as const

type ApiAdminBooking = {
  id: string
  booking_type: string
  booking_id: number
  customer_username: string
  provider_username: string
  listing_title: string
  status: string
  total_price: string
  start_date: string
  end_date: string
  created_at: string
  has_dispute_notes: boolean
}

function paymentVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'paid') return 'success'
  if (status === 'unpaid') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'refunded') return 'info'
  return 'neutral'
}

function mapApiBooking(row: ApiAdminBooking): AdminBooking {
  const categoryMap: Record<string, AdminBooking['category']> = {
    accommodation: 'Stay',
    guide: 'Guide',
    vehicle: 'Transport',
    bus_seat: 'Transport',
    event: 'Event',
  }
  const status = row.status.toLowerCase()
  let paymentStatus = 'paid'
  if (status === 'pending') paymentStatus = 'unpaid'
  else if (status === 'refunded') paymentStatus = 'refunded'
  else if (status === 'cancelled') paymentStatus = 'refunded'

  return {
    id: row.id,
    customer: `@${row.customer_username}`,
    provider: `@${row.provider_username}`,
    category: categoryMap[row.booking_type] ?? 'Stay',
    service: row.listing_title,
    date: row.start_date,
    status,
    paymentStatus,
    amount: parseFloat(row.total_price) || 0,
    issue: row.has_dispute_notes ? 'Has support notes' : undefined,
  }
}

export function PlatformAdminBookings() {
  const { data: apiRows = [], isLoading, isError } = useQuery({
    queryKey: ['platform-admin-bookings'],
    queryFn: async () =>
      asArray<ApiAdminBooking>(await apiFetch('/api/accounts/admin/bookings/')),
  })

  const allBookings = useMemo(() => apiRows.map(mapApiBooking), [apiRows])
  const stats = getBookingStats(allBookings)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_FILTERS)[number]>('All categories')
  const [paymentFilter, setPaymentFilter] = useState<(typeof PAYMENT_FILTERS)[number]>('All payments')
  const [issuesOnly, setIssuesOnly] = useState(false)

  const bookings = useMemo(() => {
    let rows: AdminBooking[] = allBookings
    if (statusFilter !== 'All') {
      const key = statusFilter.toLowerCase()
      rows = rows.filter((b) => b.status === key)
    }
    if (categoryFilter !== 'All categories') {
      rows = rows.filter((b) => b.category === categoryFilter)
    }
    if (paymentFilter === 'Paid') rows = rows.filter((b) => b.paymentStatus === 'paid')
    if (paymentFilter === 'Unpaid') rows = rows.filter((b) => b.paymentStatus === 'unpaid')
    if (paymentFilter === 'Refunded') rows = rows.filter((b) => b.paymentStatus === 'refunded')
    if (paymentFilter === 'Failed') rows = rows.filter((b) => b.paymentStatus === 'failed')
    if (issuesOnly) rows = rows.filter((b) => b.issue)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (b) =>
          b.id.toLowerCase().includes(q) ||
          b.customer.toLowerCase().includes(q) ||
          b.provider.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q),
      )
    }
    return rows
  }, [allBookings, statusFilter, categoryFilter, paymentFilter, issuesOnly, search])

  if (isLoading) {
    return (
      <div className="adm-page">
        <AdminPageHeader title="Bookings" subtitle="Loading platform bookings…" />
        <p className="adm-page__hint">Fetching reservations from the API…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="adm-page">
        <AdminPageHeader title="Bookings" subtitle="Could not load bookings." />
        <p className="adm-page__hint">Sign in as staff to view cross-vertical reservations.</p>
      </div>
    )
  }

  return (
    <div className="adm-page">
      <AdminPageHeader
        title="Bookings"
        subtitle="Monitor platform bookings, payment status, disputes, and booking issues."
        action={
          <Link to="/provider/bookings" className="btn btn-ghost">
            Provider bookings
          </Link>
        }
      />

      <AdminStatGrid
        stats={[
          { value: stats.total, label: 'Total bookings' },
          { value: stats.confirmed, label: 'Confirmed' },
          { value: stats.pending, label: 'Pending', accent: stats.pending > 0 },
          { value: stats.completed, label: 'Completed' },
          { value: stats.cancelled, label: 'Cancelled' },
          { value: stats.disputed, label: 'Disputed', warn: stats.disputed > 0 },
          { value: stats.failedPayments, label: 'Failed payments', warn: stats.failedPayments > 0 },
          { value: `N$${stats.revenue.toLocaleString()}`, label: 'Paid volume' },
        ]}
      />

      <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search bookings…">
        {STATUS_FILTERS.map((f) => (
          <AdminFilterChip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
        ))}
        {CATEGORY_FILTERS.map((f) => (
          <AdminFilterChip key={f} label={f === 'Food' ? 'Food & drink' : f} active={categoryFilter === f} onClick={() => setCategoryFilter(f)} sub />
        ))}
        {PAYMENT_FILTERS.map((f) => (
          <AdminFilterChip key={f} label={f} active={paymentFilter === f} onClick={() => setPaymentFilter(f)} sub />
        ))}
        <AdminFilterChip label="Issues only" active={issuesOnly} onClick={() => setIssuesOnly((v) => !v)} sub />
      </AdminFilterBar>

      {bookings.length === 0 ? (
        <EmptyState
          compact
          iconElement={<ClipboardList size={28} strokeWidth={2} aria-hidden />}
          title="No bookings found"
          sub="Try changing your search or filters."
        />
      ) : (
        <div className="adm-data-table">
          <div className="adm-data-table__head adm-data-table__head--bookings" aria-hidden>
            <span>Booking</span>
            <span>Category</span>
            <span>Status</span>
            <span>Payment</span>
            <span>Amount</span>
            <span>Issue</span>
            <span>Actions</span>
          </div>
          {bookings.map((b) => (
            <div key={b.id} className="adm-data-table__row adm-data-table__row--bookings">
              <div className="adm-data-table__primary">
                <strong>{b.id}</strong>
                <span>
                  {b.customer} – {b.provider}
                </span>
                <span className="adm-data-table__muted">
                  {b.service} · {b.date}
                </span>
              </div>
              <AdminStatusBadge status={b.category} variant="info" />
              <BookingStatusBadge status={b.status} />
              <AdminStatusBadge status={b.paymentStatus} variant={paymentVariant(b.paymentStatus)} />
              <strong className="adm-data-table__amount">
                {b.amount ? `N$${b.amount.toLocaleString()}` : '—'}
              </strong>
              {b.issue ? (
                <AdminStatusBadge status={b.issue} variant="danger" />
              ) : (
                <span className="adm-data-table__muted">None</span>
              )}
              <div className="adm-data-table__actions">
                <button type="button" className="btn btn-ghost btn--sm" disabled title="View booking coming soon">
                  View
                </button>
                <button type="button" className="btn btn-ghost btn--sm" disabled title="Contact user coming soon">
                  Contact user
                </button>
                <button type="button" className="btn btn-ghost btn--sm" disabled title="Resolve coming soon">
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="adm-page__hint">
        Live data from platform admin bookings API. Payment actions remain placeholders until refund workflows ship.
      </p>
    </div>
  )
}
