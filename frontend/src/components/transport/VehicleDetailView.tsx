import { useMemo } from 'react'
import {
  BadgeDollarSign,
  Car,
  Fuel,
  Gauge,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react'
import { DetailLayout } from '../detail'
import {
  ListingAmenities,
  ListingAskSection,
  ListingBookBar,
  ListingDelversMoments,
  ListingDetails,
  ListingHeroGallery,
  ListingHighlights,
  ListingIdentityHeader,
  ListingLocationCard,
  ListingQuickInfo,
  ListingRules,
} from '../listing'
import type { ListingQuestionItem } from '../listing/ListingQuestionThread'
import { VenueStoriesSection } from '../food/stories'
import { VehicleBookingStatus, VehicleReserveCard } from '../booking/transport/VehicleReserveCard'
import { VehicleProviderCard } from './TransportProviderCard'
import { buildVehicleStoryChannels } from './transportStoriesUtils'
import {
  buildVehicleDetailRows,
  buildVehicleGalleryImages,
  buildVehicleHighlights,
  buildVehicleMoments,
  buildVehicleTrustHighlights,
  DEFAULT_RENTAL_RULES,
  openStreetMapSearchUrl,
  vehicleLocationLine,
  vehicleProviderName,
  vehicleSummaryLine,
  vehicleTypeMeta,
  type VehicleListing,
} from '../../utils/transportListing'

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
}

type Props = {
  vehicle: VehicleListing
  vehicleId: string
  saved: boolean
  onSave: () => void
  onShare: () => void
  initialQuestions?: ListingQuestionItem[]
  booking: BookingProps
}

