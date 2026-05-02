import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Trip = {
  id: number
  total_seats: number
  price: string
  departs_at: string
  arrives_at?: string | null
  route_detail: {
    origin: string
    destination: string
    operator_name: string
    cover_image?: string | null
    gallery_images?: string[] | null
    distance_km?: number | null
    duration_minutes?: number | null
  }
  available_seats: number
  occupied_seats: number[]
  amenities?: string[] | null
}

type Reservation = {
  id: number
  seat_number: number
  status: string
  mock_payment_ref: string
}

type GroupReserveResponse = {
  reservations: Reservation[]
  total_price: string
  seat_count: number
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-NA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

function seatsUrgency(n: number): 'low' | 'mid' | 'high' {
  if (n <= 3) return 'high'
  if (n <= 8) return 'mid'
  return 'low'
}

function amenityEmoji(label: string): string {
  const x = label.toLowerCase()
  if (x.includes('wifi')) return '📶'
  if (x.includes('air') || x.includes('ac')) return '🧊'
  if (x.includes('toilet') || x.includes('restroom')) return '🚻'
  if (x.includes('luggage') || x.includes('bag')) return '🎒'
  if (x.includes('usb') || x.includes('charging') || x.includes('power')) return '🔌'
  return '✓'
}

export function BusTripDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [passengers, setPassengers] = useState(1)
  const [firstSeat, setFirstSeat] = useState<number | null>(null)
  const [activePhoto, setActivePhoto] = useState(0)
  const [group, setGroup] = useState<GroupReserveResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => apiFetch<Trip>(`/api/transport/bus/trips/${id}/`, { auth: false }),
  })

  const taken = useMemo(() => new Set(trip?.occupied_seats ?? []), [trip?.occupied_seats])

  const blockSeats = useMemo(() => {
    if (firstSeat == null || !trip) return []
    const out: number[] = []
    for (let i = 0; i < passengers; i += 1) {
      const n = firstSeat + i
      if (n > trip.total_seats) return []
      out.push(n)
    }
    return out
  }, [firstSeat, passengers, trip])

  const blockValid = useMemo(() => {
    if (!trip || !blockSeats.length) return false
    if (blockSeats.length !== passengers) return false
    return blockSeats.every((n) => !taken.has(n))
  }, [blockSeats, passengers, taken, trip])

  const galleryPhotos = useMemo(() => {
    if (!trip) return []
    const raw = [...(trip.route_detail.gallery_images ?? [])]
    if (trip.route_detail.cover_image) raw.unshift(trip.route_detail.cover_image)
    const seen = new Set<string>()
    const cleaned: string[] = []
    for (const img of raw) {
      const s = (img || '').trim()
      if (!s || seen.has(s)) continue
      seen.add(s)
      cleaned.push(s)
    }
    return cleaned
  }, [trip])

  useEffect(() => {
    setActivePhoto(0)
  }, [id])

  const bookMut = useMutation({
    mutationFn: () =>
      apiFetch<GroupReserveResponse>('/api/transport/bus/reservations/', {
        method: 'POST',
        body: JSON.stringify({
          trip: Number(id),
          seat_numbers: blockSeats,
        }),
      }),
    onSuccess: (data) => {
      setGroup(data)
      void qc.invalidateQueries({ queryKey: ['trip', id] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "That block couldn't be reserved. Try other seats."),
  })

  const payMut = useMutation({
    mutationFn: async (rows: Reservation[]) => {
      const ids = rows.map((r) => r.id)
      if (ids.length > 1) {
        return apiFetch<{
          status: string
          mock_payment_ref: string
          reservations: Reservation[]
        }>('/api/transport/bus/reservations/bulk-mock-pay/', {
          method: 'POST',
          body: JSON.stringify({ reservation_ids: ids }),
        })
      }
      return apiFetch<{ status: string; mock_payment_ref: string }>(
        `/api/transport/bus/reservations/${ids[0]}/mock_pay/`,
        { method: 'POST', body: JSON.stringify({}) },
      )
    },
    onSuccess: (r) => {
      setGroup((g) => {
        if (!g?.reservations.length) return g
        if ('reservations' in r && Array.isArray(r.reservations)) {
          return { ...g, reservations: r.reservations }
        }
        const paid = r as { status: string; mock_payment_ref: string }
        return {
          ...g,
          reservations: g.reservations.map((x) => ({
            ...x,
            status: paid.status,
            mock_payment_ref: paid.mock_payment_ref,
          })),
        }
      })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "The practice payment didn't go through."),
  })

  if (isLoading || !trip) {
    return (
      <div className="tp-bus-detail">
        <div className="skeleton tp-bus-detail__skeleton" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="tp-bus-detail tp-detail--gate">
        <div className="tp-detail__gate card">
          <Link to="/transport" className="tp-detail__back">← Back to transport</Link>
          <h1 className="display tp-detail__gate-title">Sign in to book</h1>
          <p className="tp-detail__gate-text">
            A free account links your ticket to you. Browsing routes is open to everyone — you only need this step to reserve a seat.
          </p>
          <div className="tp-detail__gate-actions">
            <Link to="/login" className="btn btn-primary btn-block">Sign in</Link>
            <Link to="/register" className="btn btn-ghost btn-block">Create free account</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!profile.email_verified) {
    return (
      <div className="tp-bus-detail tp-detail--gate">
        <div className="tp-detail__gate card">
          <Link to="/transport" className="tp-detail__back">← Back to transport</Link>
          <h1 className="display tp-detail__gate-title">Verify your email</h1>
          <p className="tp-detail__gate-text">
            A confirmed address ensures your ticket reaches you. Quick to do — and you can keep exploring DELVE while you wait.
          </p>
          <Link to="/verify-email" className="btn btn-primary btn-block">Verify email</Link>
        </div>
      </div>
    )
  }

  const dep = formatWhen(trip.departs_at)
  const arr = trip.arrives_at ? formatWhen(trip.arrives_at) : null
  const urgency = seatsUrgency(trip.available_seats)
  const seatNumbers = Array.from({ length: trip.total_seats }, (_, i) => i + 1)

  const firstRes = group?.reservations[0]
  const reservationStep = firstRes?.status === 'confirmed' ? 3 : firstRes ? 2 : 1
  const totalCents = group ? parseFloat(group.total_price) : 0
  const payLabel =
    group && !Number.isNaN(totalCents) ? `N$${Number(group.total_price).toFixed(2)}` : `N$${trip.price}`

  return (
    <div className="tp-bus-detail">
      <Link to="/transport" className="tp-detail__back">← Back to transport</Link>

      {galleryPhotos.length > 0 ? (
        <div className="tp-bus-detail__photo card">
          <img
            className="tp-bus-detail__photo-img"
            src={mediaUrl(galleryPhotos[Math.min(activePhoto, galleryPhotos.length - 1)]) || ''}
            alt={`Bus interior on route ${trip.route_detail.origin} to ${trip.route_detail.destination}`}
          />
          {galleryPhotos.length > 1 && (
            <>
              <button
                type="button"
                className="tp-bus-detail__photo-nav tp-bus-detail__photo-nav--prev"
                aria-label="Previous bus photo"
                onClick={() => setActivePhoto((p) => (p - 1 + galleryPhotos.length) % galleryPhotos.length)}
              >
                ‹
              </button>
              <button
                type="button"
                className="tp-bus-detail__photo-nav tp-bus-detail__photo-nav--next"
                aria-label="Next bus photo"
                onClick={() => setActivePhoto((p) => (p + 1) % galleryPhotos.length)}
              >
                ›
              </button>
              <div className="tp-bus-detail__photo-thumbs" role="tablist" aria-label="Bus gallery">
                {galleryPhotos.map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    role="tab"
                    aria-selected={activePhoto === i}
                    className={`tp-bus-detail__photo-thumb${activePhoto === i ? ' tp-bus-detail__photo-thumb--active' : ''}`}
                    onClick={() => setActivePhoto(i)}
                  >
                    <img src={mediaUrl(img) || ''} alt="" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="tp-bus-detail__route-hero card">
        <div className="tp-bus-detail__route-row">
          <div className="tp-bus-detail__city-block">
            <span className="tp-bus-detail__city-label">From</span>
            <span className="tp-bus-detail__city">{trip.route_detail.origin}</span>
          </div>
          <span className="tp-bus-detail__route-arrow" aria-hidden>→</span>
          <div className="tp-bus-detail__city-block tp-bus-detail__city-block--dest">
            <span className="tp-bus-detail__city-label">To</span>
            <span className="tp-bus-detail__city">{trip.route_detail.destination}</span>
          </div>
        </div>
        <p className="tp-bus-detail__operator">{trip.route_detail.operator_name}</p>
        {(trip.route_detail.distance_km != null || trip.route_detail.duration_minutes != null) && (
          <p className="tp-bus-detail__route-meta">
            {[
              trip.route_detail.distance_km != null ? `${trip.route_detail.distance_km} km` : null,
              trip.route_detail.duration_minutes != null
                ? `≈ ${Math.floor(trip.route_detail.duration_minutes / 60)}h ${trip.route_detail.duration_minutes % 60}m`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {trip.amenities && trip.amenities.length > 0 && (
          <p className="tp-bus-detail__amenities" aria-label="Onboard amenities">
            {trip.amenities.map((a) => (
              <span key={a} className="tp-bus-detail__amenity-chip">
                <span aria-hidden>{amenityEmoji(a)}</span> {a}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="tp-bus-detail__info card">
        <div className="tp-bus-detail__info-row tp-bus-detail__info-row--split">
          <div className="tp-bus-detail__info-block">
            <span className="tp-bus-detail__info-label">Departure</span>
            <span className="tp-bus-detail__info-date">{dep.date}</span>
            <span className="tp-bus-detail__info-time">{dep.time}</span>
          </div>
          {arr && (
            <div className="tp-bus-detail__info-block tp-bus-detail__info-block--arrival">
              <span className="tp-bus-detail__info-label">Arrival</span>
              <span className="tp-bus-detail__info-date">{arr.date}</span>
              <span className="tp-bus-detail__info-time">{arr.time}</span>
            </div>
          )}
          <div className="tp-bus-detail__info-block tp-bus-detail__info-block--right">
            <span className="tp-bus-detail__info-label">Price per seat</span>
            <span className="tp-bus-detail__info-price">N${trip.price}</span>
            <span className={`tp-bus-detail__seats-badge tp-bus-detail__seats-badge--${urgency}`}>
              {trip.available_seats} {trip.available_seats === 1 ? 'seat' : 'seats'} left
            </span>
          </div>
        </div>
      </div>

      {err && <div className="error-banner">{err}</div>}

      <div className="tp-bus-detail__flow">
        <ol className="acc-book__steps" aria-label="Booking steps">
          <li className={`acc-book__step${reservationStep === 1 ? ' acc-book__step--active' : ''}${reservationStep > 1 ? ' acc-book__step--done' : ''}`}>
            <span className="acc-book__step-num">1</span>
            <span className="acc-book__step-label">Seats</span>
          </li>
          <li className={`acc-book__step${reservationStep === 2 ? ' acc-book__step--active' : ''}${reservationStep > 2 ? ' acc-book__step--done' : ''}`}>
            <span className="acc-book__step-num">2</span>
            <span className="acc-book__step-label">Pay</span>
          </li>
          <li className={`acc-book__step${reservationStep === 3 ? ' acc-book__step--active' : ''}`}>
            <span className="acc-book__step-num">3</span>
            <span className="acc-book__step-label">Ticket</span>
          </li>
        </ol>

        {!firstRes && (
          <div className="tp-bus-detail__seat-section card">
            <h2 className="tp-bus-detail__seat-heading">Passengers & seats</h2>
            <div className="tp-bus-detail__pax-row">
              <label className="tp-bus-detail__pax-label" htmlFor="bus-pax">
                How many passengers?
              </label>
              <div className="tp-bus-detail__pax-stepper">
                <button
                  type="button"
                  className="tp-bus-detail__pax-btn"
                  aria-label="Fewer passengers"
                  disabled={passengers <= 1}
                  onClick={() => {
                    setPassengers((p) => Math.max(1, p - 1))
                    setFirstSeat(null)
                  }}
                >
                  −
                </button>
                <span id="bus-pax" className="tp-bus-detail__pax-value">
                  {passengers}
                </span>
                <button
                  type="button"
                  className="tp-bus-detail__pax-btn"
                  aria-label="More passengers"
                  disabled={passengers >= 4}
                  onClick={() => {
                    setPassengers((p) => Math.min(4, p + 1))
                    setFirstSeat(null)
                  }}
                >
                  +
                </button>
              </div>
            </div>
            <p className="tp-bus-detail__seat-hint">
              We reserve one adjacent block of {passengers} {passengers === 1 ? 'seat' : 'seats'}. Tap the{' '}
              <strong>first</strong> seat in your row ({trip.available_seats} of {trip.total_seats} seats still free).
            </p>

            <div className="tp-seat-map" role="group" aria-label="Seat map">
              {seatNumbers.map((n) => {
                const isTaken = taken.has(n)
                const inBlock = blockSeats.includes(n)
                const isSelectedStart = firstSeat === n
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isTaken}
                    className={`tp-seat${inBlock && blockValid ? ' tp-seat--in-block' : ''}${isSelectedStart ? ' tp-seat--selected' : ''}${isTaken ? ' tp-seat--taken' : ''}`}
                    aria-pressed={isSelectedStart}
                    aria-label={isTaken ? `Seat ${n} taken` : `Seat ${n}${inBlock ? ', in your block' : ''}`}
                    onClick={() => {
                      if (isTaken) return
                      setFirstSeat(n === firstSeat ? null : n)
                    }}
                  >
                    {n}
                  </button>
                )
              })}
            </div>

            {firstSeat != null && (
              <p className="tp-bus-detail__block-hint" role="status">
                {blockValid ? (
                  <>
                    Seats <strong>{blockSeats.join(', ')}</strong> — adjacent block.
                  </>
                ) : (
                  <span className="tp-bus-detail__block-hint--warn">
                    One or more seats in this block are taken — pick another first seat.
                  </span>
                )}
              </p>
            )}

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!blockValid || bookMut.isPending}
              onClick={() => {
                setErr(null)
                bookMut.mutate()
              }}
            >
              {bookMut.isPending
                ? 'Reserving…'
                : blockValid
                  ? `Reserve seats (${passengers})`
                  : 'Choose an available block'}
            </button>
          </div>
        )}

        {firstRes?.status === 'pending' && group && (
          <div className="tp-bus-detail__pay card">
            <h2 className="acc-book__pay-title">Review (demo)</h2>
            <div className="tp-bus-detail__ticket-preview">
              <div className="tp-bus-detail__ticket-route">
                {trip.route_detail.origin} → {trip.route_detail.destination}
              </div>
              <div className="tp-bus-detail__ticket-meta">
                Seats {group.reservations.map((r) => r.seat_number).sort((a, b) => a - b).join(', ')} · {dep.time},{' '}
                {dep.date}
              </div>
            </div>
            <p className="acc-book__pay-total">
              <span className="acc-book__pay-label">Total for this practice flow</span>
              <strong>{payLabel}</strong>
            </p>
            <p className="acc-book__pay-note">
              This is a <strong>simulated</strong> payment — no real charge is made today.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                setErr(null)
                payMut.mutate(group.reservations)
              }}
              disabled={payMut.isPending}
            >
              {payMut.isPending ? 'Processing…' : 'Run practice payment'}
            </button>
          </div>
        )}

        {firstRes?.status === 'confirmed' && group && (
          <div className="tp-bus-ticket tp-bus-ticket--confirmed">
            <div className="tp-bus-ticket__tear" aria-hidden />
            <div className="tp-bus-ticket__body">
              <p className="tp-bus-ticket__eyebrow">DELVE · Coach ticket</p>
              <p className="tp-bus-ticket__route">
                {trip.route_detail.origin} → {trip.route_detail.destination}
              </p>
              <div className="tp-bus-ticket__qr" aria-hidden>
                <span className="tp-bus-ticket__qr-placeholder">QR</span>
              </div>
              <dl className="tp-bus-ticket__dl">
                <div>
                  <dt>Departs</dt>
                  <dd>
                    {dep.time} · {dep.date}
                  </dd>
                </div>
                {arr && (
                  <div>
                    <dt>Arrives</dt>
                    <dd>
                      {arr.time} · {arr.date}
                    </dd>
                  </div>
                )}
                <div className="tp-bus-ticket__seats">
                  <dt>Seats</dt>
                  <dd>{group.reservations.map((r) => r.seat_number).sort((a, b) => a - b).join(', ')}</dd>
                </div>
              </dl>
              <p className="tp-bus-ticket__ref">
                Ref <code>{firstRes.mock_payment_ref}</code>
              </p>
            </div>
            <p className="tp-bus-ticket__fineprint">
              Simulated ticket — in production you’d scan this at boarding. Nothing was charged.
            </p>
            <Link to="/transport" className="btn btn-primary btn-block tp-bus-ticket__cta">
              Browse more routes
            </Link>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-block tp-detail__back-btn"
        onClick={() => nav(-1)}
      >
        Go back
      </button>
    </div>
  )
}
