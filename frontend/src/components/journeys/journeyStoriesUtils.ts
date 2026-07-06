import type { MockTrip } from '../../data/mockTrips'
import { journeyCoverSrc, routeLabel } from '../../utils/journeyDisplay'
import { fmtJourneyDateShort, formatJourneyCost } from '../../utils/journeyListing'
import type { VenueStoryChannel, VenueStoryChannelInput, VenueStorySlide } from '../food/stories/types'
import { ownerHighlightsOnly } from '../highlights/highlightChannelMerge'
import { collectRouteMedia } from './journeyRouteMedia'

export type { VenueStoryChannel, VenueStoryChannelInput }

function slideFromMedia(
  trip: MockTrip,
  item: ReturnType<typeof collectRouteMedia>[number],
  journeyPath: string,
): VenueStorySlide {
  if (item.kind === 'video') {
    return {
      id: `moment-${item.stopIndex}-${item.id}`,
      kind: 'video',
      src: item.src,
      headline: item.caption || item.stopName,
      sub: item.stopName,
      ctaPath: journeyPath,
      ctaLabel: 'View journey',
    }
  }
  return {
    id: `moment-${item.stopIndex}-${item.id}`,
    kind: 'image',
    src: item.src,
    headline: item.caption || item.stopName,
    sub: item.stopName,
    ctaPath: journeyPath,
    ctaLabel: 'View journey',
  }
}

function mapCustomChannel(input: VenueStoryChannelInput, journeyPath: string): VenueStoryChannel | null {
  if (!input.slides?.length) return null
  const slides: VenueStorySlide[] = input.slides.map((s, i) => ({
    id: s.id ?? `${input.id}-${i}`,
    kind: s.kind ?? 'image',
    src: s.src,
    headline: s.headline,
    sub: s.sub,
    captionX: s.captionX,
    captionY: s.captionY,
    durationMs: s.durationMs,
    ctaPath: s.ctaPath ?? journeyPath,
    ctaLabel: s.ctaLabel ?? 'View journey',
  }))
  return {
    id: input.id,
    label: input.label,
    coverSrc: input.coverSrc ?? slides[0].src,
    slides,
  }
}

export function buildJourneyStoryChannels(
  trip: MockTrip,
  options?: { journeyPath?: string },
): VenueStoryChannel[] {
  const journeyPath = options?.journeyPath ?? `/journeys/${trip.id}`
  const cover = journeyCoverSrc(trip.cover_image)
  const channels: VenueStoryChannel[] = []

  const introSlides: VenueStorySlide[] = []
  if (trip.summary?.trim() || trip.title) {
    introSlides.push({
      id: `${trip.id}-intro`,
      kind: 'image',
      src: cover,
      headline: trip.title,
      sub: trip.summary?.trim() || routeLabel(trip),
      ctaPath: journeyPath,
      ctaLabel: 'View journey',
    })
  }
  introSlides.push({
    id: `${trip.id}-author`,
    kind: 'image',
    src: trip.author.avatar || cover,
    headline: `Planned by @${trip.author.username}`,
    sub: `${trip.days} days · ${formatJourneyCost(trip.total_cost, trip.currency)}`,
    ctaPath: journeyPath,
  })
  if (introSlides.length > 0) {
    channels.push({
      id: 'our-journey',
      label: 'Our journey',
      coverSrc: cover,
      slides: introSlides,
    })
  }

  const routeSlides: VenueStorySlide[] = trip.stops
    .map((stop) => {
      const media = stop.entries.find((e) => e.image || e.video)
      const src = media?.image || media?.video || cover
      const kind = media?.video && !media.image ? 'video' : 'image'
      return {
        id: `route-${stop.id}`,
        kind: kind as 'image' | 'video',
        src: kind === 'video' ? media!.video! : src,
        headline: stop.place_name,
        sub: [
          `${fmtJourneyDateShort(stop.arrived_on)} – ${fmtJourneyDateShort(stop.left_on)}`,
          stop.notes?.trim(),
        ]
          .filter(Boolean)
          .join(' · '),
        ctaPath: journeyPath,
      }
    })
    .filter((s) => !!s.src)

  if (routeSlides.length > 0) {
    channels.push({
      id: 'the-route',
      label: 'The route',
      coverSrc: routeSlides[0].kind === 'image' ? routeSlides[0].src : cover,
      slides: routeSlides,
    })
  }

  const media = collectRouteMedia(trip.stops)
  if (media.length > 0) {
    channels.push({
      id: 'moments',
      label: 'Moments',
      coverSrc: media[0].kind === 'video' && media[0].poster ? media[0].poster : media[0].src,
      slides: media.map((item) => slideFromMedia(trip, item, journeyPath)),
    })
  }

  const tipSlides: VenueStorySlide[] = trip.stops
    .filter((s) => s.notes?.trim())
    .map((stop) => {
      const thumb = stop.entries.find((e) => e.image)?.image ?? cover
      return {
        id: `tip-${stop.id}`,
        kind: 'image' as const,
        src: thumb,
        headline: stop.place_name,
        sub: stop.notes.trim(),
        ctaPath: journeyPath,
      }
    })

  if (tipSlides.length > 0) {
    channels.push({
      id: 'tips',
      label: 'Tips',
      coverSrc: tipSlides[0].src,
      slides: tipSlides,
    })
  }

  return ownerHighlightsOnly(channels, trip.journey_stories, (custom) => mapCustomChannel(custom, journeyPath))
}
