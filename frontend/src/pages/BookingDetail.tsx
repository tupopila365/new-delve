import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, Bus, CalendarDays, Car, Compass, MessageCircle, Utensils } from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  BookingStatusBadge,
  bookingNextStep,
  bookingStatusLabel,
  normalizeBookingStatus,
} from '../components/booking'
import { StayReviewForm } from '../components/accommodation/StayReviewForm'
import { FoodReviewForm } from '../components/food/FoodReviewForm'
import { GuideReviewForm } from '../components/guide/GuideReviewForm'
import { TransportReviewForm } from '../components/transport/TransportReviewForm'
import { MessageProviderLink } from '../components/messages'
import {
  findSeatBookingGroup,
  useMySeatBookingGroups,
  useMyVehicleBookings,
  type MyVehicleBooking,
} from '../hooks/useMyTransportBookings'
import { useMyFoodReservations, type MyFoodReservation } from '../hooks/useMyFoodReservations'
import type { FoodVenueListing } from '../utils/foodListing'
import '../components/booking/booking-detail.css'

type StayBooking = {
  id: number
  listing: number
  listing_title: string
  listing_owner_username?: string
  check_in: string
  check_out: string
  guests: number
  total_price?: string
  special_requests?: string
  room_type_name?: string
  status: string
  mock_payment_ref?: string
  has_review?: boolean
}

type GuideBooking = {
  id: number
  guide: number
  guide_headline: string
  guide_username?: string
  date: string
  start_time?: string | null
  duration_hours?: number
  group_size: number
  meeting_point?: string
  package_id?: string
  package_title?: string
  notes?: string
  total_price?: string
  mock_payment_ref?: string
  status: string
  has_reviewed?: boolean
  can_review?: boolean
  created_at?: string
}

type DetailRow = {
  label: string
  value: string
}

const BOOKING_STAGES = ['Requested', 'Pending review', 'Confirmed', 'Completed'] as const

function stageIndexForStatus(status: string): number {
  const key = normalizeBookingStatus(status)
  if (key === 'draft') return 0
  if (key === 'requested' || key === 'reserved') return 0
  if (key === 'pending') return 1
  if (key === 'confirmed' || key === 'checked_in' || key === 'accepted' || key === 'paid') return 2
  if (key === 'completed' || key === 'checked_out' || key === 'seated') return 3
  if (key === 'cancelled' || key === 'declined' || key === 'disputed' || key === 'no_show') return 1
  return 0
}

function stageState(index: number, activeIndex: number): 'done' | 'active' | 'todo' {
  if (index < activeIndex) return 'done'
  if (index === activeIndex) return 'active'
  return 'todo'
}

function humanizePackageId(packageId: string): string {
  return packageId
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function goBack(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.length > 1) {
    navigate(-1)
    return
  }
  navigate('/dashboard#bookings')
}

