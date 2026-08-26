import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { BookingDto } from '@delve/contracts'
import { adminGetBooking } from '../api/bookings'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { EmptyState } from '../components/admin/EmptyState'
import { ErrorState } from '../components/admin/ErrorState'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { Money } from '../components/admin/Money'
import { StatusBadge } from '../components/admin/StatusBadge'

export default function BookingDetailPage() {
  const { bookingId = '' } = useParams()
  const [row, setRow] = useState<BookingDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      setRow(await adminGetBooking(bookingId))
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404) setNotFound(true)
      else setError(err instanceof Error ? err.message : 'Could not load this booking.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [bookingId])

  if (loading) return <LoadingSkeleton rows={4} />
  if (notFound) return <EmptyState title="Booking not found" detail="This booking id does not exist." />
  if (error) return <ErrorState title="Could not load this booking." detail={error} onRetry={() => void load()} />
  if (!row) return null

  return (
    <div>
      <AdminPageHeader title={row.bookingReference} description="Inspect-only booking record." />
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge>{row.status}</StatusBadge>
        <StatusBadge>{row.payment.status || 'UNPAID'}</StatusBadge>
      </div>
      <p className="text-sm m-0">
        <Link to={`/listings/${row.listing.id}`}>{row.listing.title}</Link>
      </p>
      <p className="text-sm m-0">
        <Link to={`/businesses/${row.business.id}`}>{row.business.name}</Link>
      </p>
      <p className="text-sm m-0 mt-2">
        <Money currency={row.pricing.currency} amount={row.pricing.finalAmount} />
      </p>
      <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
        {row.startDateTime ? new Date(row.startDateTime).toLocaleString() : 'No start date'}
      </p>
      {row.deal ? (
        <p className="text-xs m-0 mt-2">
          Deal <Link to="/deals">{row.deal.title}</Link>
        </p>
      ) : null}
      <p className="text-xs m-0 mt-4">
        <Link to="/payments">Payments</Link>
        {' · '}
        <Link to="/payments/refunds">Refunds</Link>
        {' · '}
        <Link to="/payments/disputes">Disputes</Link>
      </p>
      <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)' }}>
        {row.payment.note}
      </p>
    </div>
  )
}
