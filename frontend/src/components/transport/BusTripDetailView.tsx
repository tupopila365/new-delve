import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  Bus,
  CalendarDays,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Route,
  Star,
  Users,
} from 'lucide-react'
import { DetailLayout } from '../detail'
import { normalizeReviews } from '../GuestReviewCard'
import { apiFetch } from '../../api/client'
import {
  ListingAmenities,
  ListingQuestionsSection,
  ListingBookBar,
  ListingDelversMoments,
  ListingDetails,
  ListingHeroGallery,
  ListingHighlights,
  ListingIdentityHeader,
  ListingLocationCard,
  ListingQuickInfo,
  ListingReviews,
} from '../listing'
import { VenueStoriesSection } from '../food/stories'
import {
  BusTripBookingStatus,
  BusTripReserveCard,
  type GroupReserveResponse,
} from '../booking/transport/BusTripReserveCard'
import { BusRouteTimeline } from './BusRouteTimeline'
import { BusSeatMap } from './BusSeatMap'
import { BusOperatorCard } from './TransportProviderCard'
import { buildBusStoryChannels } from './transportStoriesUtils'
import {
  buildBusDetailRows,
  buildBusGalleryImages,
  buildBusTrustHighlights,
  busRouteTitle,
  DEFAULT_BUS_TRAVEL_TIPS,
  formatTripWhen,
  openStreetMapSearchUrl,
  routeTimelineStops,
  tripDurationLabel,
  type BusTripListing,
} from '../../utils/transportListing'

type SeatProps = {
  passengers: number
  firstSeat: number | null
  blockSeats: number[]
  blockValid: boolean
  taken: Set<number>
  onSelectSeat: (seat: number | null) => void
}

type BookingProps = {
  passengers: number
  seatPref: string
  onPassengersChange: (n: number) => void
  onSeatPrefChange: (v: string) => void
  onBook: () => void
  isPending: boolean
  err: string | null
  onDismissErr: () => void
  profile: { email_verified: boolean } | null
  group: GroupReserveResponse | null
  totalPrice: string | null
  onPay: () => void
  isPayPending: boolean
  seats: SeatProps
}

type Props = {
  trip: BusTripListing
  tripId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  canAnswer?: boolean
  booking: BookingProps
}

