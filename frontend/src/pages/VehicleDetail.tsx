import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BadgeDollarSign,
  Building2,
  Bus,
  CalendarDays,
  Car,
  CheckCircle,
  Fuel,
  Gauge,
  Info,
  MapPin,
  MessageCircle,
  Navigation,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { BookingDateFields, BookingPriceSummary, BookingTrustNote, UserBookingErrorState } from '../components/booking'
import { MessageProviderLink } from '../components/messages'
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

const VEHICLE_TYPE_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  '4x4': { label: '4×4 / SUV', Icon: Car },
  sedan: { label: 'Sedan', Icon: Car },
  hatchback: { label: 'Hatchback', Icon: Car },
  van: { label: 'Van / Minibus', Icon: Bus },
  pickup: { label: 'Pickup', Icon: Truck },
  luxury: { label: 'Luxury', Icon: Car },
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

type DetailRow = {
  label: string
  value: string
  Icon: LucideIcon
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
  if (!type) return { label: 'Vehicle', Icon: Car }
  return VEHICLE_TYPE_LABELS[type] ?? { label: type, Icon: Car }
}

function openStreetMapUrl(city: string, region: string, pickup?: string | null) {
  const q = [pickup, city, region].filter(Boolean).join(', ')
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
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
  const TypeIcon = typeMeta.Icon
  const loveItems = v ? whyRentVehicle(v) : []
  const locationLine = v ? [v.city, v.region].filter(Boolean).join(', ') : ''
  const todayStr = new Date().toISOString().split('T')[0]
  const providerName = v?.owner_display_name?.trim() || v?.owner_username || 'Transport provider'
  const providerProfileHref = v?.owner_username ? `/u/${encodeURIComponent(v.owner_username)}` : null

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
    if (!start) {
      setErr('Choose a pick-up date.')
      return
    }
    if (!end) {
      setErr('Choose a return date.')
      return
    }
    if (new Date(end) < new Date(start)) {
      setErr('Choose a return date on or after pick-up.')
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
          iconElement={<AlertCircle size={28} strokeWidth={2} aria-hidden />}
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
          iconElement={<Car size={28} strokeWidth={2} aria-hidden />}
          title="Vehicle not found"
          sub="This vehicle may have been removed or the link is incorrect."
          cta={{ label: 'Browse transport', to: '/transport' }}
        />
      </DetailPage>
    )
  }

  const canBook = !booking || booking.status === 'pending'
  const mapUrl = openStreetMapUrl(v.city ?? '', v.region, v.pickup_location)
  const hasLocation = Boolean(v.pickup_location || v.city || v.region)

  const rentalDetailRows: DetailRow[] = [
    { label: 'Daily rate', value: `N$${v.price_per_day}`, Icon: BadgeDollarSign },
    {
      label: 'Pickup location',
      value: v.pickup_location || locationLine || 'Confirm with provider',
      Icon: MapPin,
    },
    {
      label: 'Return',
      value: 'Same location unless arranged with provider',
      Icon: Navigation,
    },
  ]
  if (v.seats != null) {
    rentalDetailRows.push({ label: 'Seats', value: `${v.seats} passengers`, Icon: Users })
  }
  if (v.transmission) {
    rentalDetailRows.push({ label: 'Transmission', value: v.transmission, Icon: Gauge })
  }
  if (v.fuel_type) {
    rentalDetailRows.push({ label: 'Fuel type', value: v.fuel_type, Icon: Fuel })
  }

  const trustItems: string[] = ['Vehicle rental', 'Listed on DELVE']
  if (v.air_conditioning) trustItems.push('Air conditioning')
  if (v.vehicle_type === '4x4' || v.vehicle_type === 'pickup') trustItems.push('Gravel-road friendly')
  if (v.included_features?.some((f) => /airport|pickup/i.test(f))) trustItems.push('Airport pickup')

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
    <DetailActionCard
      kicker="Request this vehicle"
      title={
        <span className="tp-detail__booking-price">
          <BadgeDollarSign size={18} strokeWidth={2.25} aria-hidden />
          N${v.price_per_day}
          <small> / day</small>
        </span>
      }
      className="tp-detail__booking-card"
      footer={
        <BookingTrustNote>
          The provider will confirm availability, pickup details, deposit, and rental terms before anything is
          final.
        </BookingTrustNote>
      }
    >
      <div className="tp-detail__booking-meta">
        <span>
          <TypeIcon size={13} strokeWidth={2.25} aria-hidden />
          {typeMeta.label}
        </span>
        {v.seats != null && (
          <span>
            <Users size={13} strokeWidth={2.25} aria-hidden />
            {v.seats} seats
          </span>
        )}
        {locationLine ? (
          <span>
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            {locationLine}
          </span>
        ) : null}
        <span>
          <Building2 size={13} strokeWidth={2.25} aria-hidden />
          {providerName}
        </span>
      </div>

      <div className="tp-detail__booking-fields bk-inline-form">
        <BookingDateFields
          mode="range"
          checkIn={{
            id: 'veh-pickup',
            label: 'Pick-up date',
            value: start,
            min: todayStr,
            onChange: setStart,
          }}
          checkOut={{
            id: 'veh-return',
            label: 'Return date',
            value: end,
            min: start || todayStr,
            onChange: setEnd,
          }}
        />
        <div className="field">
          <label className="label" htmlFor="veh-pickup-area">
            Pick-up area
          </label>
          <select
            id="veh-pickup-area"
            className="input"
            value={pickupArea || pickupOptions[0] || ''}
            onChange={(e) => setPickupArea(e.target.value)}
          >
            {pickupOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BookingPriceSummary
        lines={
          days != null && estimatedTotal
            ? [{ label: `${days} ${days === 1 ? 'day' : 'days'} × N$${v.price_per_day}`, value: `N$${estimatedTotal}` }]
            : [{ label: 'Daily rate', value: `N$${v.price_per_day} / day`, muted: true }]
        }
        total={estimatedTotal ? { label: 'Estimated total', value: `N$${estimatedTotal}` } : undefined}
        estimateNote={estimatedTotal ? 'Provider confirms the final amount' : 'Choose dates to see an estimate'}
      />

      {err ? <UserBookingErrorState message={err} onDismiss={() => setErr(null)} /> : null}

      <button
        type="button"
        className="btn btn-primary tp-detail__book-btn"
        onClick={handleReserve}
        disabled={createMut.isPending}
      >
        <Car size={16} strokeWidth={2.25} aria-hidden />
        {createMut.isPending ? 'Sending…' : 'Request vehicle'}
      </button>

      {v?.owner_username ? (
        <MessageProviderLink
          username={v.owner_username}
          variant="ghost"
          className="tp-detail__message-btn"
        />
      ) : providerProfileHref ? (
        <Link to={providerProfileHref} className="tp-detail__message-btn">
          <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
          Message provider
        </Link>
      ) : (
        <MessageProviderLink variant="ghost" className="tp-detail__message-btn" fallbackToInbox />
      )}

      {!profile ? (
        <p className="tp-detail__booking-hint">Sign in to send a vehicle request.</p>
      ) : !profile.email_verified ? (
        <p className="tp-detail__booking-hint">Verify your email to request this vehicle.</p>
      ) : (
        <p className="tp-detail__booking-hint">Your request is sent to the provider for confirmation.</p>
      )}
    </DetailActionCard>
  ) : null

  return (
    <DetailPage prefix="tp-detail" className="tp-detail--premium" toast={shareMsg || null}>
      <DetailHeroWrap
        className="acc-detail__gallery-wrap tp-detail__gallery-wrap"
        backTo="/transport"
        backLabel="Transport"
        saved={saved}
        onSave={() => setSaved((s) => !s)}
        onShare={() => onShare(v.title)}
      >
        <TransportGallery
          items={galleryItems}
          title={v.title}
          emptyLabel="Vehicle photos will appear once the provider adds them."
        />
      </DetailHeroWrap>

      <section className="tp-detail__identity detail-section">
        <div className="tp-detail__meta-row">
          <span className="tp-detail__pill">
            <TypeIcon size={13} strokeWidth={2.25} aria-hidden />
            {typeMeta.label}
          </span>
          {locationLine ? (
            <span className="tp-detail__pill">
              <MapPin size={12} strokeWidth={2.25} aria-hidden />
              {locationLine}
            </span>
          ) : null}
        </div>

        <h1 className="display tp-detail__title">{v.title}</h1>

        <p className="tp-detail__summary">
          {v.make} {v.model}
          {v.year ? ` · ${v.year}` : ''}
          {providerName ? (
            <>
              {' '}
              · Listed by{' '}
              {providerProfileHref ? (
                <Link to={providerProfileHref} className="tp-detail__provider-inline">
                  {providerName}
                </Link>
              ) : (
                providerName
              )}
            </>
          ) : null}
        </p>

        <ul className="tp-detail__facts">
          {v.seats != null ? (
            <li>
              <Users size={16} strokeWidth={2.25} aria-hidden />
              <span>{v.seats} seats</span>
            </li>
          ) : null}
          <li>
            <BadgeDollarSign size={16} strokeWidth={2.25} aria-hidden />
            <span>N${v.price_per_day} / day</span>
          </li>
          {v.pickup_location || locationLine ? (
            <li>
              <MapPin size={16} strokeWidth={2.25} aria-hidden />
              <span>{v.pickup_location || locationLine}</span>
            </li>
          ) : null}
          {v.transmission ? (
            <li>
              <Gauge size={16} strokeWidth={2.25} aria-hidden />
              <span>{v.transmission}</span>
            </li>
          ) : null}
          {v.fuel_type ? (
            <li>
              <Fuel size={16} strokeWidth={2.25} aria-hidden />
              <span>{v.fuel_type}</span>
            </li>
          ) : null}
        </ul>

        <TrustBadgeRow items={trustItems} className="tp-detail__trust-row" />

        <SocialActionRow saved={saved} onSave={() => setSaved((s) => !s)} onShare={() => onShare(v.title)}>
          {providerProfileHref ? (
            <Link to={providerProfileHref}>
              <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
              Contact provider
            </Link>
          ) : (
            <Link to="/messages">
              <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
              Contact provider
            </Link>
          )}
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
            <section className="detail-section tp-detail__about">
              <h2 className="tp-detail__section-title">About this vehicle</h2>
              {v.description?.trim() ? (
                <p className="tp-detail__about-text">{v.description}</p>
              ) : (
                <p className="tp-detail__about-empty" role="status">
                  More vehicle details will appear here once the provider adds them.
                </p>
              )}
            </section>

            <section className="detail-section tp-detail__love">
              <h2 className="tp-detail__section-title">Best for</h2>
              <div className="tp-detail__love-grid">
                {loveItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>

            <section className="detail-section tp-detail__specs">
              <h2 className="tp-detail__section-title">Vehicle features</h2>
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
                {v.air_conditioning ? (
                  <div>
                    <dt>Air conditioning</dt>
                    <dd>Yes</dd>
                  </div>
                ) : null}
              </dl>
              {v.included_features && v.included_features.length > 0 ? (
                <div className="tp-detail__included-grid tp-detail__included-grid--specs">
                  {v.included_features.map((f) => (
                    <span key={f}>
                      <CheckCircle size={14} strokeWidth={2.25} aria-hidden />
                      {f}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="detail-section tp-detail__rental-details">
              <h2 className="tp-detail__section-title">Rental details</h2>
              <ul className="tp-detail__details-list">
                {rentalDetailRows.map((row) => (
                  <li key={row.label} className="tp-detail__details-item">
                    <span className="tp-detail__details-icon" aria-hidden>
                      <row.Icon size={18} strokeWidth={2.25} />
                    </span>
                    <div className="tp-detail__details-body">
                      <span className="tp-detail__details-label">{row.label}</span>
                      <strong className="tp-detail__details-value">{row.value}</strong>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="tp-detail__rental-terms-note">
                <Info size={14} strokeWidth={2.25} aria-hidden />
                Confirm rental terms with the provider before requesting.
              </p>
            </section>

            <section className="detail-section tp-detail__pickup-block">
              <h2 className="tp-detail__section-title">Pickup location</h2>
              <div className="tp-detail__pickup-card">
                <div className="tp-detail__pickup-info">
                  <p className="tp-detail__pickup-text">
                    {v.pickup_location ||
                      (v.city
                        ? `Pickup in ${v.city} — exact address shared after your request.`
                        : 'Pickup details shared by the provider after your request.')}
                  </p>
                  {locationLine ? <p className="tp-detail__pickup-note">{locationLine}</p> : null}
                </div>
                {hasLocation ? (
                  <a
                    href={mapUrl}
                    className="tp-detail__map-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open pickup area on map"
                  >
                    <Navigation size={16} strokeWidth={2.25} aria-hidden />
                    <span>Get directions</span>
                  </a>
                ) : null}
              </div>
            </section>

            <section className="detail-section tp-detail__rules">
              <h2 className="tp-detail__section-title">Rental rules</h2>
              <ul className="tp-detail__rules-list">
                {DEFAULT_RENTAL_RULES.map((rule) => (
                  <li key={rule}>
                    <ShieldCheck size={14} strokeWidth={2.25} aria-hidden />
                    {rule}
                  </li>
                ))}
              </ul>
            </section>

            {(v.owner_username || v.owner_display_name) && (
              <section className="detail-section tp-detail__provider-block">
                <h2 className="tp-detail__section-title">Provider</h2>
                <div className="tp-detail__provider-card">
                  <div className="tp-detail__provider-avatar" aria-hidden>
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
                      <UserRound size={22} strokeWidth={2} />
                    )}
                  </div>
                  <div className="tp-detail__provider-body">
                    <p className="tp-detail__provider-kicker">Transport provider</p>
                    <p className="tp-detail__provider-name">{providerName}</p>
                    {(v.owner_city || v.owner_region) && (
                      <p className="tp-detail__provider-loc">
                        <MapPin size={13} strokeWidth={2.25} aria-hidden />
                        {[v.owner_city, v.owner_region].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <p className="tp-detail__provider-bio">
                      {v.owner_bio?.trim() ||
                        'Listed on DELVE. Message the provider for pickup, insurance, and rental terms.'}
                    </p>
                    <div className="tp-detail__provider-actions">
                      {providerProfileHref ? (
                        <Link to={providerProfileHref} className="btn btn-ghost btn-sm">
                          <UserRound size={14} strokeWidth={2.25} aria-hidden />
                          View provider profile
                        </Link>
                      ) : null}
                      <MessageProviderLink
                        username={v.owner_username}
                        size="sm"
                        variant="ghost"
                      />
                    </div>
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
              emptyMessage="Photos and tips will appear after travellers rent this vehicle."
            />

            <CommentBox
              className="tp-detail__comments"
              title="Rental tips and questions"
              subtitle="Pickup advice, insurance, and gravel-road notes from recent renters."
              placeholder="Ask about pickup location, insurance, fuel policy, or gravel roads…"
              draft={commentDraft}
              onDraftChange={setCommentDraft}
              onPost={postVehicleTip}
              comments={vehicleTips}
              postLabel="Share tip"
              emptyMessage="Questions and tips will appear here as people discuss this vehicle."
            />

            {booking?.status === 'pending' && (
              <section className="detail-section tp-detail__booking-flow">
                <h2 className="tp-detail__section-title">Request received</h2>
                <p className="tp-detail__booking-total">
                  Estimated total: <strong>N${booking.total_price}</strong>
                </p>
                <p className="tp-detail__booking-note">
                  This demo flow includes a practice payment step — your card is never charged.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => payMut.mutate(booking.id)}
                  disabled={payMut.isPending}
                >
                  {payMut.isPending ? 'Processing…' : 'Complete demo step'}
                </button>
              </section>
            )}

            {booking?.status === 'confirmed' && (
              <section className="detail-section tp-detail__booking-flow tp-detail__booking-flow--success">
                <h2 className="tp-detail__section-title">Request confirmed</h2>
                <p>
                  The provider would share pickup instructions and contact details here. No payment was charged
                  in this demo.
                </p>
                <p className="tp-detail__booking-ref">
                  Reference: <code>{booking.mock_payment_ref}</code>
                </p>
                <Link to="/transport" className="btn btn-primary btn-block">
                  Browse transport
                </Link>
              </section>
            )}
          </>
        }
        sidebar={bookingCard}
      />

      {canBook ? (
        <MobileStickyCTA
          ariaLabel="Vehicle request"
          title={`N$${v.price_per_day}/day`}
          subtitle={[locationLine, providerName].filter(Boolean).join(' · ') || v.title}
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReserve}
              disabled={createMut.isPending}
            >
              <Car size={16} strokeWidth={2.25} aria-hidden />
              Request vehicle
            </button>
          }
          className="tp-detail__mobile-bar"
        />
      ) : null}
    </DetailPage>
  )
}
