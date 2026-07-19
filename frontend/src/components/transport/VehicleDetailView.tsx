import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  Bookmark,
  Car,
  Fuel,
  Gauge,
  MapPin,
  MessageCircle,
  Navigation,
  Share2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { normalizeReviews } from '../GuestReviewCard'
import { apiFetch, mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { JourneyHero } from '../journeys/JourneyHero'
import { JourneySection } from '../journeys/JourneySection'
import { HighlightStoriesSection } from '../highlights/HighlightStoriesSection'
import { ListingDelversMoments, ListingReviews } from '../listing'
import { ReportButton } from '../report/ReportButton'
import { SellerTrustBadges } from '../marketplace/SellerTrustBadges'
import { messageProviderPath } from '../messages/messageProviderUtils'
import { VehicleBookingStatus, VehicleReserveCard } from '../booking/transport/VehicleReserveCard'
import { VehicleProviderCard } from './TransportProviderCard'
import { buildVehicleStoryChannels } from './transportStoriesUtils'
import { renterDocLabel } from '../../data/renterDocuments'
import type { RenterDocumentUpload } from '../../data/renterDocuments'
import {
  buildVehicleGalleryImages,
  openStreetMapSearchUrl,
  rentalDaysInclusive,
  vehicleHighlights,
  vehicleLocationLine,
  vehicleProviderName,
  vehicleRentalRules,
  vehicleSummaryLine,
  vehicleTypeMeta,
  type VehicleListing,
} from '../../utils/transportListing'
import '../journeys/journey-detail.css'
import './transport-detail.css'

type Booking = {
  id: number
  status: string
  total_price: string
  mock_payment_ref: string
}

type BookingProps = {
  start: string
  end: string
  pickupArea: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  onPickupAreaChange: (v: string) => void
  onReserve: () => void
  isPending: boolean
  err: string | null
  onDismissErr: () => void
  profile: { email_verified: boolean } | null
  booking: Booking | null
  onPay: () => void
  isPayPending: boolean
  renterDocuments: Record<string, RenterDocumentUpload | undefined>
  onRenterDocUpload: (docType: string, file: File) => void
  onRenterDocRemove: (docType: string) => void
}

type Props = {
  vehicle: VehicleListing
  vehicleId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  booking: BookingProps
}

export function VehicleDetailView({
  vehicle,
  vehicleId,
  saved,
  onSave,
  onShare,
  booking,
}: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const typeMeta = vehicleTypeMeta(vehicle.vehicle_type)
  const TypeIcon = typeMeta.Icon
  const locationLine = vehicleLocationLine(vehicle)
  const providerName = vehicleProviderName(vehicle)
  const providerProfileHref = vehicle.owner_username
    ? `/u/${encodeURIComponent(vehicle.owner_username)}`
    : null
  const vehiclePath = `/transport/vehicle/${vehicleId}`
  const galleryImages = buildVehicleGalleryImages(vehicle)
  const highlightLabels = vehicleHighlights(vehicle)
  const rentalRules = vehicleRentalRules(vehicle)
  const mapHref = openStreetMapSearchUrl(
    vehicle.pickup_location || vehicle.city || '',
    vehicle.region,
  )
  const requiredDocs = vehicle.required_renter_documents ?? []
  const rentalDays = rentalDaysInclusive(booking.start, booking.end)
  const dayRate = parseFloat(vehicle.price_per_day)
  const estTotal =
    rentalDays != null && Number.isFinite(dayRate) ? (dayRate * rentalDays).toFixed(0) : null

  const storyChannels = useMemo(
    () => buildVehicleStoryChannels(vehicle, { vehicleId, vehiclePath }),
    [vehicle, vehicleId, vehiclePath],
  )

  const { data: reviewPayload } = useQuery({
    queryKey: ['vehicle-reviews', vehicleId],
    queryFn: () =>
      apiFetch<{ reviews: unknown[]; rating_avg: string | null; rating_count: number }>(
        `/api/transport/vehicles/${vehicleId}/reviews/`,
        { auth: false },
      ),
  })
  const reviews = normalizeReviews(reviewPayload?.reviews ?? [])
  const ratingRaw = reviewPayload?.rating_avg ?? vehicle.rating_avg
  const ratingCount = reviewPayload?.rating_count ?? vehicle.rating_count ?? 0
  const ratingNum = ratingRaw != null && ratingRaw !== '' ? Number(ratingRaw) : null
  const ratingLabel =
    ratingNum != null && Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum.toFixed(1) : null

  const canBook = !booking.booking || booking.booking.status === 'pending'
  const providerInitial = providerName.charAt(0).toUpperCase() || 'P'
  const avatarSrc = vehicle.owner_avatar
    ? /^https?:\/\//i.test(vehicle.owner_avatar)
      ? vehicle.owner_avatar
      : mediaUrl(vehicle.owner_avatar) || vehicle.owner_avatar
    : null

  function guardEngage(action: () => void) {
    if (!profile) {
      navigate('/login')
      return
    }
    action()
  }

  const scrollToReserve = () => {
    document.getElementById('vehicle-reserve-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const transmissionLabel = vehicle.transmission
    ? /auto/i.test(vehicle.transmission)
      ? 'Automatic'
      : 'Manual'
    : null

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
        {providerProfileHref ? (
          <Link to={providerProfileHref} className="jd-author">
            {avatarSrc ? (
              <img className="jd-author__avatar" src={avatarSrc} alt="" />
            ) : (
              <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
                {providerInitial}
              </span>
            )}
            <span className="jd-author__copy">
              <span className="jd-author__name">{providerName}</span>
              <span className="jd-author__sub">
                {locationLine || 'Transport provider'}
                {ratingLabel ? ` · ★ ${ratingLabel}` : ''}
              </span>
              {vehicle.owner_username ? (
                <SellerTrustBadges username={vehicle.owner_username} compact />
              ) : null}
            </span>
          </Link>
        ) : (
          <div className="jd-author">
            <span className="jd-author__avatar jd-author__avatar--fallback" aria-hidden>
              {providerInitial}
            </span>
            <span className="jd-author__copy">
              <span className="jd-author__name">{providerName}</span>
              <span className="jd-author__sub">{locationLine || 'Transport provider'}</span>
              {vehicle.owner_username ? (
                <SellerTrustBadges username={vehicle.owner_username} compact />
              ) : null}
            </span>
          </div>
        )}

        <div className="jd-head__actions">
          {vehicle.owner_username ? (
            <Link
              to={messageProviderPath(vehicle.owner_username, {
                type: 'transport',
                id: vehicleId,
                label: vehicle.title,
              })}
              className="jd-btn jd-btn--primary"
            >
              <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
              <span className="jd-btn--label">Message</span>
            </Link>
          ) : null}
          <ReportButton
            className="jd-btn jd-btn--icon"
            iconOnly
            triggerLabel="Report vehicle"
            target={{
              target_type: 'listing',
              target_id: `vehicle:${vehicleId}`,
              target_label: vehicle.title,
            }}
          />
        </div>
      </div>

      <div className="jd-titleblock">
        <span className="jd-badge">{typeMeta.label}</span>
        <h1 className="jd-title">{vehicle.title}</h1>
        <p className="jd-route">
          <Car size={17} strokeWidth={2.25} aria-hidden />
          {vehicleSummaryLine(vehicle)}
        </p>
        {locationLine ? (
          <p className="jd-hook">
            <MapPin
              size={15}
              strokeWidth={2.25}
              aria-hidden
              style={{ display: 'inline', verticalAlign: '-0.15em', marginRight: 6 }}
            />
            {locationLine}
          </p>
        ) : null}
      </div>

      <div className="jd-engage" aria-label="Vehicle actions">
        <div className="jd-engage__primary">
          <button type="button" className="jd-engage__btn" onClick={onShare} aria-label="Share vehicle">
            <Share2 size={22} strokeWidth={2.25} aria-hidden />
          </button>
          {mapHref ? (
            <a
              href={mapHref}
              className="jd-engage__btn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open pickup in maps"
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
            aria-label={saved ? 'Remove saved vehicle' : 'Save vehicle'}
            aria-pressed={saved}
          >
            <Bookmark size={22} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </div>

      <ul className="jd-facts">
        <li className="jd-fact">
          <TypeIcon size={15} strokeWidth={2.25} aria-hidden />
          {typeMeta.label}
        </li>
        {vehicle.seats != null ? (
          <li className="jd-fact">
            <Users size={15} strokeWidth={2.25} aria-hidden />
            {vehicle.seats} seats
          </li>
        ) : null}
        {transmissionLabel ? (
          <li className="jd-fact">
            <Gauge size={15} strokeWidth={2.25} aria-hidden />
            {transmissionLabel}
          </li>
        ) : null}
        {vehicle.fuel_type ? (
          <li className="jd-fact">
            <Fuel size={15} strokeWidth={2.25} aria-hidden />
            {vehicle.fuel_type}
          </li>
        ) : null}
        <li className="jd-fact jd-fact--cost">
          <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
          N${vehicle.price_per_day}/day
        </li>
      </ul>

      <HighlightStoriesSection
        channels={storyChannels}
        listingName={vehicle.title}
        explorePath={vehiclePath}
        title="See the vehicle"
        subtitle="Tap a highlight to watch"
        ctaLabel="View vehicle"
        className="jd-stories"
      />

      {canBook ? (
        <div className="tp-detail__reserve-block">
          <VehicleReserveCard
            vehicle={vehicle}
            start={booking.start}
            end={booking.end}
            pickupArea={booking.pickupArea}
            onStartChange={booking.onStartChange}
            onEndChange={booking.onEndChange}
            onPickupAreaChange={booking.onPickupAreaChange}
            onReserve={booking.onReserve}
            isPending={booking.isPending}
            err={booking.err}
            onDismissErr={booking.onDismissErr}
            profile={booking.profile}
            booking={booking.booking}
            renterDocuments={booking.renterDocuments}
            onRenterDocUpload={booking.onRenterDocUpload}
            onRenterDocRemove={booking.onRenterDocRemove}
          />
        </div>
      ) : null}

      {booking.booking ? (
        <VehicleBookingStatus
          booking={booking.booking}
          onPay={booking.onPay}
          isPayPending={booking.isPayPending}
        />
      ) : null}

      {(vehicle.description?.trim() || highlightLabels.length > 0) && (
        <JourneySection title="About this vehicle">
          {vehicle.description?.trim() ? (
            <p className="jd-story__lead">{vehicle.description.trim()}</p>
          ) : null}
          {highlightLabels.length > 0 ? (
            <ul className="jd-tips">
              {highlightLabels.map((tip) => (
                <li key={tip} className="jd-tip">
                  {tip}
                </li>
              ))}
            </ul>
          ) : null}
        </JourneySection>
      )}

      {(vehicle.included_features?.length ?? 0) > 0 ? (
        <JourneySection title="What's included">
          <ul className="jd-tips">
            {(vehicle.included_features ?? []).map((item) => (
              <li key={item} className="jd-tip">
                <ShieldCheck size={14} strokeWidth={2.25} aria-hidden style={{ marginRight: 6 }} />
                {item}
              </li>
            ))}
          </ul>
        </JourneySection>
      ) : null}

      <JourneySection title="Pickup & return">
        <p className="jd-story__lead">
          {vehicle.pickup_location?.trim() || locationLine || 'Confirm with the provider after your request.'}
        </p>
        <p className="jd-hook" style={{ marginTop: 8 }}>
          Same location for return unless you arrange otherwise.
        </p>
        {mapHref ? (
          <div className="tp-detail__venue-acts">
            <a className="jd-btn" href={mapHref} target="_blank" rel="noopener noreferrer">
              <Navigation size={14} strokeWidth={2.25} aria-hidden />
              Open in maps
            </a>
          </div>
        ) : null}
      </JourneySection>

      {requiredDocs.length > 0 ? (
        <JourneySection title="Documents you'll need">
          <ul className="jd-tips">
            {requiredDocs.map((id) => (
              <li key={id} className="jd-tip">
                {renterDocLabel(id)}
              </li>
            ))}
          </ul>
        </JourneySection>
      ) : null}

      {rentalRules.length > 0 ? (
        <JourneySection title="Rental rules">
          <ul className="jd-tips">
            {rentalRules.map((rule) => (
              <li key={rule} className="jd-tip">
                {rule}
              </li>
            ))}
          </ul>
        </JourneySection>
      ) : null}

      {(vehicle.owner_username || vehicle.owner_display_name) && (
        <VehicleProviderCard
          displayName={providerName}
          username={vehicle.owner_username}
          bio={vehicle.owner_bio}
          city={vehicle.owner_city}
          region={vehicle.owner_region}
          avatar={vehicle.owner_avatar}
          className="tp-detail__provider"
        />
      )}

      <ListingDelversMoments
        listingType="vehicle"
        listingId={vehicleId}
        listingTitle={vehicle.title}
        title="Delvers moments with this ride"
        className="tp-detail__moments"
        showWhenEmpty
        emptyMessage="Photos and tips will appear after travellers rent this vehicle."
      />

      <ListingReviews
        listingType="transport"
        listingId={vehicleId}
        reviews={reviews}
        rating={ratingRaw}
        count={ratingCount}
        emptyMessage="Reviews will appear here after renters share feedback."
        className="tp-detail__reviews"
      />

      {canBook ? (
        <div className="jd-mobilebar">
          <span className="jd-mobilebar__meta">
            <span className="jd-mobilebar__title">
              {estTotal ? `Est. N$${estTotal}` : `N$${vehicle.price_per_day}/day`}
            </span>
            <span className="jd-mobilebar__sub">
              {estTotal
                ? `${rentalDays} day${rentalDays === 1 ? '' : 's'}`
                : locationLine || vehicle.title}
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
              Check dates
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export type { Booking as VehicleBooking }
