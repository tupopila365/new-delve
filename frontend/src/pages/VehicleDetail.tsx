import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Booking = { id: number; status: string; total_price: string; mock_payment_ref: string }

export function VehicleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: v } = useQuery({
    queryKey: ['veh', id],
    enabled: !!id,
    queryFn: () =>
      apiFetch<{ title: string; price_per_day: string; cover_image: string | null; region: string }>(
        `/api/transport/vehicles/${id}/`,
        { auth: false },
      ),
  })

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<Booking>('/api/transport/vehicle-bookings/', {
        method: 'POST',
        body: JSON.stringify({ listing: Number(id), start_date: start, end_date: end }),
      }),
    onSuccess: setBooking,
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Failed'),
  })

  const payMut = useMutation({
    mutationFn: (bid: number) =>
      apiFetch<{ status: string; mock_payment_ref: string }>(`/api/transport/vehicle-bookings/${bid}/mock_pay/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (r) => {
      setBooking((b) => (b ? { ...b, status: r.status, mock_payment_ref: r.mock_payment_ref } : b))
    },
  })

  if (!v) return <div className="skeleton" style={{ height: 200 }} />

  if (!profile) {
    return (
      <p>
        <Link to="/login">Sign in</Link> to rent.
      </p>
    )
  }
  if (!profile.email_verified) {
    return <div className="error-banner">Verify email to book. <Link to="/verify-email">Verify</Link></div>
  }

  return (
    <div>
      {v.cover_image && <img src={mediaUrl(v.cover_image)} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 220, objectFit: 'cover' }} />}
      <h1 className="display" style={{ fontSize: '1.5rem' }}>{v.title}</h1>
      <p style={{ color: 'var(--text-secondary)' }}>{v.region}</p>
      <p style={{ fontWeight: 900, color: 'var(--accent-hover)' }}>N${v.price_per_day} / day</p>
      {err && <div className="error-banner">{err}</div>}
      {!booking && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setErr(null)
            createMut.mutate()
          }}
        >
          <div className="field">
            <label className="label">Start</label>
            <input className="input" type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">End</label>
            <input className="input" type="date" required value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={createMut.isPending}>
            Continue to mock payment
          </button>
        </form>
      )}
      {booking?.status === 'pending' && (
        <div className="card" style={{ padding: '1rem', marginTop: 12 }}>
          <p>
            Total: <strong>N${booking.total_price}</strong>
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => payMut.mutate(booking.id)}>
            Pay now (mock)
          </button>
        </div>
      )}
      {booking?.status === 'confirmed' && (
        <div className="card" style={{ padding: '1rem', background: '#ecfdf5', marginTop: 12 }}>
          Confirmed · {booking.mock_payment_ref}
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => nav(-1)}>
        Back
      </button>
    </div>
  )
}
