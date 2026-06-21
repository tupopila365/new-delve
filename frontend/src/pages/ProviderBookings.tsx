import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderBookingCard } from '../components/provider/bookings'
import { ProviderUiChips, ProviderUiEmpty, ProviderUiHeader, ProviderUiPage, ProviderUiStats } from '../components/provider/ui'
import { getBookingStats, getProviderBookings } from '../data/providerData'
import { bookingsPageSubtitle, categoriesForBusinessTypes } from '../utils/providerCategories'

const STATUS_FILTERS = [
  { id: 'All', label: 'All' },
  { id: 'Pending', label: 'Pending' },
  { id: 'Confirmed', label: 'Confirmed' },
  { id: 'Completed', label: 'Completed' },
  { id: 'Cancelled', label: 'Cancelled' },
] as const

export function ProviderBookings() {
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const businessTypes = activeBusiness?.business_types ?? []
  const allowedCategories = useMemo(() => categoriesForBusinessTypes(businessTypes), [businessTypes])

  const scopedBookings = useMemo(() => {
    const all = getProviderBookings()
    if (allowedCategories.length === 0) return all
    return all.filter((b) => allowedCategories.includes(b.category))
  }, [allowedCategories])

  const stats = getBookingStats(scopedBookings)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const bookings = useMemo(() => {
    let rows = scopedBookings
    if (statusFilter !== 'All') {
      const key = statusFilter.toLowerCase()
      rows = rows.filter(
        (b) =>
          b.status === key ||
          (statusFilter === 'Pending' && ['requested', 'pending', 'reserved'].includes(b.status)),
      )
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((b) => b.guest.toLowerCase().includes(q) || b.service.toLowerCase().includes(q))
    }
    return rows
  }, [scopedBookings, statusFilter, search])

  return (
    <ProviderUiPage>
      <ProviderUiHeader title="Bookings" subtitle={bookingsPageSubtitle(businessTypes)} />

      <ProviderUiStats
        columns={4}
        stats={[
          { value: stats.pending, label: 'Pending', accent: stats.pending > 0 },
          { value: stats.confirmed, label: 'Confirmed' },
          { value: stats.completed, label: 'Completed' },
          { value: stats.cancelled, label: 'Cancelled' },
          { value: `N$${stats.revenue.toLocaleString()}`, label: 'Revenue', wide: true },
        ]}
      />

      <input
        type="search"
        className="prov-ui__search"
        placeholder="Search guest or listing…"
        aria-label="Search bookings"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ProviderUiChips
        chips={[...STATUS_FILTERS]}
        active={statusFilter}
        onChange={setStatusFilter}
        ariaLabel="Filter by status"
      />

      {scopedBookings.length === 0 ? (
        <ProviderUiEmpty title="No bookings yet" message="Requests from travellers will show up here." />
      ) : bookings.length === 0 ? (
        <ProviderUiEmpty title="No matches" message="Try a different filter or search term." />
      ) : (
        <div className="prov-ui__list">
          {bookings.map((b) => (
            <ProviderBookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </ProviderUiPage>
  )
}
