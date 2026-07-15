import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  Bookmark,
  Bus,
  CalendarDays,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Route,
  Share2,
  Users,
} from 'lucide-react'
import { normalizeReviews } from '../GuestReviewCard'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { HighlightStoriesSection } from '../highlights/HighlightStoriesSection'
import {
  ListingDelversMoments,
  ListingQuestionsSection,
  ListingReviews,
} from '../listing'
import { ReportButton } from '../report/ReportButton'
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
  buildBusGalleryImages,
  busRouteTitle,
  DEFAULT_BUS_TRAVEL_TIPS,
  formatTripWhen,
  openStreetMapSearchUrl,
  routeTimelineStops,
  tripDurationLabel,
  type BusTripListing,
} from '../../utils/transportListing'
import '../journeys/journey-detail.css'
import './transport-detail.css'

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
  const navigate = useNavigate()
  const { profile } = useAuth()
  const routeTitle = busRouteTitle(trip)
  const tripPath = `/transport/bus/${tripId}`
  const dep = formatTripWhen(trip.departs_at)
  const arr = trip.arrives_at ? formatTripWhen(trip.arrives_at) : null
  const duration = tripDurationLabel(trip, trip.departs_at, trip.arrives_at)
  const operatorName = trip.route_detail.operator_name
  const galleryImages = buildBusGalleryImages(trip)
  const timeline = routeTimelineStops(trip, dep.time, arr?.time ?? null)
  const operatorInitial = operatorName.charAt(0).toUpperCase() || 'O'
  const boardMap = openStreetMapSearchUrl(trip.route_detail.origin)
  const dropMap = openStreetMapSearchUrl(trip.route_detail.destination)

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

  const firstRes = booking.group?.reservations[0]
  const canBook = !firstRes || firstRes.status === 'pending'
  const payLabel = booking.group
    ? `N$${Number(booking.group.total_price).toFixed(0)}`
    : booking.totalPrice
      ? `N$${booking.totalPrice}`
      : `N$${trip.price}`

  function guardEngage(action: () => void) {
    if (!profile) {
      navigate('/login')
      return
    }
    action()
  }

  const scrollToReserve = () => {
    document.getElementById('bus-reserve-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <JourneyHero
        images={galleryImages}
        backTo="/transport"
        backLabel="Transport"
        saved={saved}
        onSave={() => guardEngage(onSave)}
        onShare={onShare}
      />

      <div className="jd-head">
        <div className="jd-author">
          <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
            {operatorInitial}
          </span>
          <span className="jd-author__copy">
            <span className="jd-author__name">{operatorName}</span>
            <span className="jd-author__sub">
              {dep.date} · {dep.time}
              {duration ? ` · ~${duration}` : ''}
            </span>
          </span>
        </div>

        <div className="jd-head__actions">
          <Link to="/messages" className="jd-btn jd-btn--primary">
            <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
            <span className="jd-btn--label">Message</span>
          </Link>
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report trip"
            target={{
              target_type: 'listing',
              target_id: `bus-trip:${tripId}`,
              target_label: routeTitle,
            }}
          />
        </div>
      </div>

      <div className="jd-titleblock">
        <span className="jd-badge">Bus trip</span>
        <h1 className="jd-title">{routeTitle}</h1>
        <p className="jd-route">
          <Route size={17} strokeWidth={2.25} aria-hidden />
          {trip.route_detail.origin}
          <span aria-hidden> → </span>
          {trip.route_detail.destination}
        </p>
        <p className="jd-hook">
          <CalendarDays
            size={15}
            strokeWidth={2.25}
            aria-hidden
            style={{ display: 'inline', verticalAlign: '-0.15em', marginRight: 6 }}
          />
          {dep.date} · {dep.time}
          {arr ? ` → ${arr.time}` : ''}
        </p>
      </div>

      <div className="jd-engage" aria-label="Trip actions">
        <div className="jd-engage__primary">
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share trip">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
          {boardMap ? (
            <a
              href={boardMap}
              className="jd-engage__btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open boarding point in maps"
            >
              <Navigation size={22} strokeWidth={2.25} aria-hidden />
            </a>
          ) : null}
        </div>
        <div className="jd-engage__secondary">
          <button
            type="button"
            className={`jd-engage__btn jd-engage__btn--save${saved ? ' is-active' : ''}`}
            onClick={() => guardEngage(onSave)}
            aria-label={saved ? 'Remove saved trip' : 'Save trip'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <ul className="jd-facts">
        <li className="jd-fact">
          <Bus size={15} strokeWidth={2.25} aria-hidden />
          {operatorName}
        </li>
        <li className="jd-fact">
          <Clock size={15} strokeWidth={2.25} aria-hidden />
          {duration || dep.time}
        </li>
        <li className="jd-fact">
          <Users size={15} strokeWidth={2.25} aria-hidden />
          {trip.available_seats} seats left
        </li>
        <li className="jd-fact jd-fact--cost">
          <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
          N${trip.price}/seat
        </li>
      </ul>

      <HighlightStoriesSection
        channels={storyChannels}
        listingName={routeTitle}
        explorePath={tripPath}
        title="Along the route"
        subtitle="Tap a highlight to watch"
        ctaLabel="View trip"
        className="jd-stories"
      />

      {canBook ? (
        <div className="tp-detail__reserve-block">
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
        </div>
      ) : null}

      {booking.group ? (
        <BusTripBookingStatus
          group={booking.group}
          routeTitle={routeTitle}
          payLabel={payLabel}
          onPay={booking.onPay}
          isPayPending={booking.isPayPending}
        />
      ) : null}

      <JourneySection title="Route">
        <BusRouteTimeline stops={timeline} />
      </JourneySection>

      {!firstRes ? (
        <JourneySection title="Choose seats">
          <BusSeatMap
            totalSeats={trip.total_seats}
            taken={booking.seats.taken}
            passengers={booking.seats.passengers}
            firstSeat={booking.seats.firstSeat}
            blockSeats={booking.seats.blockSeats}
            blockValid={booking.seats.blockValid}
            onSelectSeat={booking.seats.onSelectSeat}
          />
        </JourneySection>
      ) : null}

      <JourneySection title="Boarding">
        <p className="jd-story__lead">{trip.route_detail.origin}</p>
        <p className="jd-hook" style={{ marginTop: 6 }}>
          Confirm the boarding point and check-in time with the operator.
        </p>
        {boardMap ? (
          <div className="tp-detail__venue-acts">
            <a className="jd-btn" href={boardMap} target="_blank" rel="noopener noreferrer">
              <MapPin size={14} strokeWidth={2.25} aria-hidden />
              Open boarding in maps
            </a>
          </div>
        ) : null}
      </JourneySection>

      <JourneySection title="Drop-off">
        <p className="jd-story__lead">{trip.route_detail.destination}</p>
        {dropMap ? (
          <div className="tp-detail__venue-acts">
            <a className="jd-btn" href={dropMap} target="_blank" rel="noopener noreferrer">
              <MapPin size={14} strokeWidth={2.25} aria-hidden />
              Open drop-off in maps
            </a>
          </div>
        ) : null}
      </JourneySection>

      {(trip.amenities?.length ?? 0) > 0 ? (
        <JourneySection title="On board">
          <ul className="jd-tips">
            {(trip.amenities ?? []).map((item) => (
              <li key={item} className="jd-tip">
                <CheckCircle size={14} strokeWidth={2.25} aria-hidden style={{ marginRight: 6 }} />
                {item}
              </li>
            ))}
          </ul>
        </JourneySection>
      ) : null}

      <JourneySection title="Travel tips">
        <ul className="jd-tips">
          {DEFAULT_BUS_TRAVEL_TIPS.map((tip) => (
            <li key={tip} className="jd-tip">
              {tip}
            </li>
          ))}
        </ul>
      </JourneySection>

      <BusOperatorCard operatorName={operatorName} className="tp-detail__provider" />

      <ListingDelversMoments
        listingType="bus_trip"
        listingId={tripId}
        listingTitle={`${trip.route_detail.origin} → ${trip.route_detail.destination}`}
        title="Delvers moments on this route"
        className="tp-detail__moments"
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
        className="tp-detail__reviews"
      />

      <ListingQuestionsSection
        className="tp-detail__questions"
        title="Ask the operator"
        placeholder="Boarding point, stops, luggage, or seat questions…"
        questionsPath={`/api/transport/bus/trips/${tripId}/questions/`}
        answerPath={(questionId) => `/api/transport/bus/questions/${questionId}/answers/`}
        queryKey={['bus-trip-questions', tripId]}
        canAnswer={canAnswer}
        officialLabel="Operator"
      />

      {canBook ? (
        <div className="jd-mobilebar">
          <span className="jd-mobilebar__meta">
            <span className="jd-mobilebar__title">N${trip.price}/seat</span>
            <span className="jd-mobilebar__sub">
              {dep.time} · {trip.available_seats} left
            </span>
          </span>
          <div className="jd-mobilebar__actions">
            <button
              type="button"
              className={`jd-mobilebar__icon${saved ? ' is-active' : ''}`}
              onClick={() => guardEngage(onSave)}
              aria-label={saved ? 'Unsave' : 'Save'}
            >
              <Bookmark size={18} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            </button>
            <button type="button" className="jd-mobilebar__btn" onClick={scrollToReserve}>
              Pick seats
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
