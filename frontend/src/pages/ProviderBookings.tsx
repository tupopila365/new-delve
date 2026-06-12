import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderBookingRow, ProviderPageHeader, ProviderStatGrid } from '../components/provider'
import { EmptyState } from '../components/ui'
import { getBookingStats, getProviderBookings, type ListingCategory } from '../data/providerData'

const STATUS_FILTERS = ['All', 'Requested', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'Refunded'] as const
const CATEGORY_FILTERS = ['All categories', 'Stay', 'Guide', 'Transport', 'Food', 'Event'] as const

export function ProviderBookings() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const owner = activeBusiness?.owner_username

  const allBookings = useMemo(() => getProviderBookings(owner), [owner])
  const stats = getBookingStats(allBookings)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_FILTERS)[number]>('All categories')

  const bookings = useMemo(() => {
    let rows = allBookings
    if (statusFilter !== 'All') {
      const key = statusFilter.toLowerCase()
      rows = rows.filter(
        (b) =>
          b.status === key ||
          (statusFilter === 'Pending' && ['requested', 'reserved'].includes(b.status)),
      )
    }
    if (categoryFilter !== 'All categories') {
      rows = rows.filter((b) => b.category === (categoryFilter as ListingCategory))
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (b) =>
          b.guest.toLowerCase().includes(q) ||
          b.service.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q),
      )
    }
    return rows
  }, [allBookings, statusFilter, categoryFilter, search])

  return (
    <div className="prov-page">
      <ProviderPageHeader
        title="Bookings"
        subtitle="Manage booking requests across stays, guides, transport, food, and events."
        action={
          <Link to="/provider/stays" className="btn btn-ghost">
            Stays bookings
          </Link>
        }
      />

      <ProviderStatGrid
        stats={[
          { value: stats.pending, label: 'Pending', accent: stats.pending > 0 },
          { value: stats.confirmed, label: 'Confirmed' },
          { value: stats.completed, label: 'Completed' },
          { value: stats.cancelled, label: 'Cancelled' },
          { value: `N$${stats.revenue.toLocaleString()}`, label: 'Revenue' },
        ]}
      />

      <div className="prov-toolbar" role="search">
        <input
          type="search"
          className="prov-toolbar__search"
          placeholder="Search by guest or listing…"
          aria-label="Search bookings"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="prov-toolbar__chips prov-toolbar__chips--scroll" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`prov-chip${statusFilter === f ? ' prov-chip--active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="prov-toolbar__chips prov-toolbar__chips--scroll" role="group" aria-label="Filter by category">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`prov-chip prov-chip--sub${categoryFilter === f ? ' prov-chip--active' : ''}`}
              onClick={() => setCategoryFilter(f)}
            >
              {f === 'Food' ? 'Food & drink' : f}
            </button>
          ))}
        </div>
      </div>

      {allBookings.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No bookings yet"
          sub="Bookings and requests from travellers will appear here."
          cta={{ label: 'View listings', to: '/provider/listings' }}
        />
      ) : bookings.length === 0 ? (
        <EmptyState
          compact
          icon="🔍"
          title="No bookings match your filters"
          sub="Try a different status, category, or search term."
        />
      ) : (
        <div className="prov-booking-list prov-booking-list--page">
          {bookings.map((b) => (
            <ProviderBookingRow key={b.id} booking={b} />
          ))}
        </div>
      )}

      <p className="prov-page__hint">
        Category modules have detailed booking flows.{' '}
        <Link to="/provider/stays">Stays</Link> · <Link to="/provider/guides">Guides</Link> ·{' '}
        <Link to="/provider/transport">Transport</Link> · <Link to="/provider/food">Food & drink</Link>
      </p>
    </div>
  )
}
