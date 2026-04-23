import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Trip = {
  id: number
  total_seats: number
  price: string
  departs_at: string
  route_detail: { origin: string; destination: string }
  available_seats: number
}

type Res = { id: number; seat_number: number; status: string; mock_payment_ref: string }

export function BusTripDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [seat, setSeat] = useState<number | null>(null)
  const [reservation, setReservation] = useState<Res | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: trip } = useQuery({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => apiFetch<Trip>(`/api/transport/bus/trips/${id}/`, { auth: false }),
  })

  const bookMut = useMutation({
    mutationFn: () =>
      apiFetch<Res>('/api/transport/bus/reservations/', {
        method: 'POST',
        body: JSON.stringify({ trip: Number(id), seat_number: seat }),
      }),
    onSuccess: setReservation,
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Failed'),
  })

  const payMut = useMutation({
    mutationFn: (rid: number) =>
      apiFetch<{ status: string; mock_payment_ref: string }>(`/api/transport/bus/reservations/${rid}/mock_pay/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (r) => {
      setReservation((prev) => (prev ? { ...prev, status: r.status, mock_payment_ref: r.mock_payment_ref } : prev))
    },
  })

  if (!trip) return <div className="skeleton" style={{ height: 200 }} />

  if (!profile) {
    return (
      <p>
        <Link to="/login">Sign in</Link> to book a seat.
      </p>
    )
  }
  if (!profile.email_verified) {
    return <div className="error-banner">Verify email to book. <Link to="/verify-email">Verify</Link></div>
  }

  const seats = Array.from({ length: trip.total_seats }, (_, i) => i + 1)

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.35rem' }}>
        {trip.route_detail.origin} → {trip.route_detail.destination}
      </h1>
      <p>{new Date(trip.departs_at).toLocaleString()}</p>
      <p style={{ fontWeight: 800 }}>N${trip.price} · {trip.available_seats} seats left</p>
      {err && <div className="error-banner">{err}</div>}
      {!reservation && (
        <>
          <p style={{ fontWeight: 700, marginTop: '1rem' }}>Pick a seat</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {seats.map((n) => (
              <button
                key={n}
                type="button"
                className={`chip ${seat === n ? 'active' : ''}`}
                onClick={() => setSeat(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            disabled={!seat || bookMut.isPending}
            onClick={() => {
              setErr(null)
              bookMut.mutate()
            }}
          >
            Reserve seat
          </button>
        </>
      )}
      {reservation?.status === 'pending' && (
        <div className="card" style={{ padding: '1rem', marginTop: 12 }}>
          <p>
            Seat {reservation.seat_number} · Pay N${trip.price} (mock)
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => payMut.mutate(reservation.id)}>
            Pay now (mock)
          </button>
        </div>
      )}
      {reservation?.status === 'confirmed' && (
        <div className="card" style={{ padding: '1rem', background: '#ecfdf5', marginTop: 12 }}>
          Ticket confirmed · ref {reservation.mock_payment_ref}
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => nav(-1)}>
        Back
      </button>
    </div>
  )
}
