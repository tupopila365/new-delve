import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Ticket } from 'lucide-react'
import type { BookingDto, TravelerBookingFilter } from '@delve/contracts'
import { cancelMyBooking, fetchMyBooking, fetchMyBookings } from '../../api/bookingClient'
import { startBookingPayment } from '../../api/paymentClient'
import { getStoredAccessToken } from '../../api/authClient'
import { SectionEmpty, SectionError, SkeletonCard } from '../../components/SectionStates'
import { formatMoney } from '../../lib/formatMoney'
import AddBookingToJourneySheet from '../../components/bookings/AddBookingToJourneySheet'

interface Props {
  onBack: () => void
  initialBookingId?: string
  highlightRef?: string
  onOpenBusiness?: (slug: string) => void
  onOpenDeal?: (dealId: string) => void
}

const TABS: { id: TravelerBookingFilter | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

function formatWhen(iso: string | null) {
  if (!iso) return 'Dates to confirm'
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function BookingDetail({
  booking,
  onBack,
  onOpenBusiness,
  onOpenDeal,
  onChanged,
}: {
  booking: BookingDto
  onBack: () => void
  onOpenBusiness?: (slug: string) => void
  onOpenDeal?: (dealId: string) => void
  onChanged: (row: BookingDto) => void
}) {
  const [journeyOpen, setJourneyOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canCancelUnpaid =
    !booking.payment.captured &&
    (booking.status === 'PENDING' || booking.status === 'PENDING_PAYMENT' || booking.status === 'CONFIRMED')
  const canRequestCancel =
    booking.payment.captured &&
    booking.status !== 'CANCELLED' &&
    booking.status !== 'EXPIRED' &&
    booking.financial?.cancellation?.status !== 'PENDING' &&
    booking.financial?.cancellation?.status !== 'APPROVED' &&
    booking.financial?.refund?.status !== 'SUCCEEDED'
  const canPay =
    (booking.status === 'PENDING' || booking.status === 'PENDING_PAYMENT') && !booking.payment.captured

  return (
    <div className="pb-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} />
        Back to my bookings
      </button>
      {booking.listing.coverUrl && (
        <img src={booking.listing.coverUrl} alt="" className="w-full max-h-48 object-cover rounded-2xl mb-3" />
      )}
      <p className="text-xs font-semibold m-0 mb-1" style={{ color: 'var(--primary)' }}>
        {booking.status}
      </p>
      <h1 className="font-display text-2xl font-extrabold m-0 mb-1" style={{ color: 'var(--fg)' }}>
        {booking.listing.title}
      </h1>
      <p className="text-sm m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
        {booking.business.name}
      </p>
      <p className="text-sm font-mono font-bold m-0 mb-4" style={{ color: 'var(--fg)' }}>
        {booking.bookingReference}
      </p>
      <dl className="m-0 text-sm space-y-2 mb-4">
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            When
          </dt>
          <dd className="m-0">{formatWhen(booking.startDateTime)}</dd>
        </div>
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Guests
          </dt>
          <dd className="m-0">
            {booking.guestCount ?? booking.quantity} · quantity {booking.quantity}
          </dd>
        </div>
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Original
          </dt>
          <dd className="m-0">{formatMoney(booking.pricing.currency, booking.pricing.originalAmount)}</dd>
        </div>
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Discount
          </dt>
          <dd className="m-0">{formatMoney(booking.pricing.currency, booking.pricing.discountAmount)}</dd>
        </div>
        <div>
          <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Final
          </dt>
          <dd className="m-0 font-bold">{formatMoney(booking.pricing.currency, booking.pricing.finalAmount)}</dd>
        </div>
        {booking.deal && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Deal
            </dt>
            <dd className="m-0">
              {booking.deal.title}
              {booking.deal.discountSummary ? ` · ${booking.deal.discountSummary}` : ''}
            </dd>
          </div>
        )}
        {booking.customerNote && (
          <div>
            <dt className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              Your note
            </dt>
            <dd className="m-0">{booking.customerNote}</dd>
          </div>
        )}
      </dl>
      <p className="text-xs m-0 mb-4" style={{ color: 'var(--fg-muted)' }}>
        {booking.financial?.travelerMessage || booking.payment.note}
      </p>
      {error && (
        <p className="text-xs m-0 mb-2" style={{ color: 'var(--auth-danger)' }}>
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {onOpenBusiness && (
          <button
            type="button"
            onClick={() => onOpenBusiness(booking.business.slug)}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            View business
          </button>
        )}
        {booking.deal && onOpenDeal && (
          <button
            type="button"
            onClick={() => onOpenDeal(booking.deal!.id)}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            View deal
          </button>
        )}
        <button
          type="button"
          onClick={() => setJourneyOpen(true)}
          className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}
        >
          Add to journey
        </button>
        {canPay && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setError(null)
              void startBookingPayment(booking.id)
                .then(result => {
                  if (result.checkoutUrl) {
                    window.location.assign(result.checkoutUrl)
                    return
                  }
                  return fetchMyBooking(booking.id).then(onChanged)
                })
                .catch(err => setError(err instanceof Error ? err.message : 'Could not start payment'))
                .finally(() => setBusy(false))
            }}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)', border: 'none' }}
          >
            Pay now
          </button>
        )}
        {canCancelUnpaid && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setError(null)
              void cancelMyBooking(booking.id)
                .then(onChanged)
                .catch(err => setError(err instanceof Error ? err.message : 'Could not cancel'))
                .finally(() => setBusy(false))
            }}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            Cancel reservation
          </button>
        )}
        {canRequestCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              setError(null)
              void cancelMyBooking(booking.id)
                .then(onChanged)
                .catch(err => setError(err instanceof Error ? err.message : 'Could not request cancellation'))
                .finally(() => setBusy(false))
            }}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            Request Cancellation
          </button>
        )}
      </div>
      <AddBookingToJourneySheet
        open={journeyOpen}
        bookingId={booking.id}
        bookingTitle={booking.listing.title}
        onClose={() => setJourneyOpen(false)}
      />
    </div>
  )
}