function formatBusWhen(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-NA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function formatFoodWhen(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-NA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export function BookingDetail() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { service, id } = useParams<{ service: string; id: string }>()
  const bookingId = Number(id)

  const { data: stayBookings = [], isLoading: loadingStay } = useQuery({
    queryKey: ['my-bookings', 'stays'],
    queryFn: async () => {
      try {
        return asArray<StayBooking>(await apiFetch('/api/accommodation/bookings/'))
      } catch {
        return []
      }
    },
    enabled: Boolean(profile) && service === 'stay',
  })

  const { data: guideBookings = [], isLoading: loadingGuide } = useQuery({
    queryKey: ['my-bookings', 'guides'],
    queryFn: () => apiFetch<GuideBooking[]>('/api/guides/bookings/').catch(() => [] as GuideBooking[]),
    enabled: Boolean(profile) && service === 'guide',
  })

  const { data: vehicleBookings = [], isLoading: loadingVehicle } = useMyVehicleBookings(
    Boolean(profile) && service === 'vehicle',
  )
  const { groups: seatGroups = [], isLoading: loadingBus } = useMySeatBookingGroups(
    Boolean(profile) && service === 'bus',
  )
  const { data: foodReservations = [], isLoading: loadingFood } = useMyFoodReservations(
    Boolean(profile) && service === 'food',
  )

  const food = service === 'food' ? foodReservations.find((b) => b.id === bookingId) : undefined

  const { data: foodVenue } = useQuery({
    queryKey: ['food', food?.venue, 'review-eligibility'],
    queryFn: () => apiFetch<FoodVenueListing>(`/api/food/venues/${food!.venue}/`, { auth: true }),
    enabled: Boolean(profile) && service === 'food' && Boolean(food),
  })

  const cancelStayMut = useMutation({
    mutationFn: () =>
      apiFetch<StayBooking>(`/api/accommodation/bookings/${bookingId}/cancel/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-bookings', 'stays'] }),
  })

  const payStayMut = useMutation({
    mutationFn: () =>
      apiFetch<{ mock_payment_ref: string }>(`/api/accommodation/bookings/${bookingId}/mock_pay/`, {
        method: 'POST',
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-bookings', 'stays'] }),
  })

  const cancelVehicleMut = useMutation({
    mutationFn: () =>
      apiFetch<MyVehicleBooking>(`/api/transport/vehicle-bookings/${bookingId}/cancel/`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'transport', 'vehicles'] })
    },
  })

  const payVehicleMut = useMutation({
    mutationFn: () =>
      apiFetch<{ status: string; mock_payment_ref: string }>(
        `/api/transport/vehicle-bookings/${bookingId}/mock_pay/`,
        { method: 'POST', body: JSON.stringify({}) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'transport', 'vehicles'] })
    },
  })

  const cancelBusMut = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map((rid) =>
          apiFetch(`/api/transport/bus/reservations/${rid}/cancel/`, { method: 'POST', body: JSON.stringify({}) }),
        ),
      )
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'transport', 'seats'] })
    },
  })

  const cancelFoodMut = useMutation({
    mutationFn: () =>
      apiFetch<MyFoodReservation>(`/api/food/reservations/${bookingId}/cancel/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-bookings', 'food'] }),
  })

  const cancelGuideMut = useMutation({
    mutationFn: () =>
      apiFetch<GuideBooking>(`/api/guides/bookings/${bookingId}/cancel/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-bookings', 'guides'] }),
  })

  const payGuideMut = useMutation({
    mutationFn: () =>
      apiFetch<GuideBooking>(`/api/guides/bookings/${bookingId}/mock_pay/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-bookings', 'guides'] }),
  })

  const payBusMut = useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length > 1) {
        return apiFetch<{ status: string; mock_payment_ref: string }>(
          '/api/transport/bus/reservations/bulk-mock-pay/',
          { method: 'POST', body: JSON.stringify({ reservation_ids: ids }) },
        )
      }
      return apiFetch<{ status: string; mock_payment_ref: string }>(
        `/api/transport/bus/reservations/${ids[0]}/mock_pay/`,
        { method: 'POST', body: JSON.stringify({}) },
      )
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-bookings', 'transport', 'seats'] })
    },
  })

  if (!profile) return <Navigate to="/login" replace />

  const validService =
    service === 'stay' ||
    service === 'guide' ||
    service === 'vehicle' ||
    service === 'bus' ||
    service === 'food'
  if (!Number.isFinite(bookingId) || !validService) {
    return <Navigate to="/dashboard#bookings" replace />
  }

  const isLoading =
    service === 'stay'
      ? loadingStay
      : service === 'guide'
        ? loadingGuide
        : service === 'vehicle'
          ? loadingVehicle
          : service === 'food'
            ? loadingFood
            : loadingBus
  const stay = service === 'stay' ? stayBookings.find((b) => b.id === bookingId) : undefined
  const guide = service === 'guide' ? guideBookings.find((b) => b.id === bookingId) : undefined
  const vehicle = service === 'vehicle' ? vehicleBookings.find((b) => b.id === bookingId) : undefined
  const busGroup = service === 'bus' ? findSeatBookingGroup(seatGroups, bookingId) : undefined
  const notFound = !isLoading && !stay && !guide && !vehicle && !busGroup && !food

  const serviceType =
    service === 'stay'
      ? 'stay'
      : service === 'vehicle'
        ? 'vehicle'
        : service === 'bus'
          ? 'bus'
          : service === 'food'
            ? 'food'
            : 'guide'

  const status = stay?.status ?? guide?.status ?? vehicle?.status ?? busGroup?.status ?? food?.status ?? 'pending'
  const activeStage = stageIndexForStatus(status)
  const nextStep = bookingNextStep(status, serviceType)

  const title = stay
    ? stay.listing_title
    : vehicle
      ? vehicle.listing_title
      : busGroup
        ? busGroup.route_label
        : food
          ? food.venue_name
          : guide?.package_title?.trim()
            ? guide.package_title.trim()
            : guide?.package_id?.trim()
              ? humanizePackageId(guide.package_id.trim())
              : guide?.guide_headline ?? 'Booking'

  const subtitle = stay
    ? `${stay.check_in} – ${stay.check_out} · ${stay.guests} ${stay.guests === 1 ? 'guest' : 'guests'}`
    : vehicle
      ? `${vehicle.start_date} – ${vehicle.end_date}`
      : busGroup
        ? `${formatBusWhen(busGroup.trip_departs_at)} · Seats ${busGroup.seat_numbers.join(', ')}`
        : food
          ? `${formatFoodWhen(food.reserved_for)} · ${food.party_size} ${food.party_size === 1 ? 'guest' : 'guests'}`
          : guide
            ? [
                guide.date,
                guide.start_time ? String(guide.start_time).slice(0, 5) : null,
                guide.duration_hours ? `${guide.duration_hours}h` : null,
                `${guide.group_size} ${guide.group_size === 1 ? 'traveller' : 'travellers'}`,
              ]
                .filter(Boolean)
                .join(' · ')
            : ''

  const details = useMemo((): DetailRow[] => {
    if (stay) {
      return [
        { label: 'Check in', value: stay.check_in },
        { label: 'Check out', value: stay.check_out },
        { label: 'Guests', value: `${stay.guests}` },
        ...(stay.room_type_name?.trim() ? [{ label: 'Room', value: stay.room_type_name.trim() }] : []),
        { label: 'Total', value: stay.total_price ? `N$${stay.total_price}` : 'TBD' },
        ...(stay.mock_payment_ref?.trim()
          ? [{ label: 'Payment ref', value: stay.mock_payment_ref.trim() }]
          : []),
        { label: 'Reference', value: `STAY-${stay.id}` },
        ...(stay.special_requests?.trim()
          ? [{ label: 'Special requests', value: stay.special_requests.trim() }]
          : []),
      ]
    }

    if (guide) {
      const packageLabel =
        guide.package_title?.trim() ||
        (guide.package_id?.trim() ? humanizePackageId(guide.package_id.trim()) : 'Custom tour')
      return [
        { label: 'Date', value: guide.date },
        ...(guide.start_time
          ? [{ label: 'Start time', value: String(guide.start_time).slice(0, 5) }]
          : []),
        ...(guide.duration_hours
          ? [{ label: 'Duration', value: `${guide.duration_hours} hours` }]
          : []),
        { label: 'Travellers', value: `${guide.group_size}` },
        { label: 'Package', value: packageLabel },
        { label: 'Guide', value: guide.guide_headline },
        ...(guide.meeting_point?.trim()
          ? [{ label: 'Meeting point', value: guide.meeting_point.trim() }]
          : []),
        { label: 'Total', value: guide.total_price ? `N$${guide.total_price}` : 'TBD' },
        ...(guide.mock_payment_ref?.trim()
          ? [{ label: 'Payment ref', value: guide.mock_payment_ref.trim() }]
          : []),
        { label: 'Reference', value: `GUIDE-${guide.id}` },
        ...(guide.notes?.trim() ? [{ label: 'Notes', value: guide.notes.trim() }] : []),
      ]
    }

    if (vehicle) {
      const location = [vehicle.listing_city, vehicle.listing_region].filter(Boolean).join(', ')
      return [
        { label: 'Pick-up', value: vehicle.start_date },
        { label: 'Return', value: vehicle.end_date },
        { label: 'Provider', value: vehicle.owner_display_name?.trim() || vehicle.listing_owner_username },
        ...(location ? [{ label: 'Location', value: location }] : []),
        { label: 'Total', value: vehicle.total_price ? `N$${vehicle.total_price}` : 'TBD' },
        ...(vehicle.mock_payment_ref?.trim()
          ? [{ label: 'Payment ref', value: vehicle.mock_payment_ref.trim() }]
          : []),
        { label: 'Reference', value: `VEH-${vehicle.id}` },
      ]
    }

    if (busGroup) {
      return [
        { label: 'Departure', value: formatBusWhen(busGroup.trip_departs_at) },
        { label: 'Route', value: busGroup.route_label },
        { label: 'Operator', value: busGroup.operator_name || 'Bus operator' },
        { label: 'Seats', value: busGroup.seat_numbers.join(', ') },
        { label: 'Total', value: busGroup.total_price },
        ...(busGroup.mock_payment_ref?.trim()
          ? [{ label: 'Payment ref', value: busGroup.mock_payment_ref.trim() }]
          : []),
        { label: 'Reference', value: `BUS-${busGroup.reservation_ids[0]}` },
      ]
    }

    if (food) {
      const location = [food.venue_city, food.venue_region].filter(Boolean).join(', ')
      return [
        { label: 'When', value: formatFoodWhen(food.reserved_for) },
        { label: 'Party size', value: `${food.party_size}` },
        { label: 'Venue', value: food.venue_name },
        { label: 'Host', value: food.owner_display_name?.trim() || food.owner_username },
        ...(location ? [{ label: 'Location', value: location }] : []),
        { label: 'Reference', value: `FOOD-${food.id}` },
        ...(food.special_requests?.trim()
          ? [{ label: 'Special requests', value: food.special_requests.trim() }]
          : []),
      ]
    }

    return []
  }, [stay, guide, vehicle, busGroup, food])

  const canReviewStay =
    Boolean(stay) &&
    ['confirmed', 'checked_in', 'checked_out'].includes(normalizeBookingStatus(stay!.status)) &&
    !stay!.has_review

  const canReviewVehicle =
    Boolean(vehicle) &&
    ['confirmed', 'checked_in', 'checked_out'].includes(normalizeBookingStatus(vehicle!.status)) &&
    !vehicle!.has_review

  const canReviewBus =
    Boolean(busGroup) &&
    ['confirmed', 'checked_in', 'checked_out'].includes(normalizeBookingStatus(busGroup!.status)) &&
    !busGroup!.has_review

  const canReviewFood =
    Boolean(food) &&
    ['checked_in', 'checked_out'].includes(normalizeBookingStatus(food!.status)) &&
    Boolean(foodVenue?.can_review)

  const canCancelStay =
    Boolean(stay) &&
    ['pending', 'confirmed'].includes(normalizeBookingStatus(stay!.status)) &&
    !cancelStayMut.isPending

  const canPayStay =
    Boolean(stay) &&
    normalizeBookingStatus(stay!.status) === 'confirmed' &&
    !stay!.mock_payment_ref?.trim() &&
    Boolean(stay!.total_price) &&
    !payStayMut.isPending

  const canPayVehicle =
    Boolean(vehicle) &&
    normalizeBookingStatus(vehicle!.status) === 'pending' &&
    !payVehicleMut.isPending

  const canCancelVehicle =
    Boolean(vehicle) &&
    ['pending', 'confirmed'].includes(normalizeBookingStatus(vehicle!.status)) &&
    !cancelVehicleMut.isPending

  const canPayBus =
    Boolean(busGroup) &&
    normalizeBookingStatus(busGroup!.status) === 'pending' &&
    !payBusMut.isPending

  const canCancelBus =
    Boolean(busGroup) &&
    ['pending', 'confirmed'].includes(normalizeBookingStatus(busGroup!.status)) &&
    !cancelBusMut.isPending

  const canCancelFood =
    Boolean(food) &&
    ['pending', 'confirmed'].includes(normalizeBookingStatus(food!.status)) &&
    !cancelFoodMut.isPending

  const canPayGuide =
    Boolean(guide) &&
    normalizeBookingStatus(guide!.status) === 'pending' &&
    !guide!.mock_payment_ref?.trim() &&
    Boolean(guide!.total_price) &&
    !payGuideMut.isPending

  const canCancelGuide =
    Boolean(guide) &&
    ['pending', 'confirmed'].includes(normalizeBookingStatus(guide!.status)) &&
    !cancelGuideMut.isPending

  const canReviewGuide =
    Boolean(guide) &&
    normalizeBookingStatus(guide!.status) === 'completed' &&
    Boolean(guide!.can_review) &&
    !guide!.has_reviewed

  const ServiceIcon = stay ? Building2 : vehicle ? Car : busGroup ? Bus : food ? Utensils : Compass
  const providerUsername =
    stay?.listing_owner_username ??
    vehicle?.listing_owner_username ??
    busGroup?.operator_owner_username ??
    food?.owner_username ??
    guide?.guide_username
  const listingHref = stay
    ? `/accommodation/${stay.listing}`
    : vehicle
      ? `/transport/vehicle/${vehicle.listing}`
      : busGroup
        ? `/transport/bus/trips/${busGroup.trip}`
        : food
          ? `/food/${food.venue}`
          : guide
            ? `/guides/${guide.guide}`
            : null
  const listingLabel = stay
    ? 'View stay listing'
    : vehicle
      ? 'View vehicle'
      : busGroup
        ? 'View bus trip'
        : food
          ? 'View venue'
          : guide
            ? 'View guide profile'
            : null
  const messageLabel = stay
    ? 'Message host'
    : food
      ? 'Message venue'
      : guide
        ? 'Message guide'
        : vehicle || busGroup
          ? 'Message provider'
          : 'Contact provider'
  const messagePlace = stay
    ? { type: 'booking_stay' as const, id: stay.id, label: stay.listing_title }
    : vehicle
      ? { type: 'booking_vehicle' as const, id: vehicle.id, label: vehicle.listing_title }
      : busGroup
        ? {
            type: 'booking_bus' as const,
            id: busGroup.reservation_ids[0],
            label: busGroup.route_label,
          }
        : food
          ? { type: 'booking_food' as const, id: food.id, label: food.venue_name }
          : guide
            ? { type: 'booking_guide' as const, id: guide.id, label: guide.guide_headline }
            : null
  const hasPrimaryPay = canPayStay || canPayVehicle || canPayBus || canPayGuide

  return (
    <div className="bk-detail-page">
      <header className="bk-detail-page__bar">
        <button type="button" className="bk-detail-page__back" onClick={() => goBack(navigate)} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <span className="bk-detail-page__bar-title">Booking</span>
      </header>

      <div className="bk-detail-page__wrap">
        {isLoading ? (
          <div className="bk-detail-page__loading">
            <div className="skeleton bk-detail-page__sk-head" />
            <div className="skeleton bk-detail-page__sk-card" />
            <div className="skeleton bk-detail-page__sk-card" />
          </div>
        ) : null}

        {notFound ? (
          <section className="bk-detail-card bk-detail-card--empty">
            <h1 className="bk-detail-card__title">Booking not found</h1>
            <p className="bk-detail-card__text">This booking may have been removed or is no longer available.</p>
            <Link to="/dashboard#bookings" className="btn btn-primary btn-sm">
              View all bookings
            </Link>
          </section>
        ) : null}

        {!isLoading && !notFound ? (
          <>
            <section className="bk-detail-hero">
              <div className="bk-detail-hero__icon" aria-hidden>
                <ServiceIcon size={22} strokeWidth={2.25} />
              </div>
              <div className="bk-detail-hero__copy">
                <BookingStatusBadge status={status} className="bk-detail-hero__badge" />
                <h1 className="bk-detail-hero__title">{title}</h1>
                <p className="bk-detail-hero__sub">{subtitle}</p>
                {nextStep ? <p className="bk-detail-hero__hint">{nextStep}</p> : null}
              </div>
            </section>

            <section className="bk-detail-card" aria-label="Booking progress">
              <h2 className="bk-detail-card__title">Progress</h2>
              <ol className="bk-detail-steps">
                {BOOKING_STAGES.map((label, index) => {
                  const state = stageState(index, activeStage)
                  return (
                    <li key={label} className={`bk-detail-steps__item bk-detail-steps__item--${state}`}>
                      <span className="bk-detail-steps__dot" aria-hidden />
                      <span className="bk-detail-steps__label">{label}</span>
                    </li>
                  )
                })}
              </ol>
              <p className="bk-detail-card__status">
                Current status: <strong>{bookingStatusLabel(status)}</strong>
              </p>
            </section>

            <section className="bk-detail-card" aria-label="Booking details">
              <h2 className="bk-detail-card__title">Details</h2>
              <dl className="bk-detail-rows">
                {details.map((row) => (
                  <div key={row.label} className="bk-detail-rows__row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {canReviewStay && stay ? (
              <section className="bk-detail-card" aria-label="Leave a review">
                <StayReviewForm bookingId={stay.id} listingId={stay.listing} />
              </section>
            ) : null}

            {canReviewVehicle && vehicle ? (
              <section className="bk-detail-card" aria-label="Leave a review">
                <TransportReviewForm
                  bookingId={vehicle.id}
                  listingId={vehicle.listing}
                  endpoint="vehicle"
                  title="How was the rental?"
                  subtitle="Share a quick rating to help other travellers choose a vehicle."
                />
              </section>
            ) : null}

            {canReviewBus && busGroup ? (
              <section className="bk-detail-card" aria-label="Leave a review">
                <TransportReviewForm
                  bookingId={busGroup.reservation_ids[0]}
                  listingId={busGroup.trip}
                  endpoint="bus"
                  title="How was the trip?"
                  subtitle="Share a quick rating about this route and operator."
                />
              </section>
            ) : null}

            {canReviewFood && food ? (
              <section className="bk-detail-card" aria-label="Leave a review">
                <FoodReviewForm
                  venueId={food.venue}
                  onSubmitted={() => {
                    void qc.invalidateQueries({ queryKey: ['food', food.venue, 'review-eligibility'] })
                    void qc.invalidateQueries({ queryKey: ['my-bookings', 'food'] })
                  }}
                />
              </section>
            ) : null}

            {canReviewGuide && guide ? (
              <section className="bk-detail-card" aria-label="Leave a review">
                <GuideReviewForm
                  guideId={guide.guide}
                  onSubmitted={() => {
                    void qc.invalidateQueries({ queryKey: ['my-bookings', 'guides'] })
                    void qc.invalidateQueries({ queryKey: ['guide-reviews', guide.guide] })
                  }}
                />
              </section>
            ) : null}

            <div className="bk-detail-page__actions">
              {canPayStay && stay ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block bk-detail-page__cta"
                  disabled={payStayMut.isPending}
                  onClick={() => payStayMut.mutate()}
                >
                  {payStayMut.isPending ? 'Processing…' : `Pay N$${stay.total_price} (mock)`}
                </button>
              ) : null}

              {canPayVehicle && vehicle ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block bk-detail-page__cta"
                  disabled={payVehicleMut.isPending}
                  onClick={() => payVehicleMut.mutate()}
                >
                  {payVehicleMut.isPending ? 'Processing…' : `Complete demo step · N$${vehicle.total_price}`}
                </button>
              ) : null}

              {canPayBus && busGroup ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block bk-detail-page__cta"
                  disabled={payBusMut.isPending}
                  onClick={() => payBusMut.mutate(busGroup.reservation_ids)}
                >
                  {payBusMut.isPending ? 'Processing…' : `Complete demo step · ${busGroup.total_price}`}
                </button>
              ) : null}

              {canPayGuide && guide ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block bk-detail-page__cta"
                  disabled={payGuideMut.isPending}
                  onClick={() => payGuideMut.mutate()}
                >
                  {payGuideMut.isPending
                    ? 'Processing…'
                    : `Complete demo payment · N$${guide.total_price}`}
                </button>
              ) : null}

              {providerUsername ? (
                <MessageProviderLink
                  username={providerUsername}
                  label={messageLabel}
                  role={stay ? 'host' : guide ? 'guide' : 'provider'}
                  variant={hasPrimaryPay ? 'ghost' : 'primary'}
                  size="block"
                  place={messagePlace}
                />
              ) : (
                <Link to="/messages" className="btn btn-primary btn-block bk-detail-page__cta">
                  <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
                  Contact provider
                </Link>
              )}

              {listingHref && listingLabel ? (
                <Link to={listingHref} className="btn btn-ghost btn-block">
                  {listingLabel}
                </Link>
              ) : null}

              {canCancelStay ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={cancelStayMut.isPending}
                  onClick={() => cancelStayMut.mutate()}
                >
                  {cancelStayMut.isPending ? 'Cancelling…' : 'Cancel booking'}
                </button>
              ) : null}

              {canCancelVehicle ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={cancelVehicleMut.isPending}
                  onClick={() => cancelVehicleMut.mutate()}
                >
                  {cancelVehicleMut.isPending ? 'Cancelling…' : 'Cancel rental'}
                </button>
              ) : null}

              {canCancelBus && busGroup ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={cancelBusMut.isPending}
                  onClick={() => cancelBusMut.mutate(busGroup.reservation_ids)}
                >
                  {cancelBusMut.isPending ? 'Cancelling…' : 'Cancel seats'}
                </button>
              ) : null}

              {canCancelFood ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={cancelFoodMut.isPending}
                  onClick={() => cancelFoodMut.mutate()}
                >
                  {cancelFoodMut.isPending ? 'Cancelling…' : 'Cancel reservation'}
                </button>
              ) : null}

              {canCancelGuide ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={cancelGuideMut.isPending}
                  onClick={() => cancelGuideMut.mutate()}
                >
                  {cancelGuideMut.isPending ? 'Cancelling…' : 'Cancel booking'}
                </button>
              ) : null}

              <Link to="/dashboard#bookings" className="btn btn-ghost btn-block">
                <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
                All bookings
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
