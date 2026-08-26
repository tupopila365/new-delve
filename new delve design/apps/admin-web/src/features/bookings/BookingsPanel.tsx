import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BookingDto } from '@delve/contracts'
import { adminFetch } from '../../api/adminClient'

export default function BookingsPanel() {
  const [rows, setRows] = useState<BookingDto[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await adminFetch('/admin/bookings')
        const body = (await res.json()) as { success: boolean; data?: BookingDto[] }
        if (!res.ok || !body.success) throw new Error('Could not load bookings')
        if (!cancelled) setRows(body.data || [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load bookings')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold m-0 mb-2">Bookings</h2>
      <p className="text-xs m-0 mb-3" style={{ color: 'var(--muted)' }}>
        Inspect-only list of reservations. Traveler payment and business settlement are separate.
      </p>
      {error && <p className="text-sm" style={{ color: 'crimson' }}>{error}</p>}
      <ul className="list-none m-0 p-0 space-y-2">
        {rows.map(b => (
          <li key={b.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)' }}>
            <p className="text-xs font-mono m-0">{b.bookingReference}</p>
            <p className="text-sm font-semibold m-0">{b.listing.title} · {b.status}</p>
            <p className="text-xs m-0">
              <Link to={`/businesses/${b.business.id}`}>{b.business.name}</Link> · {b.traveler?.displayName || 'traveler'} · {b.pricing.currency} {b.pricing.finalAmount}
            </p>
            <p className="text-xs m-0 mt-1">
              <Link to={`/bookings/${b.id}`}>View booking</Link>
            </p>
          </li>
        ))}
        {rows.length === 0 && !error ? <p className="text-sm m-0" style={{ color: 'var(--muted)' }}>No bookings.</p> : null}
      </ul>
    </section>
  )
}
