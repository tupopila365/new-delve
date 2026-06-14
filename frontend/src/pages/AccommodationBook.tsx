import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  BadgeDollarSign,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  BookingDateFields,
  BookingGuestSelector,
  BookingNotesField,
  BookingPriceSummary,
  BookingSection,
  BookingShell,
  BookingStatusBadge,
  BookingStepHeader,
  BookingSummaryCard,
  BookingTrustNote,
  UserBookingErrorState,
} from '../components/booking'

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

type Phase = 'details' | 'review' | 'sent'

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
  return `${formatStayDate(checkIn)} – ${formatStayDate(checkOut)}`
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
  'Cancellation terms are set by the host. Confirm details before finalizing your stay.'

function AccessGate({
  backTo,
  icon: Icon,
  title,
  text,
  primary,
  secondary,
}: {
  backTo: string
  icon: typeof ShieldCheck
  title: string
  text: string
  primary: { label: string; to: string }
  secondary?: { label: string; to: string }
}) {
  return (
    <div className="acc-page acc-page--detail acc-book-page acc-book-page--gate">
      <div className="container acc-book-page__gate-wrap">
        <div className="card acc-book__gate">
          <Link to={backTo} className="bk-page__back acc-book__gate-back-link">
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            Back to stay
          </Link>
          <div className="acc-book__gate-icon" aria-hidden>
            <Icon size={28} strokeWidth={2} />
          </div>
          <h1 className="acc-book__gate-title">{title}</h1>
          <p className="acc-book__gate-text">{text}</p>
          <div className="acc-book__gate-actions">
            <Link to={primary.to} className="btn btn-primary btn-block">
              {primary.label}
            </Link>
            {secondary ? (
              <Link to={secondary.to} className="btn btn-ghost btn-block">
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const [phase, setPhase] = useState<Phase>('details')
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
      setPhase('sent')
      void qc.invalidateQueries({ queryKey: ['acc-bookings'] })
    },
    onError: (e) =>
      setErr(
        e instanceof ApiError
          ? e.message
          : "We couldn't send your stay request. Please check your details and try again.",
      ),
  })

  if (isLoading || !listing) {
    return (
      <div className="acc-page acc-page--detail acc-book-page">
        <div className="skeleton acc-page__detail-skeleton" />
      </div>
    )
  }

  if (!profile) {
    return (
      <AccessGate
        backTo={`/accommodation/${id}`}
        icon={ShieldCheck}
        title="Sign in to request this stay"
        text="Hosts need your account details before they can review a stay request."
        primary={{ label: 'Sign in', to: '/login' }}
        secondary={{ label: 'Create free account', to: '/register' }}
      />
    )
  }

  if (!profile.email_verified) {
    return (
      <AccessGate
        backTo={`/accommodation/${id}`}
        icon={ShieldCheck}
        title="Verify your email to continue"
        text="A confirmed email helps hosts contact you about your stay request."
        primary={{ label: 'Verify email', to: '/verify-email' }}
        secondary={{ label: 'Back to stay', to: `/accommodation/${id}` }}
      />
    )
  }

  const validateDetails = (): boolean => {
    setErr(null)
    if (!checkIn) {
      setErr('Choose a check-in date.')
      return false
    }
    if (!checkOut) {
      setErr('Choose a check-out date.')
      return false
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      setErr('Choose a check-out date after check-in.')
      return false
    }
    if (guests < 1) {
      setErr('Choose at least 1 guest.')
      return false
    }
    if (guests > maxGuests) {
      setErr(`Group size cannot exceed the maximum of ${maxGuests} guests.`)
      return false
    }
    return true
  }

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateDetails()) setPhase('review')
  }

  const handleSendRequest = () => {
    if (!validateDetails()) {
      setPhase('details')
      return
    }
    createMut.mutate()
  }

  const stepIndex = phase === 'details' ? 1 : phase === 'review' ? 2 : 3

  const today = new Date().toISOString().split('T')[0]
  const displayTitle = booking?.listing_title || listing.title
  const areaLine = [listing.city, listing.region].filter(Boolean).join(' · ')
  const coverSrc = listing.cover_image ? mediaUrl(listing.cover_image) || '' : undefined

  const activeCheckIn = booking?.check_in ?? checkIn
  const activeCheckOut = booking?.check_out ?? checkOut
  const activeGuests = booking?.guests ?? guests
  const activeNights = nightsBetween(activeCheckIn, activeCheckOut) ?? nights

  const summaryMeta = [
    activeCheckIn && activeCheckOut && activeNights
      ? { icon: CalendarDays, label: 'Dates', value: formatStayRange(activeCheckIn, activeCheckOut) }
      : null,
    activeNights ? { icon: BedDouble, label: 'Nights', value: `${activeNights}` } : null,
    { icon: Users, label: 'Guests', value: `${activeGuests}` },
    selectedRoom ? { icon: BedDouble, label: 'Room', value: selectedRoom.name } : null,
  ].filter(Boolean) as { icon: typeof CalendarDays; label: string; value: string }[]

  const priceLines =
    activeNights != null && nightlyRate != null
      ? [
          {
            label: `N$${nightlyRate.toFixed(2)} × ${activeNights} ${activeNights === 1 ? 'night' : 'nights'}`,
            value: `N$${(nightlyRate * activeNights).toFixed(2)}`,
          },
        ]
      : [{ label: 'Nightly rate', value: `N$${rateLabel} / night`, muted: true }]

  const displayTotal = booking?.total_price ?? estimatedTotal

  const summaryCard = (
    <BookingSummaryCard
      image={coverSrc}
      imageAlt={listing.title}
      serviceType="stay"
      title={listing.title}
      location={areaLine}
      provider={
        listing.owner_username
          ? { name: listing.owner_username, role: 'Host', href: `/u/${encodeURIComponent(listing.owner_username)}` }
          : undefined
      }
      meta={summaryMeta}
      priceLines={priceLines}
      total={displayTotal ? { label: 'Estimated total', value: `N$${displayTotal}` } : undefined}
      estimateNote="Final amount may be confirmed by the host."
      trustNote={
        phase === 'sent'
          ? 'The host will review your dates and confirm availability.'
          : 'Review your dates and guest details before sending your request.'
      }
    >
      <p className="acc-book__summary-cancel">
        <strong>Cancellation</strong> — {cancellationBlurb}
      </p>
    </BookingSummaryCard>
  )

  const calUrl =
    phase === 'sent' && activeCheckIn && activeCheckOut
      ? googleCalendarUrl({
          title: `Stay: ${displayTitle}`,
          details: `Stay request via DELVE. ${activeGuests} guest(s).`,
          checkIn: activeCheckIn,
          checkOut: activeCheckOut,
        })
      : ''

  const roomImageSrc = selectedRoom?.images[0] || selectedRoom?.image

  return (
    <BookingShell
      serviceType="stay"
      className="acc-book-page"
      backTo={`/accommodation/${id}`}
      backLabel="Back to stay"
      title="Request your stay"
      subtitle="Choose dates, guests, and send your request to the host."
      summary={summaryCard}
    >
      <BookingStepHeader
        steps={[
          { id: 'details', label: 'Details', active: stepIndex === 1, done: stepIndex > 1 },
          { id: 'review', label: 'Review', active: stepIndex === 2, done: stepIndex > 2 },
          { id: 'sent', label: 'Sent', active: stepIndex === 3 },
        ]}
      />

      {err ? (
        <UserBookingErrorState
          title="We couldn't send your stay request"
          message={err}
          onDismiss={() => setErr(null)}
        />
      ) : null}

      {phase === 'details' ? (
        <form onSubmit={handleReview} className="acc-book__form">
          {selectedRoom ? (
            <BookingSection title="Selected room" subtitle={selectedRoom.name} icon={BedDouble}>
              <div className="acc-book__room-pick">
                <div className="acc-book__room-pick-visual">
                  {roomImageSrc ? (
                    <img
                      className="acc-book__room-pick-img"
                      src={mediaUrl(roomImageSrc) || ''}
                      alt={selectedRoom.name}
                    />
                  ) : (
                    <div className="acc-book__room-pick-img acc-book__room-pick-img--ph">
                      <BedDouble size={28} strokeWidth={1.75} aria-hidden />
                    </div>
                  )}
                </div>
                <div className="acc-book__room-pick-body">
                  <p className="acc-book__room-pick-name">{selectedRoom.name}</p>
                  <ul className="acc-book__room-pick-facts">
                    {selectedRoom.max_guests != null ? (
                      <li>
                        <Users size={14} strokeWidth={2.25} aria-hidden />
                        Up to {selectedRoom.max_guests} guests
                      </li>
                    ) : null}
                    {selectedRoom.bedrooms != null ? (
                      <li>
                        <BedDouble size={14} strokeWidth={2.25} aria-hidden />
                        {selectedRoom.bedrooms} {selectedRoom.bedrooms === 1 ? 'bedroom' : 'bedrooms'}
                      </li>
                    ) : null}
                    {selectedRoom.bed_summary ? (
                      <li>
                        <BedDouble size={14} strokeWidth={2.25} aria-hidden />
                        {selectedRoom.bed_summary}
                      </li>
                    ) : null}
                    <li>
                      <BadgeDollarSign size={14} strokeWidth={2.25} aria-hidden />
                      N${selectedRoom.price_per_night ?? listing.price_per_night} / night
                    </li>
                  </ul>
                </div>
              </div>
            </BookingSection>
          ) : null}

          <BookingSection
            title="Choose dates"
            subtitle="Check-out must be after check-in."
            icon={CalendarDays}
          >
            <BookingDateFields
              mode="range"
              checkIn={{
                id: 'acc-check-in',
                label: 'Check-in',
                value: checkIn,
                min: today,
                onChange: setCheckIn,
              }}
              checkOut={{
                id: 'acc-check-out',
                label: 'Check-out',
                value: checkOut,
                min: checkIn || today,
                onChange: setCheckOut,
              }}
            />
          </BookingSection>

          <BookingSection title="Guests" subtitle={`Maximum ${maxGuests} guests for this stay`} icon={Users}>
            <BookingGuestSelector
              id="acc-guests"
              value={guests}
              min={1}
              max={maxGuests}
              onChange={setGuests}
              hint={`Maximum ${maxGuests} guests for this booking.`}
            />
          </BookingSection>

          <BookingSection title="Special requests" subtitle="Optional — share anything the host should know">
            <BookingNotesField
              id="acc-special"
              label="Special requests"
              value={specialRequests}
              onChange={setSpecialRequests}
              placeholder="Example: We may arrive after 18:00 and would like parking if available."
              hint="Tell the host about arrival time, early check-in, accessibility needs, or anything important."
            />
          </BookingSection>

          {nights != null && nightlyRate != null && estimatedTotal ? (
            <BookingSection title="Price estimate" subtitle="Shown before you send your request" icon={BadgeDollarSign}>
              <BookingPriceSummary
                lines={priceLines}
                total={{ label: 'Estimated total', value: `N$${estimatedTotal}` }}
                estimateNote="Final amount may be confirmed by the host."
              />
            </BookingSection>
          ) : null}

          <BookingTrustNote variant="safety">
            The host will review your dates and confirm availability before the stay is final.
          </BookingTrustNote>

          <button type="submit" className="btn btn-primary btn-block acc-book__submit">
            Review stay request
          </button>
        </form>
      ) : null}

      {phase === 'review' ? (
        <div className="acc-book__review">
          <BookingSection title="Review your request" subtitle="Check everything before sending to the host">
            <div className="acc-book__review-summary">
              {coverSrc ? (
                <img className="acc-book__review-thumb" src={coverSrc} alt={displayTitle} />
              ) : (
                <div className="acc-book__review-thumb acc-book__review-thumb--ph">
                  <Building2 size={24} strokeWidth={1.75} aria-hidden />
                </div>
              )}
              <div className="acc-book__review-head">
                <h2 className="acc-book__review-title">{displayTitle}</h2>
                {areaLine ? (
                  <p className="acc-book__review-area">
                    <MapPin size={13} strokeWidth={2.25} aria-hidden />
                    {areaLine}
                  </p>
                ) : null}
              </div>
            </div>

            <dl className="acc-book__review-dl">
              <div>
                <dt>Dates</dt>
                <dd>{formatStayRange(checkIn, checkOut)}</dd>
              </div>
              <div>
                <dt>Nights</dt>
                <dd>
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{guests}</dd>
              </div>
              <div>
                <dt>Room</dt>
                <dd>{selectedRoom?.name ?? 'Standard'}</dd>
              </div>
              <div>
                <dt>Nightly rate</dt>
                <dd>N${rateLabel}</dd>
              </div>
              {specialRequests.trim() ? (
                <div className="acc-book__review-dl--full">
                  <dt>Special requests</dt>
                  <dd>{specialRequests.trim()}</dd>
                </div>
              ) : null}
            </dl>

            <BookingPriceSummary
              lines={priceLines}
              total={
                estimatedTotal ? { label: 'Estimated total', value: `N$${estimatedTotal}` } : undefined
              }
              estimateNote="Final amount may be confirmed by the host."
            />

            <p className="acc-book__cancel-note">
              <strong>Cancellation</strong> — {cancellationBlurb}
            </p>

            <div className="acc-book__review-actions">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleSendRequest}
                disabled={createMut.isPending}
              >
                {createMut.isPending ? 'Sending…' : 'Send booking request'}
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setPhase('details')}>
                Edit details
              </button>
            </div>
          </BookingSection>
        </div>
      ) : null}

      {phase === 'sent' && booking ? (
        <div className="acc-book__sent card" role="status">
          <CheckCircle className="acc-book__sent-icon" size={44} strokeWidth={2} aria-hidden />
          <h2 className="acc-book__sent-title">Request sent</h2>
          <BookingStatusBadge status="pending" label="Pending host confirmation" className="acc-book__sent-badge" />
          <p className="acc-book__sent-text">
            The host will review your dates and guest details. You can message them if you need to add more
            information.
          </p>

          <dl className="acc-book__review-dl acc-book__sent-dl">
            <div>
              <dt>Stay</dt>
              <dd>{displayTitle}</dd>
            </div>
            {areaLine ? (
              <div>
                <dt>Location</dt>
                <dd>{areaLine}</dd>
              </div>
            ) : null}
            <div>
              <dt>Dates</dt>
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
            {booking.total_price ? (
              <div>
                <dt>Estimated total</dt>
                <dd>N${booking.total_price}</dd>
              </div>
            ) : null}
            {booking.special_requests ? (
              <div className="acc-book__review-dl--full">
                <dt>Special requests</dt>
                <dd>{booking.special_requests}</dd>
              </div>
            ) : null}
          </dl>

          {booking.id ? (
            <p className="acc-book__ref">
              Request reference <code>#{booking.id}</code>
            </p>
          ) : null}

          <div className="acc-book__sent-actions">
            <Link to="/messages" className="btn btn-primary btn-block">
              <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
              Message host
            </Link>
            {listing.owner_username ? (
              <Link
                to={`/u/${encodeURIComponent(listing.owner_username)}`}
                className="btn btn-ghost btn-block"
              >
                View host profile
              </Link>
            ) : null}
            {calUrl ? (
              <a
                href={calUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-block"
              >
                <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
                Save to calendar
              </a>
            ) : null}
            <Link to="/accommodation" className="btn btn-ghost btn-block">
              Browse more stays
            </Link>
            <Link to="/dashboard#bookings" className="btn btn-ghost btn-block">
              View my bookings
            </Link>
          </div>
        </div>
      ) : null}

      {phase !== 'sent' ? (
        <button type="button" className="btn btn-ghost btn-block acc-book__back-btn" onClick={() => nav(-1)}>
          Go back
        </button>
      ) : null}
    </BookingShell>
  )
}
