import { useEffect, useState } from 'react'
import type { BookingDto, BusinessMemberRole, ProviderBookingFilter } from '@delve/contracts'
import {
  cancelBusinessBooking,
  completeBusinessBooking,
  confirmBusinessBooking,
  fetchBusinessBookings,
} from '../../api/bookingClient'
import { formatMoney } from '../../lib/formatMoney'

const FILTERS: { id: ProviderBookingFilter | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

export default function ProviderBookingsView({
  businessId,
  role,
}: {
  businessId: string
  role: BusinessMemberRole
}) {
  const canAct = role === 'OWNER' || role === 'MANAGER'
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('pending')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<BookingDto[]>([])
  const [selected, setSelected] = useState<BookingDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload() {
    const list = await fetchBusinessBookings(businessId, {
      filter: filter === 'all' ? undefined : filter,
      q: q.trim() || undefined,
    })
    setRows(list)
    return list
  }

  useEffect(() => {
    let cancelled = false
    setError(null)
    void reload()
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load bookings')
      })
    return () => {
      cancelled = true
    }
  }, [businessId, filter])

  async function act(fn: () => Promise<BookingDto>) {
    setBusy(true)
    setError(null)
    try {
      const updated = await fn()
      setSelected(updated)
      setRows(prev => prev.map(r => (r.id === updated.id ? updated : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update booking')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
          Bookings
        </h1>
        <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
          Reservation requests. Payment is not captured on Delve yet.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: filter === f.id ? 'var(--primary)' : 'var(--surface)',
              color: filter === f.id ? '#fff' : 'var(--fg)',
              border: '1px solid var(--border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search reference or traveler"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        />
        <button
          type="button"
          onClick={() => void reload().catch(err => setError(err instanceof Error ? err.message : 'Search failed'))}
          className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
        >
          Search
        </button>
      </div>
      {error && (
        <p className="text-sm m-0" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      )}
      {!canAct && (
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          Your role can view bookings but cannot confirm or cancel them.
        </p>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-2">
          {rows.map(row => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelected(row)}
              className="w-full text-left rounded-xl px-3 py-3"
              style={{
                border: `1px solid ${selected?.id === row.id ? 'var(--primary)' : 'var(--border)'}`,
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              <p className="text-xs font-semibold m-0" style={{ color: 'var(--primary)' }}>
                {row.status}
              </p>
              <p className="text-sm font-bold m-0">{row.listing.title}</p>
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                {row.bookingReference}
                {row.traveler ? ` · ${row.traveler.displayName}` : ''}
              </p>
              <p className="text-xs m-0 mt-1">{formatMoney(row.pricing.currency, row.pricing.finalAmount)}</p>
            </button>
          ))}
        </div>
        <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {selected ? (
            <div className="space-y-2 text-sm">
              <p className="font-mono font-bold m-0">{selected.bookingReference}</p>
              <p className="m-0">{selected.listing.title}</p>
              <p className="m-0" style={{ color: 'var(--fg-muted)' }}>
                {selected.traveler?.displayName || 'Traveler'}
              </p>
              <p className="m-0">{selected.status}</p>
              <p className="m-0">
                {selected.startDateTime ? new Date(selected.startDateTime).toLocaleString() : 'Dates to confirm'}
              </p>
              <p className="m-0">Guests {selected.guestCount ?? selected.quantity}</p>
              <p className="m-0">{formatMoney(selected.pricing.currency, selected.pricing.finalAmount)}</p>
              {selected.deal && <p className="m-0">Deal: {selected.deal.title}</p>}
              {selected.customerNote && <p className="m-0">Note: {selected.customerNote}</p>}
              <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
                {selected.financial?.travelerMessage || selected.payment.note}
              </p>
              {canAct && (selected.status === 'PENDING' || selected.status === 'PENDING_PAYMENT') && selected.payment.captured && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(() => confirmBusinessBooking(businessId, selected.id))}
                  className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-white"
                  style={{ background: '#0F8A52', border: 'none' }}
                >
                  Confirm reservation
                </button>
              )}
              {canAct && selected.status === 'CONFIRMED' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(() => completeBusinessBooking(businessId, selected.id))}
                  className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-white"
                  style={{ background: 'var(--primary)', border: 'none' }}
                >
                  Mark completed
                </button>
              )}
              {canAct &&
                selected.payment.captured &&
                selected.status !== 'CANCELLED' &&
                selected.financial?.cancellation?.status !== 'PENDING' &&
                selected.financial?.refund?.status !== 'SUCCEEDED' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(() => cancelBusinessBooking(businessId, selected.id, 'Service unavailable'))}
                  className="w-full rounded-xl px-3 py-2 text-sm font-semibold"
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--fg)' }}
                >
                  Request cancellation
                </button>
              )}
              {canAct &&
                !selected.payment.captured &&
                (selected.status === 'PENDING' || selected.status === 'PENDING_PAYMENT' || selected.status === 'CONFIRMED') && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void act(() => cancelBusinessBooking(businessId, selected.id))}
                  className="w-full rounded-xl px-3 py-2 text-sm font-semibold"
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--fg)' }}
                >
                  Decline / cancel
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
              Select a booking.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
