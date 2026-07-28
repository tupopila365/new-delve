import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, CalendarDays } from 'lucide-react'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  BookingAccessGate,
  checkStayAvailability,
  formatStayRange,
  googleCalendarUrl,
  nightsBetween,
  todayIsoDate,
  validateStayDates,
} from '../components/booking'
import { useDisplayMoney } from '../hooks/useDisplayMoney'
import type { AvailabilityStatus } from '../components/booking'
import {
  StayAvailabilityPanel,
  StayBookingLayout,
  StayConfirmedPanel,
  StayReviewPanel,
  StayTripSummary,
} from '../components/booking/stay'
import { MessageProviderLink } from '../components/messages'
import {
  normalizeRoomTypes,
  type AccommodationListing,
} from '../utils/accommodationListing'
import { recordForYouSignal } from '../lib/forYou'

type Booking = {
  id: number
  status: string
  total_price: string
  mock_payment_ref: string
  check_in: string
  check_out: string
  guests: number
  listing_title?: string
  room_type_name?: string
  special_requests?: string
  hold_expires_at?: string | null
  expired_at?: string | null
}

type Phase = 'dates' | 'review' | 'sent'

const DEFAULT_CANCEL_BLURB =
  'Cancellation terms are set by the host. Confirm details before finalizing your stay.'

function parseGuestsParam(raw: string | null): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const n = parseInt(raw, 10)
  return Number.isNaN(n) || n < 1 ? null : n
}

function isValidIsoDate(raw: string | null): raw is string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false
  const date = new Date(`${raw}T12:00:00`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw
}

function hasValidPrefilledStay(searchParams: URLSearchParams) {
  const checkIn = searchParams.get('check_in')
  const checkOut = searchParams.get('check_out')
  const guests = parseGuestsParam(searchParams.get('guests'))
  if (
    !searchParams.get('room_type') ||
    !isValidIsoDate(checkIn) ||
    !isValidIsoDate(checkOut) ||
    guests == null
  ) {
    return false
  }
  return checkIn >= todayIsoDate() && checkOut > checkIn
}