export function BusTripDetailView({
  trip,
  tripId,
  saved,
  onSave,
  onShare,
  canAnswer = false,
  booking,
}: Props) {
  const routeTitle = busRouteTitle(trip)
  const tripPath = `/transport/bus/${tripId}`
  const detailBackTo = tripPath
  const dep = formatTripWhen(trip.departs_at)
  const arr = trip.arrives_at ? formatTripWhen(trip.arrives_at) : null
  const duration = tripDurationLabel(trip, trip.departs_at, trip.arrives_at)
  const operatorName = trip.route_detail.operator_name
  const galleryImages = buildBusGalleryImages(trip)
  const trustHighlights = buildBusTrustHighlights(trip)
  const detailRows = buildBusDetailRows(trip)
  const timeline = routeTimelineStops(trip, dep.time, arr?.time ?? null)

  const storyChannels = useMemo(
    () => buildBusStoryChannels(trip, { tripId, tripPath }),
    [trip, tripId, tripPath],
  )

  const { data: reviewPayload } = useQuery({
    queryKey: ['bus-trip-reviews', tripId],
    queryFn: () =>
      apiFetch<{ reviews: unknown[]; rating_avg: string | null; rating_count: number }>(
        `/api/transport/bus/trips/${tripId}/reviews/`,
        { auth: false },
      ),
  })
  const reviews = normalizeReviews(reviewPayload?.reviews ?? [])

  const tipItems = DEFAULT_BUS_TRAVEL_TIPS.map((label) => ({
    id: label,
    label,
    icon: <Star size={16} strokeWidth={2.25} aria-hidden />,
  }))

  const amenityItems = (trip.amenities ?? []).map((label) => ({
    id: label,
    label,
    icon: <CheckCircle size={14} strokeWidth={2.25} aria-hidden />,
  }))

  const detailRowsWithIcons = detailRows.map((row) => {
    if (row.id === 'origin' || row.id === 'destination') return { ...row, icon: <MapPin size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'departure') return { ...row, icon: <CalendarDays size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'arrival') return { ...row, icon: <Clock size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'duration' || row.id === 'distance') return { ...row, icon: <Route size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'fare') return { ...row, icon: <BadgeDollarSign size={14} strokeWidth={2.25} aria-hidden /> }
    return row
  })

  const summaryLine = [
    `Departs ${dep.date} at ${dep.time}`,
    arr ? `Arrives ${arr.time}` : null,
    duration || null,
  ]
    .filter(Boolean)
    .join(' · ')

  const firstRes = booking.group?.reservations[0]
  const canBook = !firstRes || firstRes.status === 'pending'
  const payLabel = booking.group
    ? `N$${Number(booking.group.total_price).toFixed(0)}`
    : booking.totalPrice
      ? `N$${booking.totalPrice}`
      : `N$${trip.price}`

  const bookAction = (
    <button type="button" className="btn btn-primary" onClick={booking.onBook} disabled={booking.isPending}>
      <Bus size={16} strokeWidth={2.25} aria-hidden />
      {booking.isPending ? 'Sending…' : 'Request seat'}
    </button>
  )

  return (
    <>
      <ListingHeroGallery
        className="tp-detail__gallery-wrap acc-detail__gallery-wrap"
        images={galleryImages}
        listingType="transport"
        listingId={tripId}
        backTo="/transport"
        backLabel="Transport"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={routeTitle}
        tagline={summaryLine}
        categoryLabel="Bus trip"
        locationLabel={`${operatorName} · N$${trip.price}`}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        reportTarget={{
          target_type: 'listing',
          target_id: `bus-trip:${tripId}`,
          target_label: routeTitle,
        }}
        actions={[
          {
            id: 'contact-operator',
            label: 'Contact operator',
            icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
            href: '/messages',
            accent: true,
          },
        ]}
        className="tp-detail__identity acc-detail__identity"
      />

      <ListingQuickInfo
        chips={[
          { id: 'route', label: routeTitle, icon: <Route size={15} strokeWidth={2.25} aria-hidden /> },
          { id: 'departure', label: dep.date, icon: <CalendarDays size={15} strokeWidth={2.25} aria-hidden /> },
          {
            id: 'price',
            label: `N$${trip.price} / passenger`,
            accent: true,
            icon: <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />,
          },
          {
            id: 'seats',
            label: `${trip.available_seats} seats available`,
            icon: <Users size={15} strokeWidth={2.25} aria-hidden />,
          },
        ]}
        highlights={trustHighlights}
        className="tp-detail__quick-info acc-detail__quick-info"
      />

      <VenueStoriesSection
        listingName={routeTitle}
        explorePath={tripPath}
        channels={storyChannels}
        title="Along the route"
        subtitle="Trip highlights, amenities & views — tap to watch"
        ctaLabel="View trip"
        className="tp-detail__stories acc-detail__section"
      />

      <DetailLayout
        main={
          <>
            <BusRouteTimeline stops={timeline} className="acc-detail__section" />

            <ListingDetails
              title="Trip details"
              rows={detailRowsWithIcons}
              className="tp-detail__about acc-detail__about"
            />

            <ListingLocationCard
              title="Boarding point"
              address={trip.route_detail.origin}
              mapUrl={openStreetMapSearchUrl(trip.route_detail.origin) || null}
              approximateHint="Route stop name — confirm the boarding point with the operator."
              viewMapLabel="Open in maps"
              className="tp-detail__map-card acc-detail__map-card"
            />

            <ListingLocationCard
              title="Drop-off point"
              address={trip.route_detail.destination}
              mapUrl={openStreetMapSearchUrl(trip.route_detail.destination) || null}
              approximateHint="Route stop name — confirm the drop-off with the operator."
              viewMapLabel="Open in maps"
              className="tp-detail__map-card acc-detail__map-card"
            />

            {amenityItems.length > 0 ? (
              <ListingAmenities
                title="Onboard amenities"
                items={amenityItems}
                className="tp-detail__amenities acc-detail__amenities-block"
              />
            ) : null}

            <ListingHighlights
              title="Travel tips"
              items={tipItems}
              className="tp-detail__highlights acc-detail__love"
            />

            <BusOperatorCard operatorName={operatorName} className="acc-detail__section" />

            <ListingDelversMoments
              listingType="bus_trip"
              listingId={tripId}
              listingTitle={`${trip.route_detail.origin} → ${trip.route_detail.destination}`}
              title="Delvers moments on this route"
              className="tp-detail__moments acc-detail__moments"
              showWhenEmpty
              emptyMessage="Photos and tips will appear after travellers complete this route."
            />

            <ListingReviews
              listingType="transport"
              listingId={tripId}
              reviews={reviews}
              rating={reviewPayload?.rating_avg}
              count={reviewPayload?.rating_count}
              emptyMessage="Reviews will appear here after passengers share feedback."
              className="tp-detail__reviews acc-detail__reviews"
            />

            <ListingQuestionsSection
              className="tp-detail__comments acc-detail__comments"
              title="Route tips and questions"
              placeholder="Ask about boarding point, stops, pickup time, or seat availability…"
              questionsPath={`/api/transport/bus/trips/${tripId}/questions/`}
              answerPath={(questionId) => `/api/transport/bus/questions/${questionId}/answers/`}
              queryKey={['bus-trip-questions', tripId]}
              canAnswer={canAnswer}
              officialLabel="Operator"
            />

            {!firstRes && (
              <BusSeatMap
                totalSeats={trip.total_seats}
                taken={booking.seats.taken}
                passengers={booking.seats.passengers}
                firstSeat={booking.seats.firstSeat}
                blockSeats={booking.seats.blockSeats}
                blockValid={booking.seats.blockValid}
                onSelectSeat={booking.seats.onSelectSeat}
                className="acc-detail__section"
              />
            )}

            {booking.group ? (
              <BusTripBookingStatus
                group={booking.group}
                routeTitle={routeTitle}
                payLabel={payLabel}
                onPay={booking.onPay}
                isPayPending={booking.isPayPending}
              />
            ) : null}
          </>
        }
        sidebar={
          canBook ? (
            <BusTripReserveCard
              trip={trip}
              passengers={booking.passengers}
              seatPref={booking.seatPref}
              onPassengersChange={booking.onPassengersChange}
              onSeatPrefChange={booking.onSeatPrefChange}
              onBook={booking.onBook}
              isPending={booking.isPending}
              err={booking.err}
              onDismissErr={booking.onDismissErr}
              profile={booking.profile}
              group={booking.group}
              totalPrice={booking.totalPrice}
              seats={{
                totalSeats: trip.total_seats,
                taken: booking.seats.taken,
                firstSeat: booking.seats.firstSeat,
                blockSeats: booking.seats.blockSeats,
                blockValid: booking.seats.blockValid,
                onSelectSeat: booking.seats.onSelectSeat,
              }}
            />
          ) : null
        }
      />

      {canBook ? (
        <ListingBookBar
          title={`N$${trip.price}/passenger`}
          subtitle={`${dep.time} · ${trip.available_seats} seats available`}
          action={bookAction}
          className="tp-detail__mobile-bar acc-detail__mobile-bar"
        />
      ) : null}
    </>
  )
}