export default function MyBookingsPage({ onBack, initialBookingId, highlightRef, onOpenBusiness, onOpenDeal }: Props) {
  const signedIn = Boolean(getStoredAccessToken())
  const [searchParams] = useSearchParams()
  const payBookingId = searchParams.get('booking')
  const payCancelled = searchParams.get('pay') === 'cancelled'
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('all')
  const [rows, setRows] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialBookingId ?? payBookingId)
  const [confirming, setConfirming] = useState(Boolean(payBookingId) && !payCancelled)
  const [confirmNote, setConfirmNote] = useState<string | null>(
    payCancelled ? 'Checkout was cancelled. This booking is not confirmed.' : null,
  )

  async function reload() {
    const filter = tab === 'all' ? undefined : tab
    const list = await fetchMyBookings(filter)
    setRows(list)
    return list
  }

  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void reload()
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load bookings')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [signedIn, tab])

  const selected = rows.find(r => r.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId || selected) return
    void fetchMyBooking(selectedId)
      .then(row => setRows(prev => (prev.some(p => p.id === row.id) ? prev.map(p => (p.id === row.id ? row : p)) : [row, ...prev])))
      .catch(() => undefined)
  }, [selectedId, selected])

  useEffect(() => {
    if (!confirming || !payBookingId || !signedIn) return
    let cancelled = false
    let attempts = 0
    const tick = () => {
      void fetchMyBooking(payBookingId)
        .then(row => {
          if (cancelled) return
          setRows(prev => (prev.some(p => p.id === row.id) ? prev.map(p => (p.id === row.id ? row : p)) : [row, ...prev]))
          if (row.payment.captured && row.status === 'CONFIRMED') {
            setConfirming(false)
            setConfirmNote('Payment successful ✓ Booking confirmed.')
            return
          }
          if (row.payment.status === 'FAILED' || row.payment.status === 'CANCELLED') {
            setConfirming(false)
            setConfirmNote('Payment is not confirmed. You can try again.')
            return
          }
          attempts += 1
          if (attempts < 15) window.setTimeout(tick, 2000)
          else {
            setConfirming(false)
            setConfirmNote('Payment is still being confirmed.')
          }
        })
        .catch(() => {
          if (!cancelled && attempts < 15) window.setTimeout(tick, 2000)
        })
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [confirming, payBookingId, signedIn])

  if (selected) {
    return (
      <div className="min-h-screen px-3 sm:px-6 py-4" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
        <div className="max-w-[960px] mx-auto">
          {(confirming || confirmNote) && (
            <p className="text-sm m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
              {confirming ? 'Confirming your payment...' : confirmNote}
            </p>
          )}
          <BookingDetail
            booking={selected}
            onBack={() => setSelectedId(null)}
            onOpenBusiness={onOpenBusiness}
            onOpenDeal={onOpenDeal}
            onChanged={row => setRows(prev => prev.map(p => (p.id === row.id ? row : p)))}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <header
        className="sticky top-0 z-40 px-3 sm:px-6 py-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-[960px] mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Back"
            style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>
              My Bookings
            </h1>
            {highlightRef && (
              <p className="text-xs truncate m-0" style={{ color: 'var(--fg-muted)' }}>
                Opened from {highlightRef}
              </p>
            )}
            {(confirming || confirmNote) && (
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                {confirming ? 'Confirming your payment...' : confirmNote}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[960px] mx-auto px-3 sm:px-6 py-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: tab === t.id ? 'var(--primary)' : 'var(--surface)',
                color: tab === t.id ? '#fff' : 'var(--fg)',
                border: '1px solid var(--border)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <SectionError onRetry={() => setTab(tab)} />
        ) : rows.length === 0 ? (
          <SectionEmpty
            icon={<Ticket size={28} />}
            title="No bookings yet"
            body="Reservations you request from listings and deals will appear here. Payment is not captured yet."
          />
        ) : (
          <div className="space-y-3">
            {rows.map(row => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className="w-full text-left rounded-2xl px-4 py-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                <p className="text-xs font-semibold m-0 mb-1" style={{ color: 'var(--primary)' }}>
                  {row.status}
                </p>
                <p className="text-sm font-bold m-0" style={{ color: 'var(--fg)' }}>
                  {row.listing.title}
                </p>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                  {row.business.name}
                </p>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
                  <Calendar size={12} className="inline mr-1" />
                  {formatWhen(row.startDateTime)} · {row.guestCount ?? row.quantity} travelers
                </p>
                <p className="text-sm font-bold m-0 mt-1">{formatMoney(row.pricing.currency, row.pricing.finalAmount)}</p>
                <p className="text-xs font-mono m-0 mt-1">{row.bookingReference}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
