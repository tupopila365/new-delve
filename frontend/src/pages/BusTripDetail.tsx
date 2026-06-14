import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowRight,
  Backpack,
  BadgeDollarSign,
  Building2,
  Bus,
  CalendarDays,
  CheckCircle,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Navigation,
  Plug,
  Route,
  Snowflake,
  Users,
  Wifi,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { BookingGuestSelector, BookingPriceSummary, BookingTrustNote, UserBookingErrorState } from '../components/booking'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { buildBusGalleryItems, TransportGallery } from '../components/TransportGallery'
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

type DetailRow = {
  label: string
  value: string
  Icon: LucideIcon
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: 'Date TBA', time: 'Time TBA' }
  }
  return {
    date: d.toLocaleDateString('en-NA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
  }
}

function tripDurationLabel(trip: Trip, departs: string, arrives?: string | null): string {
  if (trip.route_detail.duration_minutes) {
    const mins = trip.route_detail.duration_minutes
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h && m) return `${h}h ${m}m`
    if (h) return `${h}h`
    return `${m}m`
  }
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

function seatsUrgencyVariant(n: number): 'default' | 'urgency' | 'success' {
  if (n <= 3) return 'urgency'
  if (n <= 8) return 'default'
  return 'success'
}

function amenityIcon(label: string): LucideIcon {
  const x = label.toLowerCase()
  if (x.includes('wifi')) return Wifi
  if (x.includes('air') || x.includes('ac')) return Snowflake
  if (x.includes('luggage') || x.includes('bag')) return Backpack
  if (x.includes('usb') || x.includes('charging') || x.includes('power')) return Plug
  if (x.includes('toilet') || x.includes('restroom')) return Info
  return CheckCircle
}

