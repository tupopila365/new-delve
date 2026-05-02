import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Listing = {
  id: number
  title: string
  region: string
  city: string
  price_per_night: string
  max_guests: number
  cover_image: string | null
  owner_username?: string | null
  cancellation_policy?: string | null
  room_types?: unknown
}

type RoomTypeItem = {
  name: string
  description: string
  max_guests: number | null
  bedrooms: number | null
  bed_summary: string
  price_per_night: string | null
  image: string | null
  images: string[]
}

function parseOptionalUint(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v)
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    return Number.isNaN(n) || n < 0 ? null : n
  }
  return null
}

function parseRoomPrice(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string') {
    const s = v.trim()
    return s ? s : null
  }
  return null
}

function normalizeRoomTypes(raw: unknown): RoomTypeItem[] {
  if (!Array.isArray(raw)) return []
  const out: RoomTypeItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!name) continue
    const description = typeof o.description === 'string' ? o.description.trim() : ''
    const bed_summary = typeof o.bed_summary === 'string' ? o.bed_summary.trim() : ''
    const imgRaw = o.image ?? o.photo
    const image = typeof imgRaw === 'string' && imgRaw.trim() ? imgRaw.trim() : null
    const rawImgs = o.images ?? o.gallery ?? o.photos
    let images: string[] = []
    if (Array.isArray(rawImgs)) {
      images = (rawImgs as unknown[])
        .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        .map((x) => x.trim())
    }
    if (images.length === 0 && image) images = [image]

    out.push({
      name,
      description,
      max_guests: parseOptionalUint(o.max_guests),
      bedrooms: parseOptionalUint(o.bedrooms),
      bed_summary,
      price_per_night: parseRoomPrice(o.price_per_night),
      image,
      images,
    })
  }
  return out
}

type Booking = {
  id: number
  status: string
  total_price: string
  mock_payment_ref: string
  check_in: string
  check_out: string
  guests: number
  listing_title?: string
  special_requests?: string
}

function nightsBetween(checkIn: string, checkOut: string): number | null {
  if (!checkIn || !checkOut) return null
  const a = new Date(`${checkIn}T12:00:00`)
  const b = new Date(`${checkOut}T12:00:00`)
  const diff = b.getTime() - a.getTime()
  const n = Math.round(diff / (1000 * 60 * 60 * 24))
  return n > 0 ? n : null
}

function formatStayDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatStayRange(checkIn: string, checkOut: string) {
  return `${formatStayDate(checkIn)} → ${formatStayDate(checkOut)}`
}