export function AccommodationBook() {
  const { id } = useParams()
  const { format } = useDisplayMoney()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const roomTypeId = searchParams.get('room_type')
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [checkIn, setCheckIn] = useState(() => searchParams.get('check_in') ?? '')
  const [checkOut, setCheckOut] = useState(() => searchParams.get('check_out') ?? '')
  const [guests, setGuests] = useState(() => parseGuestsParam(searchParams.get('guests')) ?? 1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [phase, setPhase] = useState<Phase>(() =>
    hasValidPrefilledStay(searchParams) ? 'review' : 'dates',
  )
  const [availStatus, setAvailStatus] = useState<AvailabilityStatus>('idle')
  const [availabilityTotal, setAvailabilityTotal] = useState<string | null>(null)
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const today = todayIsoDate()

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])

  const { data: listing, isLoading } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, { auth: false }),
  })

  const roomTypes = useMemo(() => normalizeRoomTypes(listing?.room_types), [listing?.room_types])

  // Booking requests must point to a stable room record. A legacy editable room
  // name is deliberately not used as a fallback here.
  const selectedRoom = useMemo(
    () => roomTypes.find((room) => room.id != null && String(room.id) === roomTypeId),
    [roomTypes, roomTypeId],
  )

  const maxGuests = useMemo(() => {
    if (!listing) return 1
    if (selectedRoom?.max_guests != null) {
      return Math.min(listing.max_guests, selectedRoom.max_guests)
    }
    return listing.max_guests
  }, [listing, selectedRoom])

  useEffect(() => {
    if (guests <= maxGuests) return
    setPhase('dates')
    setErr(`This room fits up to ${maxGuests} guests.`)
    setAvailStatus('idle')
    setAvailabilityTotal(null)
    setGuests(maxGuests)
  }, [guests, maxGuests])

  const nightlyRate = useMemo(() => {
    const raw = selectedRoom?.price_per_night ?? listing?.price_per_night
    if (raw == null || raw === '') return null
    const price = parseFloat(String(raw))
    return Number.isNaN(price) ? null : price
  }, [listing, selectedRoom])

  const baseTotal = useMemo(() => {
    if (!nights || nightlyRate == null) return null
    return nightlyRate * nights
  }, [nights, nightlyRate])

  const estimatedTotal = availabilityTotal ?? (baseTotal != null ? baseTotal.toFixed(2) : null)
  const cancellationBlurb = listing?.cancellation_policy?.trim() || DEFAULT_CANCEL_BLURB
  const reviewValidationError = useMemo(() => {
    if (!isValidIsoDate(checkIn)) return 'Select a valid check-in date.'
    if (!isValidIsoDate(checkOut)) return 'Select a valid check-out date.'
    if (checkIn < today) return 'Check-in cannot be in the past.'
    return validateStayDates({ checkIn, checkOut, guests, maxGuests })
  }, [checkIn, checkOut, guests, maxGuests, today])

  const runAvailabilityCheck = useCallback(async () => {
    if (!id || !selectedRoom?.id) return false

    setErr(null)
    setUnavailableReason(null)
    setAvailStatus('checking')

    const result = await checkStayAvailability({
      checkIn,
      checkOut,
      guests,
      maxGuests,
      listingId: id,
      roomTypeId: selectedRoom.id,
      roomTypeName: selectedRoom.name,
    })

    if (result.available) {
      setAvailStatus('available')
      setAvailabilityTotal(result.estimatedTotal ?? null)
      return true
    }

    setAvailStatus('unavailable')
    setAvailabilityTotal(null)
    setUnavailableReason(result.reason)
    return false
  }, [checkIn, checkOut, guests, maxGuests, id, selectedRoom?.id, selectedRoom?.name])

  useEffect(() => {
    if (
      !listing ||
      !selectedRoom ||
      phase !== 'review' ||
      reviewValidationError ||
      availStatus !== 'idle'
    ) {
      return
    }
    void runAvailabilityCheck().then((available) => {
      if (!available) setPhase('dates')
    })
  }, [
    listing,
    selectedRoom,
    phase,
    reviewValidationError,
    availStatus,
    runAvailabilityCheck,
  ])

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
          room_type: selectedRoom?.id,
          room_type_name: selectedRoom?.name,
        }),
      }),
    onSuccess: (createdBooking) => {
      recordForYouSignal('stays', 'book')
      setBooking(createdBooking)
      setPhase('sent')
      void qc.invalidateQueries({ queryKey: ['acc-bookings'] })
    },
    onError: (error) =>
      setErr(
        error instanceof ApiError
          ? error.message
          : "We couldn't send your stay request. Please check your details and try again.",
      ),
  })

  if (isLoading || !listing) {
    return (
      <div className="stay-book">
        <div className="stay-book__container">
          <div className="skeleton" style={{ minHeight: 320, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <BookingAccessGate
        serviceType="stay"
        mode="signin"
        backTo={`/accommodation/${id}`}
        backLabel="Back to stay"
        className="acc-book-page acc-book-page--gate"
      />
    )
  }

  if (!profile.email_verified) {
    return (
      <BookingAccessGate
        serviceType="stay"
        mode="verify"
        backTo={`/accommodation/${id}`}
        backLabel="Back to stay"
        className="acc-book-page acc-book-page--gate"
      />
    )
  }

  if (!roomTypeId || !selectedRoom?.id) {
    const roomSteps = [
      { id: 'room', label: 'Room', active: true },
      { id: 'dates', label: 'Dates & guests' },
      { id: 'review', label: 'Review & request' },
      { id: 'confirm', label: 'Host confirms' },
      { id: 'pay', label: 'Pay' },
    ]

    return (
      <StayBookingLayout
        backTo={`/accommodation/${id}`}
        backLabel="Back to stay"
        steps={roomSteps}
        className="stay-book--room-required"
      >
        <section className="stay-card stay-room-required" aria-labelledby="stay-room-required-title">
          <BedDouble size={34} strokeWidth={1.8} aria-hidden />
          <p className="stay-card__eyebrow">Step 1 of 5</p>
          <h2 id="stay-room-required-title" className="stay-card__title">
            Choose a room first
          </h2>
          <p className="stay-card__sub">
            This booking link does not include a valid room. Return to the stay to compare rooms,
            prices and capacity before choosing your dates.
          </p>
          <Link to={`/accommodation/${id}`} className="btn btn-primary btn-block">
            Choose a room
          </Link>
        </section>
      </StayBookingLayout>
    )
  }

  const displayTitle = booking?.listing_title || listing.title
  const areaLine = [listing.city, listing.region].filter(Boolean).join(' · ')
  const coverSrc = listing.cover_image ? mediaUrl(listing.cover_image) || '' : undefined
  const roomDetailPath = `/accommodation/${id}/room/${encodeURIComponent(String(selectedRoom.id))}`
  const editRoomPath = `${roomDetailPath}?${new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut,
    guests: String(guests),
  }).toString()}`
  const displayPhase = phase === 'review' && reviewValidationError ? 'dates' : phase

  const activeCheckIn = booking?.check_in ?? checkIn
  const activeCheckOut = booking?.check_out ?? checkOut
  const activeGuests = booking?.guests ?? guests
  const activeNights = nightsBetween(activeCheckIn, activeCheckOut) ?? nights
  const displayRoomName = booking?.room_type_name || selectedRoom.name

  const summaryRows = [
    activeCheckIn && activeCheckOut
      ? { label: 'Dates', value: formatStayRange(activeCheckIn, activeCheckOut) }
      : null,
    activeNights ? { label: 'Nights', value: `${activeNights}` } : null,
    { label: 'Guests', value: `${activeGuests}` },
    { label: 'Room', value: displayRoomName },
  ].filter(Boolean) as { label: string; value: string }[]

  const displayTotal = booking?.total_price ?? estimatedTotal
  const tripSummary = (
    <StayTripSummary
      image={coverSrc}
      imageAlt={listing.title}
      title={listing.title}
      location={areaLine}
      rows={summaryRows}
      total={displayTotal ? { label: 'Stay total', value: format(displayTotal) } : undefined}
      note="No payment now. The host confirms your request first."
    />
  )

  const steps = [
    { id: 'room', label: 'Room', done: true },
    {
      id: 'dates',
      label: 'Dates & guests',
      active: displayPhase === 'dates',
      done: displayPhase === 'review' || displayPhase === 'sent',
    },
    {
      id: 'review',
      label: 'Review & request',
      active: displayPhase === 'review',
      done: displayPhase === 'sent',
    },
    { id: 'confirm', label: 'Host confirms', active: displayPhase === 'sent' },
    { id: 'pay', label: 'Pay' },
  ]

  const reviewItems = [
    { label: 'Room', value: selectedRoom.name },
    { label: 'Dates', value: formatStayRange(checkIn, checkOut) },
    { label: 'Nights', value: `${nights} ${nights === 1 ? 'night' : 'nights'}` },
    { label: 'Guests', value: `${guests}` },
  ]

  const priceRows = (() => {
    if (nights == null || nightlyRate == null || baseTotal == null) return []
    const rows = [
      {
        label: `${format(nightlyRate)} × ${nights} ${nights === 1 ? 'night' : 'nights'}`,
        value: format(baseTotal),
      },
    ]
    if (availabilityTotal) {
      const totalNumber = parseFloat(availabilityTotal)
      const adjustment = totalNumber - baseTotal
      if (Number.isFinite(adjustment) && Math.abs(adjustment) >= 0.005) {
        rows.push({
          label: 'Date-specific nightly rate adjustment',
          value: `${adjustment > 0 ? '+' : '−'}${format(Math.abs(adjustment))}`,
        })
      }
    }
    rows.push({ label: 'Additional DELVE fee due now', value: 'None' })
    return rows
  })()

  const sentDetails = booking
    ? [
        { label: 'Stay', value: displayTitle },
        ...(areaLine ? [{ label: 'Location', value: areaLine }] : []),
        { label: 'Dates', value: formatStayRange(booking.check_in, booking.check_out) },
        {
          label: 'Nights',
          value: (() => {
            const count = nightsBetween(booking.check_in, booking.check_out)
            return count != null ? `${count} ${count === 1 ? 'night' : 'nights'}` : '—'
          })(),
        },
        { label: 'Guests', value: `${booking.guests}` },
        { label: 'Room', value: displayRoomName },
        ...(booking.total_price ? [{ label: 'Total', value: format(booking.total_price) }] : []),
        ...(booking.hold_expires_at
          ? [{ label: 'Host response by', value: new Date(booking.hold_expires_at).toLocaleString() }]
          : []),
        ...(booking.special_requests
          ? [{ label: 'Special requests', value: booking.special_requests, fullWidth: true as const }]
          : []),
      ]
    : []

  const calendarUrl =
    phase === 'sent' && activeCheckIn && activeCheckOut
      ? googleCalendarUrl({
          title: `Stay: ${displayTitle}`,
          details: `Stay request via DELVE. ${activeGuests} guest(s).`,
          checkIn: activeCheckIn,
          checkOut: activeCheckOut,
        })
      : ''

  const resetAvailability = () => {
    setAvailStatus('idle')
    setAvailabilityTotal(null)
    setUnavailableReason(null)
    setErr(null)
  }

  const handleReviewDates = async () => {
    if (reviewValidationError) {
      setErr(reviewValidationError)
      return
    }
    const available = await runAvailabilityCheck()
    if (available) {
      setErr(null)
      setPhase('review')
    }
  }

  const handleSendRequest = async () => {
    if (reviewValidationError) {
      setErr(reviewValidationError)
      setPhase('dates')
      setAvailStatus('idle')
      return
    }

    // This preflight keeps feedback immediate. The POST remains the authoritative,
    // transactional availability check and protects against simultaneous requests.
    const available = await runAvailabilityCheck()
    if (!available) {
      setPhase('dates')
      return
    }
    setErr(null)
    createMut.mutate()
  }

  return (
    <StayBookingLayout
      backTo={roomDetailPath}
      backLabel="Back to room"
      steps={steps}
      summary={displayPhase !== 'sent' ? tripSummary : undefined}
    >
      {displayPhase === 'dates' ? (
        <StayAvailabilityPanel
          status={availStatus}
          unavailableReason={unavailableReason}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          maxGuests={maxGuests}
          roomName={selectedRoom.name}
          nights={nights}
          estimatedTotal={estimatedTotal}
          error={err ?? reviewValidationError}
          today={today}
          onCheckInChange={(value) => {
            setCheckIn(value)
            resetAvailability()
          }}
          onCheckOutChange={(value) => {
            setCheckOut(value)
            resetAvailability()
          }}
          onGuestsChange={(value) => {
            setGuests(value)
            resetAvailability()
          }}
          onReview={handleReviewDates}
        />
      ) : null}

      {displayPhase === 'review' ? (
        <>
          {err ? (
            <p className="stay-avail__error" role="alert">
              {err}
            </p>
          ) : null}
          <StayReviewPanel
            title={listing.title}
            location={areaLine}
            items={reviewItems}
            specialRequests={specialRequests}
            onSpecialRequestsChange={setSpecialRequests}
            priceRows={priceRows}
            total={estimatedTotal ? format(estimatedTotal) : undefined}
            cancellationTerms={cancellationBlurb}
            availabilityChecking={availStatus === 'idle' || availStatus === 'checking'}
            isSubmitting={createMut.isPending}
            onBack={() => navigate(editRoomPath)}
            onConfirm={() => void handleSendRequest()}
          />
        </>
      ) : null}

      {displayPhase === 'sent' && booking ? (
        <StayConfirmedPanel
          message={
            booking.hold_expires_at
              ? `The host can respond until ${new Date(booking.hold_expires_at).toLocaleString()}. No payment has been taken.`
              : 'The host normally responds within 24 hours. No payment has been taken.'
          }
          details={sentDetails}
          reference={booking.id}
          nextSteps={[
            {
              title: 'Host reviews your request',
              text: booking.hold_expires_at
                ? `A response is due by ${new Date(booking.hold_expires_at).toLocaleString()}.`
                : 'Hosts normally respond within 24 hours.',
            },
            {
              title: 'Pay only if confirmed',
              text: 'If the host confirms, you will receive a 30-minute window to pay.',
            },
            {
              title: 'If declined or unanswered',
              text: 'You are not charged, the request closes and the dates are released.',
            },
          ]}
          actions={
            <>
              <Link
                to={`/dashboard/bookings/stay/${booking.id}`}
                className="btn btn-primary btn-block"
              >
                Track request
              </Link>
              <MessageProviderLink
                username={listing.owner_username}
                label="Message host"
                role="host"
                variant="ghost"
                size="block"
                place={{
                  type: 'booking_stay',
                  id: booking.id,
                  label: displayTitle,
                }}
              />
              {listing.owner_username ? (
                <Link
                  to={`/u/${encodeURIComponent(listing.owner_username)}`}
                  className="btn btn-ghost btn-block"
                >
                  View host profile
                </Link>
              ) : null}
              {calendarUrl ? (
                <a
                  href={calendarUrl}
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
            </>
          }
        />
      ) : null}
    </StayBookingLayout>
  )
}
