import type { VenueStoryChannel, VenueStorySlide } from '../food/stories/types'
import {
  buildBusGalleryImages,
  buildVehicleGalleryImages,
  busRouteTitle,
  collectVehiclePhotoSources,
  formatTripWhen,
  tripDurationLabel,
  type BusTripListing,
  type VehicleListing,
  vehicleLocationLine,
  vehicleProviderName,
  vehicleSummaryLine,
} from '../../utils/transportListing'

function shortLabel(title: string, max = 16): string {
  const t = title.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function buildVehicleStoryChannels(
  vehicle: VehicleListing,
  options: { vehicleId: string; vehiclePath?: string },
): VenueStoryChannel[] {
  const vehiclePath = options.vehiclePath ?? `/transport/vehicle/${options.vehicleId}`
  const gallery = buildVehicleGalleryImages(vehicle)
  const cover = gallery[0]?.src ?? ''
  const name = vehicleProviderName(vehicle)
  const region = vehicleLocationLine(vehicle)
  const channels: VenueStoryChannel[] = []

  const introSlides: VenueStorySlide[] = []
  if (cover) {
    introSlides.push({
      id: `${vehicle.id}-intro`,
      kind: 'image',
      src: cover,
      headline: vehicle.title,
      sub: vehicle.description?.trim() || vehicleSummaryLine(vehicle),
      ctaPath: vehiclePath,
      ctaLabel: 'View vehicle',
    })
    introSlides.push({
      id: `${vehicle.id}-rate`,
      kind: 'image',
      src: cover,
      headline: `N$${vehicle.price_per_day} / day`,
      sub: [region, name].filter(Boolean).join(' · '),
      ctaPath: vehiclePath,
      ctaLabel: 'Request vehicle',
    })
  }
  if (introSlides.length > 0) {
    channels.push({
      id: 'the-vehicle',
      label: 'The vehicle',
      coverSrc: cover,
      slides: introSlides,
    })
  }

  const featureSlides: VenueStorySlide[] = (vehicle.included_features ?? []).slice(0, 6).map((feature, i) => ({
    id: `feature-${i}`,
    kind: 'image' as const,
    src: gallery[i % Math.max(gallery.length, 1)]?.src || cover,
    headline: feature,
    sub: vehicle.title,
    ctaPath: vehiclePath,
    ctaLabel: 'View vehicle',
  }))
  if (featureSlides.length > 0) {
    channels.push({
      id: 'features',
      label: 'Features',
      coverSrc: featureSlides[0].src,
      slides: featureSlides,
    })
  }

  const photoSources = collectVehiclePhotoSources(vehicle)
  if (photoSources.length > 1) {
    const slides: VenueStorySlide[] = gallery.slice(1, 7).map((item, i) => ({
      id: `gallery-${i}`,
      kind: 'image',
      src: item.src,
      headline: vehicle.title,
      sub: item.caption || region,
      ctaPath: vehiclePath,
      ctaLabel: 'View vehicle',
    }))
    if (slides.length > 0) {
      channels.push({
        id: 'gallery',
        label: 'Gallery',
        coverSrc: slides[0].src,
        slides,
      })
    }
  }

  return channels
}

export function buildBusStoryChannels(
  trip: BusTripListing,
  options: { tripId: string; tripPath?: string },
): VenueStoryChannel[] {
  const tripPath = options.tripPath ?? `/transport/bus/${options.tripId}`
  const gallery = buildBusGalleryImages(trip)
  const cover = gallery[0]?.src ?? ''
  const routeTitle = busRouteTitle(trip)
  const dep = formatTripWhen(trip.departs_at)
  const duration = tripDurationLabel(trip, trip.departs_at, trip.arrives_at)
  const channels: VenueStoryChannel[] = []

  const introSlides: VenueStorySlide[] = []
  if (cover) {
    introSlides.push({
      id: `${trip.id}-route`,
      kind: 'image',
      src: cover,
      headline: routeTitle,
      sub: `${dep.date} · ${dep.time}${duration ? ` · ${duration}` : ''}`,
      ctaPath: tripPath,
      ctaLabel: 'View trip',
    })
    introSlides.push({
      id: `${trip.id}-fare`,
      kind: 'image',
      src: cover,
      headline: `N$${trip.price} per passenger`,
      sub: `${trip.available_seats} seats available · ${trip.route_detail.operator_name}`,
      ctaPath: tripPath,
      ctaLabel: 'Request seat',
    })
  }
  if (introSlides.length > 0) {
    channels.push({
      id: 'the-route',
      label: shortLabel(routeTitle, 14),
      coverSrc: cover,
      slides: introSlides,
    })
  }

  const amenitySlides: VenueStorySlide[] = (trip.amenities ?? []).slice(0, 6).map((amenity, i) => ({
    id: `amenity-${i}`,
    kind: 'image' as const,
    src: gallery[i % Math.max(gallery.length, 1)]?.src || cover,
    headline: amenity,
    sub: routeTitle,
    ctaPath: tripPath,
    ctaLabel: 'View trip',
  }))
  if (amenitySlides.length > 0) {
    channels.push({
      id: 'amenities',
      label: 'Onboard',
      coverSrc: amenitySlides[0].src,
      slides: amenitySlides,
    })
  }

  if (gallery.length > 1) {
    const slides: VenueStorySlide[] = gallery.slice(1, 7).map((item, i) => ({
      id: `gallery-${i}`,
      kind: 'image',
      src: item.src,
      headline: routeTitle,
      sub: trip.route_detail.operator_name,
      ctaPath: tripPath,
      ctaLabel: 'View trip',
    }))
    if (slides.length > 0) {
      channels.push({
        id: 'gallery',
        label: 'Along the way',
        coverSrc: slides[0].src,
        slides,
      })
    }
  }

  return channels
}
