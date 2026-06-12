import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { buildBusGalleryItems, TransportGallery } from '../components/TransportGallery'

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

type RouteStop = {
  place: string
  label: string
  time: string | null
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-NA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

function tripDurationLabel(departs: string, arrives?: string | null): string {
  if (!arrives) return ''
  const ms = new Date(arrives).getTime() - new Date(departs).getTime()
  if (ms <= 0) return ''
  const mins = Math.round(ms / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

function routeTimelineStops(trip: Trip, depTime: string, arrTime: string | null): RouteStop[] {
  const { origin, destination } = trip.route_detail
  let middle: string | null = null
  if (origin === 'Windhoek' && destination === 'Swakopmund') middle = 'Rehoboth'
  if (origin === 'Windhoek' && destination === 'Oshakati') middle = 'Otjiwarongo'
  if (origin === 'Swakopmund' && destination === 'Walvis Bay') middle = 'Langstrand'

  const stops: RouteStop[] = [{ place: origin, label: 'Departure', time: depTime }]
  if (middle) stops.push({ place: middle, label: 'Short stop', time: null })
  stops.push({ place: destination, label: 'Arrival', time: arrTime })
  return stops
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
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [passengers, setPassengers] = useState(1)
  const [seatPref, setSeatPref] = useState('any')
  const [firstSeat, setFirstSeat] = useState<number | null>(null)
  const [group, setGroup] = useState<GroupReserveResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => apiFetch<Trip>(`/api/transport/bus/trips/${id}/`, { auth: false }),
  })

  const galleryItems = useMemo(
    () =>
      trip
        ? buildBusGalleryItems(trip.route_detail.cover_image, trip.route_detail.gallery_images)
        : [],
    [trip],
  )

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

  const totalPrice = useMemo(() => {
    if (!trip) return null
    return (Number(trip.price) * passengers).toFixed(0)
  }, [trip, passengers])

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

  const onShare = async (title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${title} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  const handleBook = () => {
    setErr(null)
    if (!profile) {
      nav('/login')
      return
    }
    if (!profile.email_verified) {
      nav('/verify-email')
      return
    }
    if (!blockValid) {
      document.getElementById('bus-seats')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setErr('Choose an available seat block first.')
      return
    }
    bookMut.mutate()
  }

  if (isLoading || !trip) {
    return (
      <div className="tp-detail tp-detail--premium">
        <div className="skeleton tp-detail__skeleton" />
      </div>
    )
  }

  const dep = formatWhen(trip.departs_at)
  const arr = trip.arrives_at ? formatWhen(trip.arrives_at) : null
  const duration = tripDurationLabel(trip.departs_at, trip.arrives_at)
  const routeTitle = `${trip.route_detail.origin} → ${trip.route_detail.destination}`
  const timeline = routeTimelineStops(trip, dep.time, arr?.time ?? null)
  const urgency = seatsUrgency(trip.available_seats)
  const seatNumbers = Array.from({ length: trip.total_seats }, (_, i) => i + 1)
  const firstRes = group?.reservations[0]
  const canBook = !firstRes || firstRes.status === 'pending'
  const payLabel = group ? `N$${Number(group.total_price).toFixed(0)}` : `N$${totalPrice}`

  return (
    <div className="tp-detail tp-detail--premium">
      {shareMsg ? (
        <p className="tp-detail__toast" role="status">
          {shareMsg}
        </p>
      ) : null}

      <div className="acc-detail__gallery-wrap">
        <Link to="/transport" className="acc-detail__gallery-back">
          ← Transport
        </Link>
        <div className="acc-detail__gallery-actions">
          <button
            type="button"
            className={`td-hero__action${saved ? ' td-hero__action--saved' : ''}`}
            onClick={() => setSaved((s) => !s)}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
          <button type="button" className="td-hero__action" onClick={() => onShare(routeTitle)}>
            ↗ Share
          </button>
        </div>
        <TransportGallery items={galleryItems} title={routeTitle} emptyLabel="Route photo coming soon" />
      </div>

      <section className="tp-detail__identity detail-section">
        <div className="tp-detail__meta-row">
          <span className="tp-detail__pill">🚌 Bus route</span>
          <span className="tp-detail__pill">{trip.route_detail.operator_name}</span>
          <span className="tp-detail__pill">N${trip.price}</span>
        </div>

        <h1 className="display tp-detail__title">{routeTitle}</h1>

        <p className="tp-detail__summary">
          Departs {dep.date} at {dep.time}
          {duration ? ` · ${duration}` : ''}
        </p>

        <div className="tp-detail__trust-row">
          <span className={`tp-detail__seats-chip tp-detail__seats-chip--${urgency}`}>
            {trip.available_seats} seats left
          </span>
          <span>Operator listed</span>
          <span>Mobile ticket</span>
        </div>

        <div className="tp-detail__social-row">
          <button
            type="button"
            className={saved ? 'tp-detail__social-btn--saved' : ''}
            onClick={() => setSaved((s) => !s)}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
          <button type="button" onClick={() => onShare(routeTitle)}>
            ↗ Share
          </button>
          <button type="button">Ask operator</button>
        </div>
      </section>

      <div className="tp-detail__layout">
        <main className="tp-detail__main">
          <section className="detail-section tp-detail__timeline">
            <h2 className="tp-detail__section-title">Route timeline</h2>
            <div className="tp-route-timeline">
              {timeline.map((stop, i) => (
                <div key={`${stop.place}-${i}`} className="tp-route-stop">
                  <div className="tp-route-stop__rail">
                    <span className="tp-route-stop__dot" aria-hidden />
                    {i < timeline.length - 1 ? <span className="tp-route-stop__line" aria-hidden /> : null}
                  </div>
                  <div className="tp-route-stop__body">
                    <p className="tp-route-stop__place">{stop.place}</p>
                    <p className="tp-route-stop__label">
                      {stop.label}
                      {stop.time ? ` · ${stop.time}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-section tp-detail__departure">
            <h2 className="tp-detail__section-title">Departure & arrival</h2>
            <div className="tp-detail__dep-grid">
              <div>
                <p className="tp-detail__dep-label">Departure</p>
                <p className="tp-detail__dep-time">{dep.time}</p>
                <p className="tp-detail__dep-date">{dep.date}</p>
                <p className="tp-detail__dep-place">{trip.route_detail.origin}</p>
              </div>
              {arr ? (
                <div>
                  <p className="tp-detail__dep-label">Arrival</p>
                  <p className="tp-detail__dep-time">{arr.time}</p>
                  <p className="tp-detail__dep-date">{arr.date}</p>
                  <p className="tp-detail__dep-place">{trip.route_detail.destination}</p>
                </div>
              ) : null}
            </div>
          </section>

          {trip.amenities && trip.amenities.length > 0 && (
            <section className="detail-section tp-detail__amenities-block">
              <h2 className="tp-detail__section-title">Onboard amenities</h2>
              <div className="tp-detail__amenities-grid">
                {trip.amenities.map((a) => (
                  <span key={a}>
                    <span aria-hidden>{amenityEmoji(a)}</span> {a}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="detail-section tp-detail__baggage">
            <h2 className="tp-detail__section-title">Baggage policy</h2>
            <p>
              One large bag and one carry-on per passenger. Oversized luggage should be declared when booking so
              the operator can confirm hold space.
            </p>
          </section>

          <section className="detail-section tp-detail__operator-block">
            <h2 className="tp-detail__section-title">Operator</h2>
            <p className="tp-detail__operator-name">{trip.route_detail.operator_name}</p>
            <p className="tp-detail__operator-copy">
              Listed operator on DELVE — ticket reference and boarding details sent after you book.
            </p>
          </section>

          <section className="detail-section tp-detail__tips">
            <h2 className="tp-detail__section-title">Travel tips</h2>
            <ul className="tp-detail__rules-list">
              <li>Arrive 20 minutes before departure with your ticket reference.</li>
              <li>Keep snacks and water — stops can be brief on longer routes.</li>
              <li>Window seats fill first on popular coastal runs.</li>
            </ul>
          </section>

          <section className="detail-section tp-detail__moments">
            <div className="tp-detail__section-head">
              <div>
                <h2 className="tp-detail__section-title">Delvers moments on this route</h2>
                <p className="tp-detail__section-sub">Window views, boarding tips, and stop recommendations.</p>
              </div>
              <Link to="/delvers">See more</Link>
            </div>
            <div className="tp-detail__moments-grid">
              {galleryItems.slice(0, 2).map((item, i) => (
                <div key={i} className="tp-detail__moment-card">
                  <img src={mediaUrl(item.src) || item.src} alt="" />
                  <p>
                    <strong>@rider{i + 1}</strong> Coastal run — grab a window seat early.
                  </p>
                </div>
              ))}
              <div className="tp-detail__moment-card tp-detail__moment-card--placeholder">
                <div aria-hidden>📸</div>
                <p>
                  <strong>@commuter</strong> Sunrise leaving Windhoek.
                </p>
              </div>
            </div>
          </section>

          {err ? <div className="error-banner">{err}</div> : null}

          {!firstRes && (
            <section id="bus-seats" className="detail-section tp-detail__seats-block">
              <h2 className="tp-detail__section-title">Choose your seats</h2>
              <p className="tp-detail__seat-hint">
                Select the <strong>first seat</strong> in your block — we reserve {passengers}{' '}
                {passengers === 1 ? 'adjacent seat' : 'adjacent seats'} together.
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
                      aria-label={isTaken ? `Seat ${n} taken` : `Seat ${n}`}
                      onClick={() => setFirstSeat(n === firstSeat ? null : n)}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>

              {firstSeat != null && (
                <p className="tp-detail__block-hint" role="status">
                  {blockValid ? (
                    <>
                      Seats <strong>{blockSeats.join(', ')}</strong> — adjacent block.
                    </>
                  ) : (
                    <span className="tp-detail__block-hint--warn">
                      One or more seats in this block are taken — pick another first seat.
                    </span>
                  )}
                </p>
              )}
            </section>
          )}

          {firstRes?.status === 'pending' && group && (
            <section className="detail-section tp-detail__booking-flow">
              <h2 className="tp-detail__section-title">Review (demo)</h2>
              <p className="tp-detail__booking-total">
                Seats {group.reservations.map((r) => r.seat_number).sort((a, b) => a - b).join(', ')} ·{' '}
                <strong>{payLabel}</strong>
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => payMut.mutate(group.reservations)}
                disabled={payMut.isPending}
              >
                {payMut.isPending ? 'Processing…' : 'Run practice payment'}
              </button>
            </section>
          )}

          {firstRes?.status === 'confirmed' && group && (
            <section className="detail-section tp-detail__booking-flow tp-detail__booking-flow--success">
              <h2 className="tp-detail__section-title">Ticket confirmed</h2>
              <p>
                {routeTitle} · Seats{' '}
                {group.reservations.map((r) => r.seat_number).sort((a, b) => a - b).join(', ')}
              </p>
              <p className="tp-detail__booking-ref">
                Ref <code>{firstRes.mock_payment_ref}</code>
              </p>
              <Link to="/transport" className="btn btn-primary btn-block">
                Browse more routes
              </Link>
            </section>
          )}
        </main>

        {canBook && (
          <aside className="tp-detail__sidebar">
            <div className="tp-detail__booking-card">
              <p className="tp-detail__booking-kicker">Book your seat</p>
              <h2>
                <span>N${trip.price}</span>
                <small> / passenger</small>
              </h2>

              <div className="tp-detail__booking-meta">
                <span>{trip.available_seats} seats left</span>
                <span>{trip.route_detail.operator_name}</span>
              </div>

              <div className="tp-detail__booking-fields">
                <label>
                  Passengers
                  <select
                    value={passengers}
                    onChange={(e) => {
                      setPassengers(Number(e.target.value))
                      setFirstSeat(null)
                    }}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'passenger' : 'passengers'}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Seat preference
                  <select value={seatPref} onChange={(e) => setSeatPref(e.target.value)}>
                    <option value="any">Any seat</option>
                    <option value="window">Window</option>
                    <option value="aisle">Aisle</option>
                  </select>
                </label>
              </div>

              <div className="tp-detail__total">
                <span>Total</span>
                <strong>{payLabel}</strong>
              </div>

              <button
                type="button"
                className="btn btn-primary tp-detail__book-btn"
                onClick={handleBook}
                disabled={bookMut.isPending}
              >
                {bookMut.isPending ? 'Reserving…' : 'Book seat'}
              </button>

              <p className="tp-detail__booking-note">{trip.available_seats} seats left on this departure</p>

              {!profile ? (
                <p className="tp-detail__booking-hint">Sign in to complete your booking.</p>
              ) : !profile.email_verified ? (
                <p className="tp-detail__booking-hint">Verify your email to book.</p>
              ) : null}
            </div>
          </aside>
        )}
      </div>

      {canBook && (
        <div className="tp-detail__mobile-bar">
          <div>
            <strong>N${trip.price}/passenger</strong>
            <span>{trip.available_seats} seats left</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleBook} disabled={bookMut.isPending}>
            Book seat
          </button>
        </div>
      )}
    </div>
  )
}
