import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { buildVehicleGalleryItems, TransportGallery } from '../components/TransportGallery'
import {
  CommentBox,
  DelversMoments,
  DetailActionCard,
  DetailHeroWrap,
  DetailLayout,
  DetailPage,
  DetailSkeleton,
  MobileStickyCTA,
  SocialActionRow,
  TrustBadgeRow,
} from '../components/detail'
import { EmptyState } from '../components/ui'

const VEHICLE_TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  '4x4': { label: '4×4 / SUV', emoji: '🚙' },
  sedan: { label: 'Sedan', emoji: '🚗' },
  hatchback: { label: 'Hatchback', emoji: '🚘' },
  van: { label: 'Van / Minibus', emoji: '🚐' },
  pickup: { label: 'Pickup', emoji: '🛻' },
  luxury: { label: 'Luxury', emoji: '✨' },
}

const DEFAULT_RENTAL_RULES = [
  "Valid driver's license required",
  'Deposit may be required on pick-up',
  'Return with the same fuel level',
  'No smoking in the vehicle',
]

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

function rentalDaysInclusive(start: string, end: string): number | null {
  if (!start || !end) return null
  const a = new Date(start)
  const b = new Date(end)
  if (b < a) return null
  const diff = b.getTime() - a.getTime()
  const n = Math.round(diff / (1000 * 60 * 60 * 24)) + 1
  return n > 0 ? n : null
}

function vehicleTypeMeta(type?: string | null) {
  if (!type) return { label: 'Vehicle', emoji: '🚗' }
  return VEHICLE_TYPE_LABELS[type] ?? { label: type, emoji: '🚗' }
}

function whyRentVehicle(v: Vehicle): string[] {
  const items = [
    v.vehicle_type === '4x4' || v.vehicle_type === 'pickup' ? 'Great for gravel roads' : 'Comfortable city driving',
    v.seats != null && v.seats >= 5 ? 'Enough luggage space' : 'Easy to park',
    v.air_conditioning ? 'Air conditioning' : null,
    v.included_features?.some((f) => /pickup|airport/i.test(f)) ? 'Flexible pickup' : 'Local pickup',
    v.transmission === 'automatic' ? 'Automatic transmission' : null,
  ].filter(Boolean) as string[]
  return items.slice(0, 4)
}

const VEHICLE_TIPS = [
  { id: 'v1', author: 'Jonas T.', body: 'Ask about gravel-road insurance before heading north.', ago: '1d ago' },
  { id: 'v2', author: 'Priya M.', body: 'Airport pickup was smooth — allow 20 min at Hosea Kutako.', ago: '4d ago' },
]