export function VehicleDetailView({
  vehicle,
  vehicleId,
  saved,
  onSave,
  onShare,
  initialQuestions,
  booking,
}: Props) {
  const typeMeta = vehicleTypeMeta(vehicle.vehicle_type)
  const TypeIcon = typeMeta.Icon
  const locationLine = vehicleLocationLine(vehicle)
  const providerName = vehicleProviderName(vehicle)
  const providerProfileHref = vehicle.owner_username ? `/u/${encodeURIComponent(vehicle.owner_username)}` : null
  const vehiclePath = `/transport/vehicle/${vehicleId}`
  const detailBackTo = vehiclePath
  const galleryImages = buildVehicleGalleryImages(vehicle)
  const highlightLabels = buildVehicleHighlights(vehicle)
  const trustHighlights = buildVehicleTrustHighlights(vehicle)
  const detailRows = buildVehicleDetailRows(vehicle)
  const delversMoments = buildVehicleMoments(vehicle, galleryImages)
  const mapHref = openStreetMapSearchUrl(
    vehicle.pickup_location || vehicle.city || '',
    vehicle.region,
  )

  const storyChannels = useMemo(
    () => buildVehicleStoryChannels(vehicle, { vehicleId, vehiclePath }),
    [vehicle, vehicleId, vehiclePath],
  )

  const highlightItems = highlightLabels.map((label) => ({
    id: label,
    label,
    icon: <Star size={16} strokeWidth={2.25} aria-hidden />,
  }))

  const amenityItems = (vehicle.included_features ?? []).map((label) => ({
    id: label,
    label,
    icon: <ShieldCheck size={14} strokeWidth={2.25} aria-hidden />,
  }))

  const detailRowsWithIcons = detailRows.map((row) => {
    if (row.id === 'rate') return { ...row, icon: <BadgeDollarSign size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'pickup' || row.id === 'return') return { ...row, icon: <MapPin size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'seats') return { ...row, icon: <Users size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'transmission') return { ...row, icon: <Gauge size={14} strokeWidth={2.25} aria-hidden /> }
    if (row.id === 'fuel') return { ...row, icon: <Fuel size={14} strokeWidth={2.25} aria-hidden /> }
    return row
  })

  const tagline = [
    vehicleSummaryLine(vehicle),
    providerName ? `Listed by ${providerName}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const canBook = !booking.booking || booking.booking.status === 'pending'

  const bookAction = (
    <button
      type="button"
      className="btn btn-primary"
      onClick={booking.onReserve}
      disabled={booking.isPending}
    >
      <Car size={16} strokeWidth={2.25} aria-hidden />
      {booking.isPending ? 'Sending…' : 'Request vehicle'}
    </button>
  )

  return (
    <>
      <ListingHeroGallery
        className="tp-detail__gallery-wrap acc-detail__gallery-wrap"
        images={galleryImages}
        listingType="transport"
        listingId={vehicleId}
        backTo="/transport"
        backLabel="Transport"
        saved={saved}
        onSave={onSave}
        onShare={onShare}
      />

      <ListingIdentityHeader
        name={vehicle.title}
        tagline={tagline}
        categoryLabel={typeMeta.label}
        locationLabel={locationLine || null}
        saved={saved}
        onSave={onSave}
        onShare={onShare}
        actions={[
          providerProfileHref
            ? {
                id: 'contact-provider',
                label: 'Contact provider',
                icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
                href: providerProfileHref,
                accent: true,
              }
            : {
                id: 'contact-provider',
                label: 'Contact provider',
                icon: <MessageCircle size={14} strokeWidth={2.25} aria-hidden />,
                href: '/messages',
                accent: true,
              },
        ]}
        className="tp-detail__identity acc-detail__identity"
      />

      <ListingQuickInfo
        chips={[
          {
            id: 'type',
            label: typeMeta.label,
            icon: <TypeIcon size={15} strokeWidth={2.25} aria-hidden />,
          },
          {
            id: 'price',
            label: `N$${vehicle.price_per_day} / day`,
            accent: true,
            icon: <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />,
          },
          ...(vehicle.seats != null
            ? [{ id: 'seats', label: `${vehicle.seats} seats`, icon: <Users size={15} strokeWidth={2.25} aria-hidden /> }]
            : []),
          ...(vehicle.transmission
            ? [{ id: 'trans', label: vehicle.transmission, icon: <Gauge size={15} strokeWidth={2.25} aria-hidden /> }]
            : []),
        ]}
        highlights={trustHighlights}
        className="tp-detail__quick-info acc-detail__quick-info"
      />

      <VenueStoriesSection
        listingName={vehicle.title}
        explorePath={vehiclePath}
        channels={storyChannels}
        title="On the road"
        subtitle="Vehicle highlights, features & gallery — tap to watch"
        ctaLabel="View vehicle"
        className="tp-detail__stories acc-detail__section"
      />

      <DetailLayout
        main={
          <>
            {highlightItems.length > 0 ? (
              <ListingHighlights
                title="Best for"
                items={highlightItems}
                className="tp-detail__highlights acc-detail__love"
              />
            ) : null}

            <ListingDetails
              title="About this vehicle"
              description={vehicle.description?.trim() || null}
              rows={detailRowsWithIcons}
              className="tp-detail__about acc-detail__about"
            />

            {amenityItems.length > 0 ? (
              <ListingAmenities
                title="Included features"
                items={amenityItems}
                className="tp-detail__amenities acc-detail__amenities-block"
              />
            ) : null}

            <ListingLocationCard
              title="Pickup location"
              address={
                vehicle.pickup_location ||
                (vehicle.city ? `Pickup in ${vehicle.city} — exact address shared after your request.` : locationLine) ||
                'Pickup details shared by the provider after your request.'
              }
              mapUrl={mapHref}
              viewMapLabel="Get directions"
              className="tp-detail__map-card acc-detail__map-card"
            />

            <ListingRules
              rules={DEFAULT_RENTAL_RULES}
              title="Rental rules"
              className="tp-detail__rules acc-detail__rules"
            />

            {(vehicle.owner_username || vehicle.owner_display_name) && (
              <VehicleProviderCard
                displayName={providerName}
                username={vehicle.owner_username}
                bio={vehicle.owner_bio}
                city={vehicle.owner_city}
                region={vehicle.owner_region}
                avatar={vehicle.owner_avatar}
                className="acc-detail__section"
              />
            )}

            <ListingDelversMoments
              listingType="transport"
              listingId={vehicleId}
              title="Delvers moments with this ride"
              moments={delversMoments}
              className="tp-detail__moments acc-detail__moments"
              showWhenEmpty
              emptyMessage="Photos and tips will appear after travellers rent this vehicle."
            />

            <ListingAskSection
              className="tp-detail__comments acc-detail__comments"
              title="Rental tips and questions"
              placeholder="Ask about pickup location, insurance, fuel policy, or gravel roads…"
              initialQuestions={initialQuestions}
            />

            {booking.booking ? (
              <VehicleBookingStatus
                booking={booking.booking}
                onPay={booking.onPay}
                isPayPending={booking.isPayPending}
              />
            ) : null}
          </>
        }
        sidebar={
          canBook ? (
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
            />
          ) : null
        }
      />

      {canBook ? (
        <ListingBookBar
          title={`N$${vehicle.price_per_day}/day`}
          subtitle={[locationLine, providerName].filter(Boolean).join(' · ') || vehicle.title}
          action={bookAction}
          className="tp-detail__mobile-bar acc-detail__mobile-bar"
        />
      ) : null}
    </>
  )
}

export type { Booking as VehicleBooking }