function openStreetMapUrl(place: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(place)}`
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
  const [commentDraft, setCommentDraft] = useState('')
  const [routeQuestions, setRouteQuestions] = useState([
    { id: 'b1', author: 'Sam N.', body: 'How much luggage space is there under the bus?', ago: '3d ago' },
    { id: 'b2', author: 'Leah P.', body: 'Does this route stop for food in Rehoboth?', ago: '1w ago' },
  ])

  const { data: trip, isLoading, isError, refetch } = useQuery({
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
    onError: (e) => setErr(friendlyApiMessage(e, "That block couldn't be reserved. Try other seats.")),
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
    onError: (e) => setErr(friendlyApiMessage(e, "The practice payment didn't go through.")),
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

  const postRouteQuestion = () => {
    const body = commentDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'Guest'
    setRouteQuestions((prev) => [
      { id: `local-${Date.now()}`, author, body, ago: 'Just now' },
      ...prev,
    ])
    setCommentDraft('')
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
          title="We couldn't load this bus trip"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!trip) {
    return (
      <DetailPage prefix="tp-detail" className="tp-detail--premium">
        <EmptyState
          iconElement={<Bus size={28} strokeWidth={2} aria-hidden />}
          title="Bus trip not found"
          sub="This route may have been removed or the link is incorrect."
          cta={{ label: 'Browse transport', to: '/transport' }}
        />
      </DetailPage>
    )
  }

  const dep = formatWhen(trip.departs_at)
  const arr = trip.arrives_at ? formatWhen(trip.arrives_at) : null
  const duration = tripDurationLabel(trip, trip.departs_at, trip.arrives_at)
  const routeTitle = `${trip.route_detail.origin} to ${trip.route_detail.destination}`
  const timeline = routeTimelineStops(trip, dep.time, arr?.time ?? null)
  const urgency = seatsUrgencyVariant(trip.available_seats)
  const seatNumbers = Array.from({ length: trip.total_seats }, (_, i) => i + 1)
  const firstRes = group?.reservations[0]
  const canBook = !firstRes || firstRes.status === 'pending'
  const payLabel = group ? `N$${Number(group.total_price).toFixed(0)}` : `N$${totalPrice}`
  const operatorName = trip.route_detail.operator_name

  const tripDetailRows: DetailRow[] = [
    { label: 'Origin', value: trip.route_detail.origin, Icon: MapPin },
    { label: 'Destination', value: trip.route_detail.destination, Icon: MapPin },
    { label: 'Departure', value: `${dep.date} · ${dep.time}`, Icon: CalendarDays },
  ]
  if (arr) {
    tripDetailRows.push({ label: 'Arrival', value: `${arr.date} · ${arr.time}`, Icon: Clock })
  }
  if (duration) {
    tripDetailRows.push({ label: 'Duration', value: duration, Icon: Route })
  }
  tripDetailRows.push({ label: 'Fare', value: `N$${trip.price} per passenger`, Icon: BadgeDollarSign })
  tripDetailRows.push({ label: 'Operator', value: operatorName, Icon: Building2 })
  if (trip.route_detail.distance_km) {
    tripDetailRows.push({
      label: 'Distance',
      value: `${trip.route_detail.distance_km} km`,
      Icon: Route,
    })
  }

  const trustItems: Array<string | { label: string; variant?: 'default' | 'urgency' | 'success' }> = [
    'Bus trip',
    'Listed on DELVE',
    { label: `${trip.available_seats} seats available`, variant: urgency },
  ]

  const routeMoments = [
    ...galleryItems.slice(0, 2).map((item, i) => ({
      id: i,
      image: mediaUrl(item.src) || item.src,
      author: `rider${i + 1}`,
      body: 'Coastal run — grab a window seat early.',
    })),
    {
      id: 'placeholder',
      image: null,
      author: 'commuter',
      body: 'Sunrise leaving Windhoek.',
    },
  ]

  const bookingCard = canBook ? (
    <DetailActionCard
      kicker="Request your seat"
      title={
        <span className="tp-detail__booking-price">
          <BadgeDollarSign size={18} strokeWidth={2.25} aria-hidden />
          N${trip.price}
          <small> / passenger</small>
        </span>
      }
      className="tp-detail__booking-card"
      footer={
        <BookingTrustNote>
          Check route, departure time, passenger details, and operator requirements before continuing.
        </BookingTrustNote>
      }
    >
      <div className="tp-detail__booking-meta">
        <span>
          <Route size={13} strokeWidth={2.25} aria-hidden />
          {trip.route_detail.origin} to {trip.route_detail.destination}
        </span>
        <span>
          <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
          {dep.time}
        </span>
        <span>
          <Users size={13} strokeWidth={2.25} aria-hidden />
          {trip.available_seats} seats available
        </span>
        <span>
          <Building2 size={13} strokeWidth={2.25} aria-hidden />
          {operatorName}
        </span>
      </div>

      <div className="tp-detail__booking-fields bk-inline-form">
        <BookingGuestSelector
          id="bus-passengers"
          label="Passengers"
          value={passengers}
          min={1}
          max={Math.min(4, trip.available_seats)}
          onChange={(n) => {
            setPassengers(n)
            setFirstSeat(null)
          }}
        />
        <div className="field">
          <label className="label" htmlFor="bus-seat-pref">
            Seat preference
          </label>
          <select id="bus-seat-pref" className="input" value={seatPref} onChange={(e) => setSeatPref(e.target.value)}>
            <option value="any">Any seat</option>
            <option value="window">Window</option>
            <option value="aisle">Aisle</option>
          </select>
        </div>
      </div>

      <BookingPriceSummary
        lines={[
          {
            label: `${passengers} ${passengers === 1 ? 'passenger' : 'passengers'} × N$${trip.price}`,
            value: payLabel,
          },
        ]}
        total={{ label: 'Estimated total', value: payLabel }}
        estimateNote="Operator confirms fare and seat allocation"
      />

      {err ? <UserBookingErrorState message={err} onDismiss={() => setErr(null)} /> : null}

      <button
        type="button"
        className="btn btn-primary tp-detail__book-btn"
        onClick={handleBook}
        disabled={bookMut.isPending}
      >
        <Bus size={16} strokeWidth={2.25} aria-hidden />
        {bookMut.isPending ? 'Sending…' : 'Request seat'}
      </button>

      <Link to="/messages" className="tp-detail__message-btn">
        <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
        Contact operator
      </Link>

      {!profile ? (
        <p className="tp-detail__booking-hint">Sign in to send a seat request.</p>
      ) : !profile.email_verified ? (
        <p className="tp-detail__booking-hint">Verify your email to request a seat.</p>
      ) : (
        <p className="tp-detail__booking-hint">
          Choose seats below, then send your request to the operator.
        </p>
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
        onShare={() => onShare(routeTitle)}
      >
        <TransportGallery
          items={galleryItems}
          title={routeTitle}
          emptyLabel="Route photos will appear once the operator adds them."
        />
      </DetailHeroWrap>

      <section className="tp-detail__identity detail-section">
        <div className="tp-detail__meta-row">
          <span className="tp-detail__pill">
            <Bus size={13} strokeWidth={2.25} aria-hidden />
            Bus trip
          </span>
          <span className="tp-detail__pill">
            <Building2 size={12} strokeWidth={2.25} aria-hidden />
            {operatorName}
          </span>
          <span className="tp-detail__pill">
            <BadgeDollarSign size={12} strokeWidth={2.25} aria-hidden />
            N${trip.price}
          </span>
        </div>

        <h1 className="display tp-detail__title">
          <span className="tp-detail__route-title">
            {trip.route_detail.origin}
            <ArrowRight size={22} strokeWidth={2.25} className="tp-detail__route-arrow" aria-hidden />
            {trip.route_detail.destination}
          </span>
        </h1>

        <p className="tp-detail__summary">
          Departs {dep.date} at {dep.time}
          {arr ? ` · Arrives ${arr.time}` : ''}
          {duration ? ` · ${duration}` : ''}
        </p>

        <ul className="tp-detail__facts">
          <li>
            <MapPin size={16} strokeWidth={2.25} aria-hidden />
            <span>
              {trip.route_detail.origin} to {trip.route_detail.destination}
            </span>
          </li>
          <li>
            <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
            <span>{dep.date}</span>
          </li>
          <li>
            <Clock size={16} strokeWidth={2.25} aria-hidden />
            <span>
              {dep.time}
              {arr ? ` – ${arr.time}` : ''}
            </span>
          </li>
          <li>
            <BadgeDollarSign size={16} strokeWidth={2.25} aria-hidden />
            <span>N${trip.price} per passenger</span>
          </li>
          <li>
            <Users size={16} strokeWidth={2.25} aria-hidden />
            <span>{trip.available_seats} seats available</span>
          </li>
        </ul>

        <TrustBadgeRow items={trustItems} className="tp-detail__trust-row" />

        <SocialActionRow saved={saved} onSave={() => setSaved((s) => !s)} onShare={() => onShare(routeTitle)}>
          <Link to="/messages">
            <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
            Contact operator
          </Link>
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
            <section className="detail-section tp-detail__timeline">
              <h2 className="tp-detail__section-title">Route summary</h2>
              <div className="tp-route-timeline">
                {timeline.map((stop, i) => (
                  <div key={`${stop.place}-${i}`} className="tp-route-stop">
                    <div className="tp-route-stop__rail">
                      <span className="tp-route-stop__dot" aria-hidden />
                      {i < timeline.length - 1 ? <span className="tp-route-stop__line" aria-hidden /> : null}
                    </div>
                    <div className="tp-route-stop__body">
                      <p className="tp-route-stop__place">
                        <MapPin size={14} strokeWidth={2.25} aria-hidden />
                        {stop.place}
                      </p>
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
              <h2 className="tp-detail__section-title">Departure and arrival</h2>
              <div className="tp-detail__dep-grid">
                <div className="tp-detail__dep-card">
                  <p className="tp-detail__dep-label">
                    <CalendarDays size={13} strokeWidth={2.25} aria-hidden />
                    Departure
                  </p>
                  <p className="tp-detail__dep-time">{dep.time}</p>
                  <p className="tp-detail__dep-date">{dep.date}</p>
                  <p className="tp-detail__dep-place">
                    <MapPin size={13} strokeWidth={2.25} aria-hidden />
                    {trip.route_detail.origin}
                  </p>
                </div>
                {arr ? (
                  <div className="tp-detail__dep-card">
                    <p className="tp-detail__dep-label">
                      <Clock size={13} strokeWidth={2.25} aria-hidden />
                      Arrival
                    </p>
                    <p className="tp-detail__dep-time">{arr.time}</p>
                    <p className="tp-detail__dep-date">{arr.date}</p>
                    <p className="tp-detail__dep-place">
                      <MapPin size={13} strokeWidth={2.25} aria-hidden />
                      {trip.route_detail.destination}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="detail-section tp-detail__rental-details">
              <h2 className="tp-detail__section-title">Trip details</h2>
              <ul className="tp-detail__details-list">
                {tripDetailRows.map((row) => (
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
                Confirm stops, luggage, and boarding details with the operator before travelling.
              </p>
            </section>

            <section className="detail-section tp-detail__pickup-block">
              <h2 className="tp-detail__section-title">Boarding and drop-off</h2>
              <div className="tp-detail__boarding-grid">
                <div className="tp-detail__pickup-card">
                  <div className="tp-detail__pickup-info">
                    <p className="tp-detail__pickup-label">
                      <MapPin size={13} strokeWidth={2.25} aria-hidden />
                      Boarding point
                    </p>
                    <p className="tp-detail__pickup-text">{trip.route_detail.origin}</p>
                    <p className="tp-detail__pickup-note">Confirm exact boarding location with the operator.</p>
                  </div>
                  <a
                    href={openStreetMapUrl(trip.route_detail.origin)}
                    className="tp-detail__map-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Directions to ${trip.route_detail.origin}`}
                  >
                    <Navigation size={16} strokeWidth={2.25} aria-hidden />
                    <span>Get directions</span>
                  </a>
                </div>
                <div className="tp-detail__pickup-card">
                  <div className="tp-detail__pickup-info">
                    <p className="tp-detail__pickup-label">
                      <MapPin size={13} strokeWidth={2.25} aria-hidden />
                      Drop-off point
                    </p>
                    <p className="tp-detail__pickup-text">{trip.route_detail.destination}</p>
                    <p className="tp-detail__pickup-note">Arrival time may vary with traffic and stops.</p>
                  </div>
                  <a
                    href={openStreetMapUrl(trip.route_detail.destination)}
                    className="tp-detail__map-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Directions to ${trip.route_detail.destination}`}
                  >
                    <Navigation size={16} strokeWidth={2.25} aria-hidden />
                    <span>Get directions</span>
                  </a>
                </div>
              </div>
            </section>

            {trip.amenities && trip.amenities.length > 0 && (
              <section className="detail-section tp-detail__amenities-block">
                <h2 className="tp-detail__section-title">Onboard amenities</h2>
                <div className="tp-detail__amenities-grid">
                  {trip.amenities.map((a) => {
                    const AmenityIcon = amenityIcon(a)
                    return (
                      <span key={a}>
                        <AmenityIcon size={14} strokeWidth={2.25} aria-hidden />
                        {a}
                      </span>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="detail-section tp-detail__baggage">
              <h2 className="tp-detail__section-title">Luggage and policies</h2>
              <p className="tp-detail__baggage-text">
                Luggage limits vary by operator and bus type. Confirm hold space, carry-on rules, and any extra
                charges when requesting your seat.
              </p>
              <p className="tp-detail__rental-terms-note tp-detail__rental-terms-note--inline">
                <Info size={14} strokeWidth={2.25} aria-hidden />
                Confirm luggage, boarding time, and route details with the operator before travel.
              </p>
            </section>

            <section className="detail-section tp-detail__operator-block">
              <h2 className="tp-detail__section-title">Operator</h2>
              <div className="tp-detail__provider-card">
                <div className="tp-detail__provider-avatar" aria-hidden>
                  <Building2 size={22} strokeWidth={2} />
                </div>
                <div className="tp-detail__provider-body">
                  <p className="tp-detail__provider-kicker">Transport operator</p>
                  <p className="tp-detail__provider-name">{operatorName}</p>
                  <p className="tp-detail__provider-bio">
                    Listed on DELVE. Message the operator for boarding details, luggage limits, and fare
                    confirmation.
                  </p>
                  <div className="tp-detail__provider-actions">
                    <Link to="/messages" className="btn btn-ghost btn-sm">
                      <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
                      Message operator
                    </Link>
                    <Link to="/transport" className="btn btn-ghost btn-sm">
                      <Route size={14} strokeWidth={2.25} aria-hidden />
                      Browse transport
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="detail-section tp-detail__tips">
              <h2 className="tp-detail__section-title">Travel tips</h2>
              <ul className="tp-detail__rules-list">
                <li>
                  <Clock size={14} strokeWidth={2.25} aria-hidden />
                  Arrive 20 minutes before departure with your reference details.
                </li>
                <li>
                  <Info size={14} strokeWidth={2.25} aria-hidden />
                  Keep snacks and water — stops can be brief on longer routes.
                </li>
                <li>
                  <Users size={14} strokeWidth={2.25} aria-hidden />
                  Window seats fill first on popular coastal runs.
                </li>
              </ul>
            </section>

            <DelversMoments
              title="Delvers moments on this route"
              subtitle="Window views, boarding tips, and stop recommendations."
              moments={routeMoments}
              className="tp-detail__moments"
              showWhenEmpty
              emptyMessage="Photos and tips will appear after travellers complete this route."
            />

            <CommentBox
              className="tp-detail__comments"
              title="Route tips and questions"
              subtitle="Boarding advice, luggage, and stop recommendations from commuters."
              placeholder="Ask about boarding point, luggage limits, stops, or pickup time…"
              draft={commentDraft}
              onDraftChange={setCommentDraft}
              onPost={postRouteQuestion}
              comments={routeQuestions}
              postLabel="Share tip"
              emptyMessage="Questions and tips will appear here as people discuss this route."
            />

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
                <h2 className="tp-detail__section-title">Request received</h2>
                <p className="tp-detail__booking-total">
                  Seats {group.reservations.map((r) => r.seat_number).sort((a, b) => a - b).join(', ')} ·{' '}
                  <strong>{payLabel}</strong>
                </p>
                <p className="tp-detail__booking-note">
                  This demo flow includes a practice payment step — your card is never charged.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => payMut.mutate(group.reservations)}
                  disabled={payMut.isPending}
                >
                  {payMut.isPending ? 'Processing…' : 'Complete demo step'}
                </button>
              </section>
            )}

            {firstRes?.status === 'confirmed' && group && (
              <section className="detail-section tp-detail__booking-flow tp-detail__booking-flow--success">
                <h2 className="tp-detail__section-title">Seat request confirmed</h2>
                <p>
                  {routeTitle} · Seats{' '}
                  {group.reservations.map((r) => r.seat_number).sort((a, b) => a - b).join(', ')}
                </p>
                <p className="tp-detail__booking-note">
                  The operator would share boarding instructions here. No payment was charged in this demo.
                </p>
                <p className="tp-detail__booking-ref">
                  Reference: <code>{firstRes.mock_payment_ref}</code>
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
          ariaLabel="Seat request"
          title={`N$${trip.price}/passenger`}
          subtitle={`${dep.time} · ${trip.available_seats} seats available`}
          action={
            <button type="button" className="btn btn-primary" onClick={handleBook} disabled={bookMut.isPending}>
              <Bus size={16} strokeWidth={2.25} aria-hidden />
              Request seat
            </button>
          }
          className="tp-detail__mobile-bar"
        />
      ) : null}
    </DetailPage>
  )
}