export function VehicleDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [pickupArea, setPickupArea] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [vehicleTips, setVehicleTips] = useState(VEHICLE_TIPS)

  const { data: v, isLoading, isError, refetch } = useQuery({
    queryKey: ['veh', id],
    enabled: !!id,
    queryFn: () => apiFetch<Vehicle>(`/api/transport/vehicles/${id}/`, { auth: false }),
  })

  const galleryItems = useMemo(
    () => (v ? buildVehicleGalleryItems(v.cover_image, v.gallery_images) : []),
    [v],
  )

  const days = useMemo(() => rentalDaysInclusive(start, end), [start, end])

  const estimatedTotal = useMemo(() => {
    if (!days || !v?.price_per_day) return null
    const price = parseFloat(v.price_per_day)
    if (Number.isNaN(price)) return null
    return (price * days).toFixed(0)
  }, [days, v])

  const typeMeta = vehicleTypeMeta(v?.vehicle_type)
  const loveItems = v ? whyRentVehicle(v) : []
  const locationLine = v ? [v.city, v.region].filter(Boolean).join(', ') : ''
  const todayStr = new Date().toISOString().split('T')[0]

  const pickupOptions = useMemo(() => {
    const opts = new Set<string>()
    if (v?.city) opts.add(v.city)
    opts.add('Airport')
    opts.add('Provider location')
    return [...opts]
  }, [v?.city])

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
    onError: (e) => setErr(friendlyApiMessage(e, "We couldn't save that request. Try again.")),
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
      setErr(friendlyApiMessage(e, "The practice payment didn't go through.")),
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

  const handleReserve = () => {
    setErr(null)
    if (!profile) {
      nav('/login')
      return
    }
    if (!profile.email_verified) {
      nav('/verify-email')
      return
    }
    if (!start || !end) {
      setErr('Please choose both pick-up and drop-off dates.')
      return
    }
    if (new Date(end) < new Date(start)) {
      setErr('Drop-off date must be on or after pick-up date.')
      return
    }
    createMut.mutate()
  }

  const postVehicleTip = () => {
    const body = commentDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'Guest'
    setVehicleTips((prev) => [{ id: `local-${Date.now()}`, author, body, ago: 'Just now' }, ...prev])
    setCommentDraft('')
  }

  if (isLoading) {
    return (
      <DetailPage prefix="tp-detail" className="tp-detail--premium">
        <DetailSkeleton className="tp-detail__skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="tp-detail" className="tp-detail--premium">
        <EmptyState
          icon="🚗"
          title="We couldn't load this vehicle"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!v) {
    return (
      <DetailPage prefix="tp-detail" className="tp-detail--premium">
        <EmptyState
          icon="🚗"
          title="Vehicle not found"
          sub="This listing may have been removed or the link is incorrect."
          cta={{ label: 'Browse transport', to: '/transport' }}
        />
      </DetailPage>
    )
  }

  const canBook = !booking || booking.status === 'pending'

  const vehicleMoments = [
    ...galleryItems.slice(0, 2).map((item, i) => ({
      id: i,
      image: mediaUrl(item.src) || item.src,
      author: `driver${i + 1}`,
      body: 'Packed for a gravel-road weekend.',
    })),
    {
      id: 'placeholder',
      image: null,
      author: 'traveller',
      body: 'Fuel stop tip before heading north.',
    },
  ]

  const bookingCard = canBook ? (
    <DetailActionCard kicker="Ready to drive?" title={<><span>N${v.price_per_day}</span><small> / day</small></>} className="tp-detail__booking-card">
      <div className="tp-detail__booking-meta">
        <span>{typeMeta.label}</span>
        {v.seats != null && <span>{v.seats} seats</span>}
        {v.transmission && <span>{v.transmission}</span>}
      </div>

      <div className="tp-detail__booking-fields">
        <label>
          Pick-up
          <input type="date" min={todayStr} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Drop-off
          <input type="date" min={start || todayStr} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label>
          Pick-up area
          <select value={pickupArea || pickupOptions[0] || ''} onChange={(e) => setPickupArea(e.target.value)}>
            {pickupOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {days != null && estimatedTotal ? (
        <div className="tp-detail__total">
          <span>Estimated total ({days} {days === 1 ? 'day' : 'days'})</span>
          <strong>N${estimatedTotal}</strong>
        </div>
      ) : (
        <div className="tp-detail__total tp-detail__total--muted">
          <span>Estimated total</span>
          <strong>—</strong>
        </div>
      )}

      <button type="button" className="btn btn-primary tp-detail__book-btn" onClick={handleReserve} disabled={createMut.isPending}>
        {createMut.isPending ? 'Saving…' : 'Reserve vehicle'}
      </button>

      {v.owner_username ? (
        <Link to={`/u/${encodeURIComponent(v.owner_username)}`} className="tp-detail__message-btn">
          Message provider
        </Link>
      ) : null}

      {!profile ? (
        <p className="tp-detail__booking-hint">Sign in to complete your reservation.</p>
      ) : !profile.email_verified ? (
        <p className="tp-detail__booking-hint">Verify your email to reserve.</p>
      ) : (
        <p className="tp-detail__booking-hint">Practice flow — no real payment today.</p>
      )}
    </DetailActionCard>
  ) : null

  return (
    <DetailPage prefix="tp-detail" className="tp-detail--premium" toast={shareMsg || null}>
      <DetailHeroWrap
        className="acc-detail__gallery-wrap"
        backTo="/transport"
        backLabel="Transport"
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onShare={() => onShare(v.title)}
      >
        <TransportGallery items={galleryItems} title={v.title} emptyLabel="Vehicle photo coming soon" />
      </DetailHeroWrap>

      <section className="tp-detail__identity detail-section">
        <div className="tp-detail__meta-row">
          <span className="tp-detail__pill">
            {typeMeta.emoji} {typeMeta.label}
          </span>
          {locationLine ? <span className="tp-detail__pill">{locationLine}</span> : null}
          {v.transmission ? <span className="tp-detail__pill">{v.transmission}</span> : null}
          {v.seats != null ? <span className="tp-detail__pill">{v.seats} seats</span> : null}
        </div>

        <h1 className="display tp-detail__title">{v.title}</h1>

        <p className="tp-detail__summary">
          {v.make} {v.model}
          {v.year ? ` · ${v.year}` : ''} · N${v.price_per_day}/day
        </p>

        <TrustBadgeRow
          items={[
            'Verified provider',
            ...(v.vehicle_type === '4x4' || v.vehicle_type === 'pickup' ? ['Gravel-road friendly'] : []),
            ...(v.air_conditioning ? ['Air conditioning'] : []),
            'Safe pickup',
          ]}
          className="tp-detail__trust-row"
        />

        <SocialActionRow saved={saved} onSave={() => setSaved((s) => !s)} onShare={() => onShare(v.title)}>
          {v.owner_username ? (
            <Link to={`/u/${encodeURIComponent(v.owner_username)}`}>Ask provider</Link>
          ) : (
            <button type="button">Ask provider</button>
          )}
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
          <section className="detail-section tp-detail__love">
            <h2 className="tp-detail__section-title">Why rent this</h2>
            <div className="tp-detail__love-grid">
              {loveItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="detail-section tp-detail__specs">
            <h2 className="tp-detail__section-title">Vehicle specs</h2>
            <dl className="tp-detail__spec-grid">
              <div>
                <dt>Make</dt>
                <dd>{v.make}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{v.model}</dd>
              </div>
              {v.year ? (
                <div>
                  <dt>Year</dt>
                  <dd>{v.year}</dd>
                </div>
              ) : null}
              {v.seats != null ? (
                <div>
                  <dt>Seats</dt>
                  <dd>{v.seats}</dd>
                </div>
              ) : null}
              {v.transmission ? (
                <div>
                  <dt>Transmission</dt>
                  <dd className="tp-detail__spec-cap">{v.transmission}</dd>
                </div>
              ) : null}
              {v.vehicle_type ? (
                <div>
                  <dt>Vehicle type</dt>
                  <dd>{typeMeta.label}</dd>
                </div>
              ) : null}
              {v.fuel_type ? (
                <div>
                  <dt>Fuel</dt>
                  <dd>{v.fuel_type}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {(v.pickup_location || v.city) && (
            <section className="detail-section tp-detail__pickup-block">
              <h2 className="tp-detail__section-title">Pick-up & return</h2>
              <p className="tp-detail__pickup-text">
                {v.pickup_location ||
                  `Pick-up in ${v.city} — exact address shared after you reserve.`}
              </p>
              <p className="tp-detail__pickup-note">
                Return to the same location unless arranged with the provider in advance.
              </p>
            </section>
          )}

          {v.included_features && v.included_features.length > 0 && (
            <section className="detail-section tp-detail__included-block">
              <h2 className="tp-detail__section-title">Included</h2>
              <div className="tp-detail__included-grid">
                {v.included_features.map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
            </section>
          )}

          <section className="detail-section tp-detail__rules">
            <h2 className="tp-detail__section-title">Rental rules</h2>
            <ul className="tp-detail__rules-list">
              {DEFAULT_RENTAL_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>

          {v.description?.trim() ? (
            <section className="detail-section tp-detail__about">
              <h2 className="tp-detail__section-title">About this vehicle</h2>
              <p>{v.description}</p>
            </section>
          ) : null}

          {(v.owner_username || v.owner_display_name) && (
            <section className="detail-section tp-detail__provider-block">
              <h2 className="tp-detail__section-title">Provider</h2>
              <div className="tp-detail__provider-card">
                <div className="tp-detail__provider-avatar">
                  {v.owner_avatar ? (
                    <img
                      src={
                        /^https?:\/\//i.test(v.owner_avatar)
                          ? v.owner_avatar
                          : mediaUrl(v.owner_avatar) || v.owner_avatar
                      }
                      alt=""
                    />
                  ) : (
                    <span aria-hidden>
                      {(v.owner_display_name || v.owner_username || '?').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="tp-detail__provider-name">
                    {v.owner_display_name?.trim() || (v.owner_username ? `@${v.owner_username}` : 'Provider')}
                  </p>
                  {(v.owner_city || v.owner_region) && (
                    <p className="tp-detail__provider-loc">
                      {[v.owner_city, v.owner_region].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="tp-detail__provider-bio">
                    {v.owner_bio?.trim() ||
                      'Verified rental provider on DELVE — pickup details after you book.'}
                  </p>
                  {v.owner_username ? (
                    <Link to={`/u/${encodeURIComponent(v.owner_username)}`} className="tp-detail__provider-link">
                      View profile
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          <DelversMoments
            title="Delvers moments with this ride"
            subtitle="Road trip photos, pickup tips, and luggage setup from travellers."
            moments={vehicleMoments}
            className="tp-detail__moments"
            showWhenEmpty
          />

          <CommentBox
            className="tp-detail__comments"
            title="Rental tips & questions"
            subtitle="Pickup advice, insurance, and gravel-road notes from recent renters."
            placeholder="Ask about pickup location, insurance, fuel policy, or gravel roads…"
            draft={commentDraft}
            onDraftChange={setCommentDraft}
            onPost={postVehicleTip}
            comments={vehicleTips}
            postLabel="Share tip"
          />

          {err ? <div className="error-banner" role="alert">{err}</div> : null}

          {booking?.status === 'pending' && (
            <section className="detail-section tp-detail__booking-flow">
              <h2 className="tp-detail__section-title">Review (demo)</h2>
              <p className="tp-detail__booking-total">
                Total for this practice flow: <strong>N${booking.total_price}</strong>
              </p>
              <p className="tp-detail__booking-note">
                This is a simulated payment — your card is never charged.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => payMut.mutate(booking.id)}
                disabled={payMut.isPending}
              >
                {payMut.isPending ? 'Processing…' : 'Run practice payment'}
              </button>
            </section>
          )}

          {booking?.status === 'confirmed' && (
            <section className="detail-section tp-detail__booking-flow tp-detail__booking-flow--success">
              <h2 className="tp-detail__section-title">Rental confirmed</h2>
              <p>
                In a live product you would get pickup instructions and a contact for the provider. Nothing was
                charged.
              </p>
              <p className="tp-detail__booking-ref">
                Reference: <code>{booking.mock_payment_ref}</code>
              </p>
              <Link to="/transport" className="btn btn-primary btn-block">
                Browse more vehicles
              </Link>
            </section>
          )}
          </>
        }
        sidebar={bookingCard}
      />

      {canBook ? (
        <MobileStickyCTA
          title={`N$${v.price_per_day}/day`}
          subtitle={locationLine || v.region}
          action={
            <button type="button" className="btn btn-primary" onClick={handleReserve} disabled={createMut.isPending}>
              Reserve
            </button>
          }
          className="tp-detail__mobile-bar"
        />
      ) : null}
    </DetailPage>
  )
}
