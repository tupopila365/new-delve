import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
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
import type { AvailabilityStatus } from '../components/booking'
import {
  StayAvailabilityPanel,
  StayBookingLayout,
  StayConfirmedPanel,
  StayDetailsPanel,
  StayReviewPanel,
  StayTripSummary,
} from '../components/booking/stay'
import { MessageProviderLink } from '../components/messages'
import {
  normalizeRoomTypes,
  type AccommodationListing,
  type RoomTypeItem,
} from '../utils/accommodationListing'

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

type Phase = 'availability' | 'details' | 'review' | 'sent'

const DEFAULT_CANCEL_BLURB =
  'Cancellation terms are set by the host. Confirm details before finalizing your stay.'

function parseGuestsParam(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isNaN(n) || n < 1 ? null : n
}

export function AccommodationBook() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const roomName = searchParams.get('room') ?? ''
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [checkIn, setCheckIn] = useState(() => searchParams.get('check_in') ?? '')
  const [checkOut, setCheckOut] = useState(() => searchParams.get('check_out') ?? '')
  const [guests, setGuests] = useState(() => parseGuestsParam(searchParams.get('guests')) ?? 1)
  const [specialRequests, setSpecialRequests] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [phase, setPhase] = useState<Phase>('availability')
  const [availStatus, setAvailStatus] = useState<AvailabilityStatus>('idle')
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [showDateFields, setShowDateFields] = useState(() => {
    const hasDates = Boolean(searchParams.get('check_in') && searchParams.get('check_out'))
    return !hasDates
  })
  const [err, setErr] = useState<string | null>(null)

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut])

  const { data: listing, isLoading } = useQuery({
    queryKey: ['acc', id],
    enabled: !!id,
    queryFn: () => apiFetch<AccommodationListing>(`/api/accommodation/listings/${id}/`, { auth: false }),
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

  const runAvailabilityCheck = useCallback(async () => {
    setErr(null)
    setUnavailableReason(null)
    setAvailStatus('checking')

    const result = await checkStayAvailability({
      checkIn,
      checkOut,
      guests,
      maxGuests,
      listingId: id!,
      roomTypeName: selectedRoom?.name,
    })

    if (result.available) {
      setAvailStatus('available')
      setShowDateFields(false)
    } else {
      setAvailStatus('unavailable')
      setUnavailableReason(result.reason)
      setShowDateFields(true)
    }
  }, [checkIn, checkOut, guests, maxGuests, id, selectedRoom?.name])

  const hasPrefilledDates = Boolean(searchParams.get('check_in') && searchParams.get('check_out'))

  useEffect(() => {
    if (!listing || !hasPrefilledDates || phase !== 'availability') return
    if (availStatus !== 'idle') return
    void runAvailabilityCheck()
  }, [listing, hasPrefilledDates, phase, availStatus, runAvailabilityCheck])

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

  const today = todayIsoDate()
  const displayTitle = booking?.listing_title || listing.title
  const areaLine = [listing.city, listing.region].filter(Boolean).join(' · ')
  const coverSrc = listing.cover_image ? mediaUrl(listing.cover_image) || '' : undefined

  const activeCheckIn = booking?.check_in ?? checkIn
  const activeCheckOut = booking?.check_out ?? checkOut
  const activeGuests = booking?.guests ?? guests
  const activeNights = nightsBetween(activeCheckIn, activeCheckOut) ?? nights

  const summaryRows = [
    activeCheckIn && activeCheckOut
      ? { label: 'Dates', value: formatStayRange(activeCheckIn, activeCheckOut) }
      : null,
    activeNights ? { label: 'Nights', value: `${activeNights}` } : null,
    { label: 'Guests', value: `${activeGuests}` },
    selectedRoom ? { label: 'Room', value: selectedRoom.name } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  const displayTotal = booking?.total_price ?? estimatedTotal

  const tripSummary = (
    <StayTripSummary
      image={coverSrc}
      imageAlt={listing.title}
      title={listing.title}
      location={areaLine}
      rows={summaryRows}
      total={displayTotal ? { label: 'Total', value: `N$${displayTotal}` } : undefined}
      note="You won't be charged until the host confirms."
    />
  )

  const stepIndex =
    phase === 'availability' ? 1 : phase === 'details' ? 2 : phase === 'review' ? 3 : 4

  const steps = [
    { id: 'availability', label: 'Availability', active: stepIndex === 1, done: stepIndex > 1 },
    { id: 'details', label: 'Your stay', active: stepIndex === 2, done: stepIndex > 2 },
    { id: 'review', label: 'Review', active: stepIndex === 3, done: stepIndex > 3 },
    { id: 'sent', label: 'Done', active: stepIndex === 4 },
  ]

  const reviewItems = [
    { label: 'Dates', value: formatStayRange(checkIn, checkOut) },
    { label: 'Nights', value: `${nights} ${nights === 1 ? 'night' : 'nights'}` },
    { label: 'Guests', value: `${guests}` },
    { label: 'Room', value: selectedRoom?.name ?? 'Standard' },
    { label: 'Nightly rate', value: `N$${rateLabel}` },
    ...(specialRequests.trim()
      ? [{ label: 'Special requests', value: specialRequests.trim(), fullWidth: true as const }]
      : []),
  ]

  const sentDetails = booking
    ? [
        { label: 'Stay', value: displayTitle },
        ...(areaLine ? [{ label: 'Location', value: areaLine }] : []),
        { label: 'Dates', value: formatStayRange(booking.check_in, booking.check_out) },
        {
          label: 'Nights',
          value: (() => {
            const n = nightsBetween(booking.check_in, booking.check_out)
            return n != null ? `${n} ${n === 1 ? 'night' : 'nights'}` : '—'
          })(),
        },
        { label: 'Guests', value: `${booking.guests}` },
        { label: 'Room', value: selectedRoom?.name ?? 'Standard' },
        ...(booking.total_price ? [{ label: 'Total', value: `N$${booking.total_price}` }] : []),
        ...(booking.special_requests
          ? [{ label: 'Special requests', value: booking.special_requests, fullWidth: true as const }]
          : []),
      ]
    : []

  const calUrl =
    phase === 'sent' && activeCheckIn && activeCheckOut
      ? googleCalendarUrl({
          title: `Stay: ${displayTitle}`,
          details: `Stay request via DELVE. ${activeGuests} guest(s).`,
          checkIn: activeCheckIn,
          checkOut: activeCheckOut,
        })
      : ''

  const handleCheckAvailability = () => {
    const validationErr = validateStayDates({ checkIn, checkOut, guests, maxGuests })
    if (validationErr) {
      setErr(validationErr)
      setShowDateFields(true)
      return
    }
    void runAvailabilityCheck()
  }

  const handleContinueFromAvailability = () => {
    if (availStatus !== 'available') return
    setPhase('details')
    setErr(null)
  }

  const handleChangeDates = () => {
    setAvailStatus('idle')
    setUnavailableReason(null)
    setShowDateFields(true)
    setErr(null)
  }

  const handleSendRequest = () => {
    const validationErr = validateStayDates({ checkIn, checkOut, guests, maxGuests })
    if (validationErr) {
      setErr(validationErr)
      setPhase('availability')
      setAvailStatus('idle')
      setShowDateFields(true)
      return
    }
    setErr(null)
    createMut.mutate()
  }

  const priceLine =
    activeNights != null && nightlyRate != null
      ? `N$${nightlyRate.toFixed(2)} × ${activeNights} ${activeNights === 1 ? 'night' : 'nights'}`
      : undefined

  return (
    <StayBookingLayout
      backTo={`/accommodation/${id}`}
      backLabel="Back to stay"
      steps={steps}
      summary={phase !== 'sent' ? tripSummary : undefined}
    >
      {err && phase !== 'availability' ? (
        <p className="stay-avail__error" role="alert">
          {err}
        </p>
      ) : null}

      {phase === 'availability' ? (
        <StayAvailabilityPanel
          status={availStatus}
          unavailableReason={unavailableReason}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          maxGuests={maxGuests}
          roomName={selectedRoom?.name}
          nights={nights}
          nightlyRate={nightlyRate}
          estimatedTotal={estimatedTotal}
          showDateFields={showDateFields || availStatus === 'idle'}
          error={err}
          today={today}
          onCheckInChange={(v) => {
            setCheckIn(v)
            setAvailStatus('idle')
          }}
          onCheckOutChange={(v) => {
            setCheckOut(v)
            setAvailStatus('idle')
          }}
          onGuestsChange={(v) => {
            setGuests(v)
            setAvailStatus('idle')
          }}
          onCheck={handleCheckAvailability}
          onContinue={handleContinueFromAvailability}
          onChangeDates={handleChangeDates}
        />
      ) : null}

      {phase === 'details' ? (
        <StayDetailsPanel
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
          roomName={selectedRoom?.name}
          specialRequests={specialRequests}
          onSpecialRequestsChange={setSpecialRequests}
          onBack={() => setPhase('availability')}
          onContinue={() => {
            setErr(null)
            setPhase('review')
          }}
        />
      ) : null}

      {phase === 'review' ? (
        <StayReviewPanel
          title={listing.title}
          location={areaLine}
          items={reviewItems}
          priceLine={priceLine}
          total={estimatedTotal ? `N$${estimatedTotal}` : undefined}
          cancelNote={`Cancellation — ${cancellationBlurb}`}
          isSubmitting={createMut.isPending}
          onBack={() => setPhase('details')}
          onConfirm={handleSendRequest}
        />
      ) : null}

      {phase === 'sent' && booking ? (
        <StayConfirmedPanel
          details={sentDetails}
          reference={booking.id}
          actions={
            <>
              <MessageProviderLink
                username={listing.owner_username}
                label="Message host"
                role="host"
                variant="primary"
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
            </>
          }
        />
      ) : null}
    </StayBookingLayout>
  )
}
