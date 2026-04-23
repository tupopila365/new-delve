import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Booking = {
  id: number
  status: string
  total_price: string
  mock_payment_ref: string
}

export function AccommodationBook() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState('2')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: listing } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<{ title: string; max_guests: number }>(`/api/accommodation/listings/${id}/`, { auth: false }),
  })

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<Booking>('/api/accommodation/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          listing: Number(id),
          check_in: checkIn,
          check_out: checkOut,
          guests: Number(guests) || 1,
        }),
      }),
    onSuccess: (b) => {
      setBooking(b)
      void qc.invalidateQueries({ queryKey: ['acc-bookings'] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "We couldn't save that request. Try again in a moment."),
  })

  const payMut = useMutation({
    mutationFn: (bid: number) =>
      apiFetch<{ mock_payment_ref: string; status: string }>(`/api/accommodation/bookings/${bid}/mock_pay/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (r) => {
      setBooking((b) => (b ? { ...b, status: r.status, mock_payment_ref: r.mock_payment_ref } : b))
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'The practice payment didn’t go through. You can try again.'),
  })

  if (!profile) {
    return (
      <div className="acc-page acc-page--book">
        <div className="acc-book__gate card">
          <h1 className="display acc-book__gate-title">Sign in when you&apos;re ready</h1>
          <p className="acc-book__gate-text">
            A free account lets a host know who&apos;s coming. Browsing stays open to everyone — you only need this step when you want to hold dates.
          </p>
          <div className="acc-book__gate-actions">
            <Link to="/login" className="btn btn-primary btn-block">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-ghost btn-block">
              Create free account
            </Link>
          </div>
          <Link to={`/accommodation/${id}`} className="acc-book__gate-back">
            ← Back to listing
          </Link>
        </div>
      </div>
    )
  }

  const bookingStep = booking?.status === 'confirmed' ? 3 : booking ? 2 : 1

  if (!profile.email_verified) {
    return (
      <div className="acc-page acc-page--book">
        <div className="acc-book__gate card">
          <h1 className="display acc-book__gate-title">Verify your email</h1>
          <p className="acc-book__gate-text">
            A confirmed address helps hosts reply to you. It&apos;s a small step that protects both sides — you can still explore the rest of DELVE anytime.
          </p>
          <Link to="/verify-email" className="btn btn-primary btn-block">
            Verify email
          </Link>
          <Link to={`/accommodation/${id}`} className="acc-book__gate-back">
            ← Back to listing
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="acc-page acc-page--book">
      <Link to={`/accommodation/${id}`} className="acc-page__back acc-book__back">
        ← Back to listing
      </Link>

      <header className="acc-book__head">
        <ol className="acc-book__steps" aria-label="Booking steps">
          <li
            className={`acc-book__step${bookingStep === 1 ? ' acc-book__step--active' : ''}${bookingStep > 1 ? ' acc-book__step--done' : ''}`}
          >
            <span className="acc-book__step-num">1</span>
            <span className="acc-book__step-label">Dates</span>
          </li>
          <li
            className={`acc-book__step${bookingStep === 2 ? ' acc-book__step--active' : ''}${bookingStep > 2 ? ' acc-book__step--done' : ''}`}
          >
            <span className="acc-book__step-num">2</span>
            <span className="acc-book__step-label">Review</span>
          </li>
          <li className={`acc-book__step${bookingStep === 3 ? ' acc-book__step--active' : ''}`}>
            <span className="acc-book__step-num">3</span>
            <span className="acc-book__step-label">Done</span>
          </li>
        </ol>
        <h1 className="display acc-book__title">Hold these dates</h1>
        {listing?.title && <p className="acc-book__listing-name">{listing.title}</p>}
        <p className="acc-book__intro">
          Pick when you&apos;d arrive and leave, and how many people. After that you&apos;ll see a <strong>practice payment only</strong> — your wallet stays untouched in this demo.
        </p>
      </header>

      {err && <div className="error-banner acc-book__error">{err}</div>}

      {!booking && (
        <form
          className="acc-book__form card"
          onSubmit={(e) => {
            e.preventDefault()
            setErr(null)
            createMut.mutate()
          }}
        >
          <div className="field">
            <label className="label" htmlFor="acc-in">
              Check-in
            </label>
            <input id="acc-in" className="input" type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="acc-out">
              Check-out
            </label>
            <input id="acc-out" className="input" type="date" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="acc-guests">
              Guests
            </label>
            <input
              id="acc-guests"
              className="input"
              type="number"
              min={1}
              max={listing?.max_guests ?? 20}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
            <p className="acc-book__hint">Max {listing?.max_guests ?? '—'} guests for this listing.</p>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Continue to review'}
          </button>
        </form>
      )}

      {booking && booking.status === 'pending' && (
        <div className="acc-book__pay card">
          <h2 className="acc-book__pay-title">Review (demo)</h2>
          <p className="acc-book__pay-total">
            <span className="acc-book__pay-label">Total for this practice flow</span>
            <strong>N${booking.total_price}</strong>
          </p>
          <p className="acc-book__pay-note">
            Tapping below runs a <strong>simulated</strong> payment — like trying on the experience. No bank or card is charged in DELVE today.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => payMut.mutate(booking.id)} disabled={payMut.isPending}>
            {payMut.isPending ? 'Processing…' : 'Run practice payment'}
          </button>
        </div>
      )}

      {booking && booking.status === 'confirmed' && (
        <div className="acc-book__success card">
          <h2 className="acc-book__success-title">Flow complete</h2>
          <p className="acc-book__success-text">
            In a live product, you&apos;d get a confirmation for you and the host. Here, you&apos;ve seen the full path — same care, no real money moved.
          </p>
          <p className="acc-book__ref">
            Reference: <code>{booking.mock_payment_ref}</code>
          </p>
          <Link to="/accommodation" className="btn btn-primary btn-block">
            Explore more stays
          </Link>
        </div>
      )}

      <button type="button" className="btn btn-ghost btn-block acc-book__cancel" onClick={() => nav(-1)}>
        Go back
      </button>
    </div>
  )
}
