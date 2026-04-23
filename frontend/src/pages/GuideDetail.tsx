import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function GuideDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState<{ id: number; status: string; total_price: string; mock_payment_ref: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: g } = useQuery({
    queryKey: ['guide', id],
    enabled: !!id,
    queryFn: () =>
      apiFetch<{
        headline: string
        bio: string
        hourly_rate: string | null
        languages: string[]
        regions: string[]
        photo: string | null
        username: string
      }>(`/api/guides/profiles/${id}/`, { auth: false }),
  })

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<{ id: number; status: string; total_price: string; mock_payment_ref: string }>('/api/guides/bookings/', {
        method: 'POST',
        body: JSON.stringify({ guide: Number(id), date, notes }),
      }),
    onSuccess: setBooking,
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Failed'),
  })

  const payMut = useMutation({
    mutationFn: (bid: number) =>
      apiFetch<{ status: string; mock_payment_ref: string }>(`/api/guides/bookings/${bid}/mock_pay/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (r) => {
      setBooking((b) => (b ? { ...b, status: r.status, mock_payment_ref: r.mock_payment_ref } : b))
    },
  })

  if (!g) return <div className="skeleton" style={{ height: 200 }} />

  if (!profile) {
    return (
      <p>
        <Link to="/login">Sign in</Link> to book a guide.
      </p>
    )
  }
  if (!profile.email_verified) {
    return <div className="error-banner">Verify email to book.</div>
  }

  return (
    <div>
      {g.photo && <img src={mediaUrl(g.photo)} alt="" style={{ width: '100%', borderRadius: 14, maxHeight: 220, objectFit: 'cover' }} />}
      <h1 className="display" style={{ fontSize: '1.5rem' }}>{g.headline}</h1>
      <p>@{g.username}</p>
      <p>{g.bio}</p>
      {g.hourly_rate && <p style={{ fontWeight: 800 }}>From N${g.hourly_rate} / hr (mock booking uses 4h slot)</p>}
      <p style={{ fontSize: '0.9rem' }}>Languages: {(g.languages || []).join(', ') || '—'}</p>
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
            <label className="label">Date</label>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={createMut.isPending}>
            Request & pay (mock)
          </button>
        </form>
      )}
      {booking?.status === 'pending' && (
        <div className="card" style={{ padding: '1rem', marginTop: 12 }}>
          <p>
            Total N${booking.total_price}
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => payMut.mutate(booking.id)}>
            Pay now (mock)
          </button>
        </div>
      )}
      {booking?.status === 'confirmed' && (
        <div className="card" style={{ padding: '1rem', background: '#ecfdf5', marginTop: 12 }}>
          Booked · {booking.mock_payment_ref}
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => nav(-1)}>
        Back
      </button>
    </div>
  )
}