function googleCalendarUrl(opts: { title: string; details: string; checkIn: string; checkOut: string }) {
  const toG = (d: string) => d.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    details: opts.details,
    dates: `${toG(opts.checkIn)}/${toG(opts.checkOut)}`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const DEFAULT_CANCEL_BLURB =
  'Free cancellation up to 48 hours before check-in (demo — confirm with your host).'

export function AccommodationBook() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const roomName = searchParams.get('room') ?? ''
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])

  const { data: listing, isLoading } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<Listing>(`/api/accommodation/listings/${id}/`, { auth: false }),
  })

  const roomTypes = useMemo(() => normalizeRoomTypes(listing?.room_types), [listing?.room_types])

  const selectedRoom = useMemo(
    () => roomTypes.find((r) => r.name === roomName),
    [roomTypes, roomName],
  )

  const maxGuests = useMemo(() => {
    if (!listing) return 1
    if (selectedRoom?.max_guests != null) {
      return Math.min(listing.max_guests, selectedRoom.max_guests)
    }
    return listing.max_guests
  }, [listing, selectedRoom])

  useEffect(() => {
    setGuests((g) => Math.min(g, maxGuests))
  }, [maxGuests])

  const nightlyRate = useMemo(() => {
    const raw = selectedRoom?.price_per_night ?? listing?.price_per_night
    if (raw == null || raw === '') return null
    const price = parseFloat(String(raw))
    if (Number.isNaN(price)) return null
    return price
  }, [listing, selectedRoom])

  const rateLabel = selectedRoom?.price_per_night ?? listing?.price_per_night ?? ''

  const estimatedTotal = useMemo(() => {
    if (!nights || nightlyRate == null) return null
    return (nightlyRate * nights).toFixed(2)
  }, [nights, nightlyRate])

  const cancellationBlurb = listing?.cancellation_policy?.trim() || DEFAULT_CANCEL_BLURB

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<Booking>('/api/accommodation/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          listing: Number(id),
          check_in: checkIn,
          check_out: checkOut,
          guests,
          special_requests: specialRequests.trim(),
          room_type_name: selectedRoom?.name,
        }),
      }),
    onSuccess: (b) => {
      setBooking(b)
      void qc.invalidateQueries({ queryKey: ['acc-bookings'] })
    },
    onError: (e) =>
      setErr(e instanceof ApiError ? e.message : "We couldn't save that request. Try again in a moment."),
  })

  const payMut = useMutation({
    mutationFn: (bid: number) =>
      apiFetch<{ status: string; mock_payment_ref: string }>(
        `/api/accommodation/bookings/${bid}/mock_pay/`,
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: (r) => {
      setBooking((b) => (b ? { ...b, status: r.status, mock_payment_ref: r.mock_payment_ref } : b))
    },
    onError: (e) =>
      setErr(e instanceof ApiError ? e.message : "The practice payment didn't go through. You can try again."),
  })

  if (isLoading || !listing) {
    return (
      <div className="acc-page acc-page--detail">
        <div className="skeleton acc-page__detail-skeleton" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="acc-page acc-page--detail">
        <div className="card" style={{ padding: '1.25rem' }}>
          <Link to={`/accommodation/${id}`} className="acc-book__back">
            ← Back to listing
          </Link>
          <h1 className="display" style={{ fontSize: '1.5rem', marginTop: 8 }}>
            Sign in to book
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
            A free account lets the host know who&apos;s coming. Browsing stays is open to everyone — sign in when
            you&apos;re ready to hold dates.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <Link to="/login" className="btn btn-primary btn-block">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-ghost btn-block">
              Create free account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!profile.email_verified) {
    return (
      <div className="acc-page acc-page--detail">
        <div className="card" style={{ padding: '1.25rem' }}>
          <Link to={`/accommodation/${id}`} className="acc-book__back">
            ← Back to listing
          </Link>
          <h1 className="display" style={{ fontSize: '1.5rem', marginTop: 8 }}>
            Verify your email
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, lineHeight: 1.5 }}>
            A confirmed address helps hosts reach you about your stay.
          </p>
          <Link to="/verify-email" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
            Verify email
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!checkIn || !checkOut) {
      setErr('Please choose check-in and check-out dates.')
      return
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setErr('Check-out must be after check-in.')
      return
    }
    if (guests > maxGuests) {
      setErr(`This booking allows up to ${maxGuests} guests.`)
      return
    }
    createMut.mutate()
  }

  const bookingStep = booking?.status === 'confirmed' ? 3 : booking ? 2 : 1
  const today = new Date().toISOString().split('T')[0]

  const calUrl =
    booking && checkIn && checkOut
      ? googleCalendarUrl({
          title: `Stay: ${listing.title}`,
          details: `DELVE booking (demo). ${booking.guests} guest(s). Ref will appear after payment.`,
          checkIn,
          checkOut,
        })
      : ''

  const displayTitle = booking?.listing_title || listing.title
  const areaLine = [listing.city, listing.region].filter(Boolean).join(' · ')

  return (
    <div className="acc-page acc-page--detail">
      <Link to={`/accommodation/${id}`} className="acc-book__back">
        ← Back to listing
      </Link>

      {listing.cover_image ? (
        <div className="acc-detail__hero">
          <img className="acc-detail__hero-img" src={mediaUrl(listing.cover_image) || ''} alt="" />
        </div>
      ) : (
        <div className="acc-detail__hero acc-detail__hero--placeholder" aria-hidden>
          Stay
        </div>
      )}

      <h1 className="acc-detail__title" style={{ marginTop: 0 }}>
        Book · {listing.title}
      </h1>
      <p className="acc-detail__reassure">
        {listing.city}
        {listing.region ? ` · ${listing.region}` : ''}
      </p>

      <ol className="acc-book__steps" aria-label="Booking steps" style={{ margin: '20px 0' }}>
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

      {err ? <div className="error-banner">{err}</div> : null}

      {!booking && (
        <form className="acc-book__form card" onSubmit={handleSubmit}>
          <p className="acc-book__rate-hint">
            From <strong>N${rateLabel}</strong> / night · up to {maxGuests} guests
            {selectedRoom ? (
              <span className="acc-book__rate-hint-room"> · {selectedRoom.name}</span>
            ) : null}
          </p>

          {selectedRoom ? (
            <div className="acc-book__room-pick card">
              <div className="acc-book__room-pick-visual">
                {selectedRoom.images[0] || selectedRoom.image ? (
                  <img
                    className="acc-book__room-pick-img"
                    src={mediaUrl(selectedRoom.images[0] || selectedRoom.image || '') || ''}
                    alt=""
                  />
                ) : (
                  <div className="acc-book__room-pick-img acc-book__room-pick-img--ph" aria-hidden>
                    Room
                  </div>
                )}
              </div>
              <div className="acc-book__room-pick-body">
                <h2 className="acc-book__room-pick-name">{selectedRoom.name}</h2>
                <p className="acc-book__room-pick-meta">
                  {[
                    selectedRoom.max_guests != null ? `Up to ${selectedRoom.max_guests} guests` : null,
                    selectedRoom.bedrooms != null
                      ? `${selectedRoom.bedrooms} ${selectedRoom.bedrooms === 1 ? 'bedroom' : 'bedrooms'}`
                      : null,
                    selectedRoom.bed_summary || null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="acc-book__room-pick-price">
                  <strong>N${selectedRoom.price_per_night ?? listing.price_per_night}</strong>
                  <span> / night</span>
                </p>
              </div>
            </div>
          ) : null}

          <div className="field">
            <label className="label" htmlFor="acc-check-in">
              Check-in
            </label>
            <input
              id="acc-check-in"
              className="input"
              type="date"
              required
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="acc-check-out">
              Check-out
            </label>
            <input
              id="acc-check-out"
              className="input"
              type="date"
              required
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>

          <div className="field">
            <span className="label" id="acc-guests-label">
              Guests
            </span>
            <div className="acc-book__guest-stepper" role="group" aria-labelledby="acc-guests-label">
              <button
                type="button"
                className="acc-book__guest-btn"
                aria-label="Fewer guests"
                disabled={guests <= 1}
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
              >
                −
              </button>
              <span className="acc-book__guest-value">{guests}</span>
              <button
                type="button"
                className="acc-book__guest-btn"
                aria-label="More guests"
                disabled={guests >= maxGuests}
                onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
              >
                +
              </button>
            </div>
            <p className="acc-book__hint">Maximum {maxGuests} for this booking.</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="acc-special">
              Special requests <span className="acc-book__optional">(optional)</span>
            </label>
            <textarea
              id="acc-special"
              className="input"
              rows={3}
              placeholder="Arrival time, early check-in, dietary needs, accessibility…"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
            />
          </div>

          {nights != null && nightlyRate != null && estimatedTotal ? (
            <div className="acc-book__breakdown card acc-book__breakdown--inset" role="region" aria-label="Price estimate">
              <p className="acc-book__breakdown-line">
                <span>
                  {nights} {nights === 1 ? 'night' : 'nights'} × N${nightlyRate.toFixed(2)}
                </span>
                <span className="acc-book__breakdown-eq">=</span>
                <span className="acc-book__breakdown-total">N${estimatedTotal}</span>
              </p>
              <p className="acc-book__breakdown-sub">Taxes and fees may apply — host confirms the final amount.</p>
            </div>
          ) : null}

          <p className="acc-book__avail-note" role="note">
            <span className="acc-book__avail-icon" aria-hidden>
              ℹ
            </span>
            Availability is subject to host confirmation — this is a practice flow; no real payment today.
          </p>

          <button type="submit" className="btn btn-primary btn-block" disabled={createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Continue to review'}
          </button>
        </form>
      )}

      {booking?.status === 'pending' && (
        <div className="acc-book__pay card">
          <div className="acc-book__review-summary">
            {listing.cover_image ? (
              <img
                className="acc-book__review-thumb"
                src={mediaUrl(listing.cover_image) || ''}
                alt=""
              />
            ) : (
              <div className="acc-book__review-thumb acc-book__review-thumb--ph" aria-hidden>
                Stay
              </div>
            )}
            <div className="acc-book__review-head">
              <h2 className="acc-book__review-title">{displayTitle}</h2>
              {areaLine ? <p className="acc-book__review-area">{areaLine}</p> : null}
            </div>
          </div>

          <dl className="acc-book__review-dl">
            <div>
              <dt>Stay</dt>
              <dd>{formatStayRange(booking.check_in, booking.check_out)}</dd>
            </div>
            <div>
              <dt>Nights</dt>
              <dd>
                {(() => {
                  const n = nightsBetween(booking.check_in, booking.check_out)
                  return n != null ? `${n} ${n === 1 ? 'night' : 'nights'}` : '—'
                })()}
              </dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{booking.guests}</dd>
            </div>
            <div>
              <dt>Room</dt>
              <dd>{selectedRoom?.name ?? 'Standard'}</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>N${rateLabel} / night</dd>
            </div>
            {booking.special_requests ? (
              <div className="acc-book__review-dl--full">
                <dt>Your note</dt>
                <dd>{booking.special_requests}</dd>
              </div>
            ) : null}
          </dl>

          <p className="acc-book__cancel-note">
            <strong>Cancellation</strong> — {cancellationBlurb}
          </p>

          <h3 className="acc-book__pay-title">Review &amp; pay (demo)</h3>
          <p className="acc-book__pay-total">
            <span className="acc-book__pay-label">Total for this practice flow</span>
            <strong>N${booking.total_price}</strong>
          </p>
          <p className="acc-book__pay-note">
            Tapping below runs a <strong>simulated</strong> payment — like trying on the experience. No bank or card is
            charged in DELVE today.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => payMut.mutate(booking.id)}
            disabled={payMut.isPending}
          >
            {payMut.isPending ? 'Processing…' : 'Run practice payment'}
          </button>
        </div>
      )}

      {booking?.status === 'confirmed' && (
        <div className="acc-book__confirm card">
          <p className="acc-book__confirm-badge">Confirmed</p>
          <h2 className="acc-book__confirm-title">{displayTitle}</h2>
          {areaLine ? <p className="acc-book__confirm-area">{areaLine}</p> : null}

          <div className="acc-book__confirm-checkin">
            <span className="acc-book__confirm-checkin-label">Check-in</span>
            <time className="acc-book__confirm-checkin-date" dateTime={booking.check_in}>
              {formatStayDate(booking.check_in)}
            </time>
            <span className="acc-book__confirm-meta">
              {formatStayRange(booking.check_in, booking.check_out)} · {booking.guests}{' '}
              {booking.guests === 1 ? 'guest' : 'guests'}
            </span>
          </div>

          {booking.special_requests ? (
            <p className="acc-book__confirm-note">
              <strong>Your requests:</strong> {booking.special_requests}
            </p>
          ) : null}

          <p className="acc-book__ref">
            Reference <code>{booking.mock_payment_ref}</code>
          </p>

          <div className="acc-book__confirm-actions">
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-block"
            >
              Save to Google Calendar
            </a>
            <Link to="/messages" className="btn btn-ghost btn-block">
              Messages — contact your host
            </Link>
            {listing.owner_username ? (
              <Link to={`/u/${encodeURIComponent(listing.owner_username)}`} className="btn btn-ghost btn-block">
                View @{listing.owner_username}
              </Link>
            ) : null}
          </div>

          <p className="acc-book__success-text acc-book__confirm-foot">
            In a live product you&apos;d get door codes and check-in instructions here — this demo didn&apos;t charge
            you.
          </p>

          <Link to="/accommodation" className="btn btn-primary btn-block acc-book__confirm-browse">
            Browse more stays
          </Link>
        </div>
      )}

      <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={() => nav(-1)}>
        Go back
      </button>
    </div>
  )
}
