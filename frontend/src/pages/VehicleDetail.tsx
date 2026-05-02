import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Vehicle = {
  id: number
  title: string
  make: string
  model: string
  year?: number | null
  price_per_day: string
  region: string
  city?: string | null
  cover_image: string | null
  description?: string | null
  vehicle_type?: string | null
  seats?: number | null
  transmission?: string | null
  fuel_type?: string | null
  air_conditioning?: boolean | null
  owner_username?: string
  pickup_location?: string | null
  included_features?: string[] | null
  gallery_images?: string[] | null
  owner_display_name?: string | null
  owner_bio?: string | null
  owner_region?: string | null
  owner_city?: string | null
  owner_avatar?: string | null
}

type Booking = {
  id: number
  status: string
  total_price: string
  mock_payment_ref: string
}

/** Inclusive rental days, aligned with backend (end − start in days + 1). */
function rentalDaysInclusive(start: string, end: string): number | null {
  if (!start || !end) return null
  const a = new Date(start)
  const b = new Date(end)
  if (b < a) return null
  const diff = b.getTime() - a.getTime()
  const n = Math.round(diff / (1000 * 60 * 60 * 24)) + 1
  return n > 0 ? n : null
}

export function VehicleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: v, isLoading } = useQuery({
    queryKey: ['veh', id],
    enabled: !!id,
    queryFn: () => apiFetch<Vehicle>(`/api/transport/vehicles/${id}/`, { auth: false }),
  })

  const days = useMemo(() => rentalDaysInclusive(start, end), [start, end])

  const galleryUrls = useMemo(() => {
    const raw = v?.gallery_images
    if (!raw?.length) return []
    return raw.map((u) => mediaUrl(u) || u).filter(Boolean) as string[]
  }, [v])

  const showStickyBar =
    !!v &&
    !!profile?.email_verified &&
    !booking

  useEffect(() => {
    if (!showStickyBar) return
    const root = document.documentElement
    root.style.setProperty('--tp-detail-sticky-pad', '88px')
    return () => {
      root.style.removeProperty('--tp-detail-sticky-pad')
    }
  }, [showStickyBar])

  const estimatedTotal = useMemo(() => {
    if (!days || !v?.price_per_day) return null
    const price = parseFloat(v.price_per_day)
    if (Number.isNaN(price)) return null
    return (price * days).toFixed(2)
  }, [days, v])

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<Booking>('/api/transport/vehicle-bookings/', {
        method: 'POST',
        body: JSON.stringify({ listing: Number(id), start_date: start, end_date: end }),
      }),
    onSuccess: (b) => {
      setBooking(b)
      void qc.invalidateQueries({ queryKey: ['veh-bookings'] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "We couldn't save that request. Try again."),
  })

  const payMut = useMutation({
    mutationFn: (bid: number) =>
      apiFetch<{ status: string; mock_payment_ref: string }>(
        `/api/transport/vehicle-bookings/${bid}/mock_pay/`,
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: (r) => {
      setBooking((b) => (b ? { ...b, status: r.status, mock_payment_ref: r.mock_payment_ref } : b))
    },
    onError: (e) =>
      setErr(e instanceof ApiError ? e.message : "The practice payment didn't go through."),
  })

  if (isLoading || !v) {
    return (
      <div className="tp-detail">
        <div className="skeleton tp-detail__skeleton" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="tp-detail tp-detail--gate">
        <div className="tp-detail__gate card">
          <Link to="/transport" className="tp-detail__back">← Back to transport</Link>
          <h1 className="display tp-detail__gate-title">Sign in to rent</h1>
          <p className="tp-detail__gate-text">
            A free account lets the provider know who's renting. Browsing is open to everyone — you only need this step to reserve.
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
      <div className="tp-detail tp-detail--gate">
        <div className="tp-detail__gate card">
          <Link to="/transport" className="tp-detail__back">← Back to transport</Link>
          <h1 className="display tp-detail__gate-title">Verify your email</h1>
          <p className="tp-detail__gate-text">
            A confirmed address helps providers reach you. It only takes a moment — you can still explore DELVE in the meantime.
          </p>
          <Link to="/verify-email" className="btn btn-primary btn-block">Verify email</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!start || !end) {
      setErr('Please choose both a start and end date.')
      return
    }
    if (new Date(end) < new Date(start)) {
      setErr('Return date must be on or after pick-up date.')
      return
    }
    createMut.mutate()
  }

  const bookingStep = booking?.status === 'confirmed' ? 3 : booking ? 2 : 1

  const specs = [
    v.vehicle_type,
    v.seats != null ? `${v.seats} seats` : null,
    v.transmission,
    v.fuel_type,
    v.air_conditioning ? 'Air con' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="tp-detail">
      <Link to="/transport" className="tp-detail__back">← Back to transport</Link>

      {/* Cover image */}
      {v.cover_image ? (
        <img
          className="tp-detail__cover"
          src={mediaUrl(v.cover_image) || ''}
          alt={v.title}
        />
      ) : (
        <div className="tp-detail__cover tp-detail__cover--placeholder">
          <span aria-hidden>🚗</span>
        </div>
      )}

      {(v.owner_username || v.owner_display_name) && (
        <section className="tp-detail__provider card" aria-labelledby="tp-provider-heading">
          <div className="tp-detail__provider-media">
            {v.owner_avatar ? (
              <img
                className="tp-detail__provider-img"
                src={
                  /^https?:\/\//i.test(v.owner_avatar)
                    ? v.owner_avatar
                    : mediaUrl(v.owner_avatar) || v.owner_avatar
                }
                alt=""
              />
            ) : (
              <span className="tp-detail__provider-placeholder" aria-hidden>
                {(v.owner_display_name || v.owner_username || '?').trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="tp-detail__provider-body">
            <p className="tp-detail__provider-kicker">Service provider</p>
            <h2 id="tp-provider-heading" className="tp-detail__provider-name">
              {v.owner_display_name?.trim() || (v.owner_username ? `@${v.owner_username}` : 'Host')}
            </h2>
            {(v.owner_city || v.owner_region) ? (
              <p className="tp-detail__provider-meta">
                {[v.owner_city, v.owner_region].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {v.owner_bio?.trim() ? (
              <p className="tp-detail__provider-bio">{v.owner_bio.trim()}</p>
            ) : (
              <p className="tp-detail__provider-bio tp-detail__provider-bio--muted">
                Verified rental host on DELVE — message and pickup details after you book.
              </p>
            )}
            {v.owner_username ? (
              <Link to={`/u/${encodeURIComponent(v.owner_username)}`} className="tp-detail__provider-cta">
                View profile <span aria-hidden>→</span>
              </Link>
            ) : null}
          </div>
        </section>
      )}

      {galleryUrls.length > 0 && (
        <div className="tp-detail__gallery" role="list" aria-label="More photos">
          {galleryUrls.map((url, i) => (
            <figure key={`${url}-${i}`} className="tp-detail__gallery-item" role="listitem">
              <img
                src={url}
                alt={`${v.title} — photo ${i + 1}`}
                className="tp-detail__gallery-thumb"
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      )}

      <div className="tp-detail__content">
        {/* Title block */}
        <div className="tp-detail__title-block">
          <p className="tp-detail__make">
            {v.make} {v.model}
            {v.year ? ` · ${v.year}` : ''}
          </p>
          <h1 className="display tp-detail__title">{v.title}</h1>
          <p className="tp-detail__region">{v.region}{v.city ? ` · ${v.city}` : ''}</p>
        </div>

        {/* Specs chips */}
        {specs.length > 0 && (
          <div className="chip-row tp-detail__specs">
            {specs.map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>
        )}

        {v.included_features && v.included_features.length > 0 && (
          <div className="tp-detail__included" aria-label="Included with this rental">
            <h2 className="tp-detail__section-label">Included</h2>
            <p className="tp-detail__included-row">
              {v.included_features.map((f) => (
                <span key={f} className="tp-detail__included-pill">
                  <span className="tp-detail__included-tick" aria-hidden>✓</span>
                  {f}
                </span>
              ))}
            </p>
          </div>
        )}

        {(v.pickup_location || v.city) && (
          <div className="tp-detail__pickup">
            <span className="tp-detail__pickup-icon" aria-hidden>📍</span>
            <div>
              <h2 className="tp-detail__section-label">Pick-up location</h2>
              <p className="tp-detail__pickup-text">
                {v.pickup_location || `Pick-up in ${v.city} — exact address from the host after you book.`}
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        {v.description && (
          <div className="tp-detail__desc">
            <h2 className="tp-detail__section-label">About this vehicle</h2>
            <p>{v.description}</p>
          </div>
        )}

        {/* Booking stepper */}
        <div className="tp-detail__book-section">
          <ol className="acc-book__steps" aria-label="Rental steps">
            <li className={`acc-book__step${bookingStep === 1 ? ' acc-book__step--active' : ''}${bookingStep > 1 ? ' acc-book__step--done' : ''}`}>
              <span className="acc-book__step-num">1</span>
              <span className="acc-book__step-label">Dates</span>
            </li>
            <li className={`acc-book__step${bookingStep === 2 ? ' acc-book__step--active' : ''}${bookingStep > 2 ? ' acc-book__step--done' : ''}`}>
              <span className="acc-book__step-num">2</span>
              <span className="acc-book__step-label">Review</span>
            </li>
            <li className={`acc-book__step${bookingStep === 3 ? ' acc-book__step--active' : ''}`}>
              <span className="acc-book__step-num">3</span>
              <span className="acc-book__step-label">Done</span>
            </li>
          </ol>

          {err && <div className="error-banner">{err}</div>}

          {!booking && (
            <form id="veh-rental-form" className="tp-detail__form card" onSubmit={handleSubmit}>
              <div className="tp-detail__form-price">
                <span className="tp-detail__form-from">From</span>
                <span className="tp-detail__form-amount">N${v.price_per_day}</span>
                <span className="tp-detail__form-per"> / day</span>
              </div>

              <div className="field">
                <label className="label" htmlFor="veh-start">Pick-up date</label>
                <input
                  id="veh-start"
                  className="input"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="veh-end">Return date</label>
                <input
                  id="veh-end"
                  className="input"
                  type="date"
                  required
                  min={start || new Date().toISOString().split('T')[0]}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>

              {days != null && (
                <div className="acc-book__nights-summary">
                  <span className="acc-book__nights-count">{days} {days === 1 ? 'day' : 'days'}</span>
                  {estimatedTotal && (
                    <span className="acc-book__nights-est">≈ N${estimatedTotal} estimated</span>
                  )}
                </div>
              )}

              <p className="acc-book__avail-note" role="note">
                <span className="acc-book__avail-icon" aria-hidden>ℹ</span>
                Availability confirmed by the provider — this is a practice flow, no real payment today.
              </p>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={createMut.isPending}
              >
                {createMut.isPending ? 'Saving…' : 'Continue to review'}
              </button>
            </form>
          )}

          {booking?.status === 'pending' && (
            <div className="tp-detail__pay card">
              <h2 className="acc-book__pay-title">Review (demo)</h2>
              <p className="acc-book__pay-total">
                <span className="acc-book__pay-label">Total for this practice flow</span>
                <strong>N${booking.total_price}</strong>
              </p>
              <p className="acc-book__pay-note">
                This is a <strong>simulated</strong> payment — your card is never charged.
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
            <div className="tp-detail__success card">
              <h2 className="acc-book__success-title">Rental confirmed</h2>
              <p className="acc-book__success-text">
                In a live product you'd get pickup instructions and a contact for the provider. You've seen the full flow — nothing was charged.
              </p>
              <p className="acc-book__ref">
                Reference: <code>{booking.mock_payment_ref}</code>
              </p>
              <Link to="/transport" className="btn btn-primary btn-block">
                Browse more vehicles
              </Link>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-ghost btn-block tp-detail__back-btn"
        onClick={() => nav(-1)}
      >
        Go back
      </button>

      {showStickyBar && v && (
        <div className="tp-detail__sticky" role="region" aria-label="Rental rate">
          <div className="tp-detail__sticky-inner">
            <div className="tp-detail__sticky-text">
              <span className="tp-detail__sticky-rate">
                N${v.price_per_day}
                <span className="tp-detail__sticky-unit"> / day</span>
              </span>
              {estimatedTotal && days != null ? (
                <span className="tp-detail__sticky-sub">≈ N${estimatedTotal} for {days} {days === 1 ? 'day' : 'days'}</span>
              ) : (
                <span className="tp-detail__sticky-sub">Select dates to see your total</span>
              )}
            </div>
            <a href="#veh-rental-form" className="btn btn-primary tp-detail__sticky-cta">
              Select dates
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
