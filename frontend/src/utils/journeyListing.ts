import type { ListingGalleryItem, ListingMomentItem } from '../components/listing/types'
import type { MockTrip } from '../data/mockTrips'
import {
  buildJourneyGalleryImages,
  countryLabel,
  fmtJourneyDate,
  formatJourneyCost,
  journeyHook,
  partyLabel,
  routeLabel,
  transportLabel,
} from './journeyDisplay'

export function collectJourneyPhotos(trip: MockTrip) {
  return trip.stops.flatMap((stop) =>
    stop.entries
      .filter((e) => e.image)
      .map((e) => ({
        src: e.image!,
        caption: e.body ?? '',
        place: stop.place_name,
      })),
  )
}

export function buildJourneyMoments(
  trip: MockTrip,
  photoItems: ReturnType<typeof collectJourneyPhotos>,
): ListingMomentItem[] {
  return photoItems.slice(0, 4).map((p, i) => ({
    id: i,
    image: p.src,
    author: trip.author.username,
    body: p.caption?.trim() || `Moment at ${p.place} on this route.`,
    taggedListing: trip.title,
  }))
}

export function buildJourneyTrustHighlights(trip: MockTrip): string[] {
  const items: string[] = []
  const hook = journeyHook(trip)
  if (hook) items.push(hook)
  if (trip.likes_count >= 20) items.push(`${trip.likes_count} likes`)
  if (trip.comments_count > 0) items.push(`${trip.comments_count} tips shared`)
  return items.slice(0, 3)
}

export function buildJourneyDetailRows(trip: MockTrip) {
  return [
    {
      id: 'when',
      label: 'When',
      value: `${fmtJourneyDate(trip.starts_on)} – ${fmtJourneyDate(trip.ends_on)}`,
    },
    {
      id: 'countries',
      label: 'Countries',
      value: trip.countries.map(countryLabel).join(', '),
    },
    {
      id: 'transport',
      label: 'Transport',
      value: transportLabel(trip.transport_modes),
    },
  ]
}

export {
  buildJourneyGalleryImages,
  countryLabel,
  dayRangeLabel,
  fmtJourneyDate,
  fmtJourneyDateShort,
  formatJourneyCost,
  journeyHook,
  nightsBetween,
  partyLabel,
  routeLabel,
  transportLabel,
} from './journeyDisplay'

export function buildJourneyGallery(
  trip: MockTrip,
  photoItems: { src: string; caption: string; place: string }[],
): ListingGalleryItem[] {
  return buildJourneyGalleryImages(trip, photoItems)
}
