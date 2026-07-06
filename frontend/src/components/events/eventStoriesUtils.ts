import { mediaUrl } from '../../api/client'
import type { VenueStoryChannel, VenueStorySlide } from '../food/stories/types'
import type { HighlightChannelInput } from '../highlights/types'
import { ownerHighlightsOnly } from '../highlights/highlightChannelMerge'
import type { ProviderStoryItem } from '../ProviderStoriesRow'
import {
  admissionLabel,
  buildEventGalleryImages,
  buildEventHighlights,
  categoryMeta,
  eventCoverSrc,
  eventLocationLine,
  eventTimeRange,
  formatEventDateLong,
  organizerLabel,
  type EventDetail,
} from '../../utils/eventListing'

export function eventSlideToStorySlide(slide: VenueStorySlide) {
  return slide
}

function imgSrc(path: string): string {
  return mediaUrl(path) || path
}

function mapCustomChannel(input: HighlightChannelInput, eventPath: string): VenueStoryChannel | null {
  if (!input.slides?.length) return null
  const slides: VenueStorySlide[] = input.slides.map((s, i) => ({
    id: s.id ?? `${input.id}-${i}`,
    kind: s.kind ?? 'image',
    src: imgSrc(s.src),
    headline: s.headline,
    sub: s.sub,
    captionX: s.captionX,
    captionY: s.captionY,
    durationMs: s.durationMs,
    ctaPath: s.ctaPath ?? eventPath,
    ctaLabel: s.ctaLabel ?? 'View event',
  }))
  return {
    id: input.id,
    label: input.label,
    coverSrc: input.coverSrc ? imgSrc(input.coverSrc) : slides[0].src,
    slides,
  }
}

export function buildEventSpotlightChannel(
  event: EventDetail,
  options: { eventId: string; eventPath?: string },
): VenueStoryChannel | null {
  const eventPath = options.eventPath ?? `/events/${options.eventId}`
  const cover = eventCoverSrc(event.cover_image, event.category)
  const channels = buildEventStoryChannels(event, { eventId: options.eventId, eventPath })

  if (channels.length === 0) {
    return {
      id: `spotlight-${event.id}`,
      label: event.title,
      coverSrc: cover,
      slides: [
        {
          id: `${event.id}-intro`,
          kind: 'image',
          src: cover,
          headline: event.title,
          sub: eventLocationLine(event),
          ctaPath: eventPath,
          ctaLabel: 'View event',
        },
      ],
    }
  }

  const slides = channels
    .map((channel) => channel.slides[0])
    .filter((slide): slide is VenueStorySlide => !!slide)
    .slice(0, 5)

  if (slides.length === 0) return null

  return {
    id: `spotlight-${event.id}`,
    label: event.title,
    coverSrc: cover,
    slides,
  }
}

export function buildEventStoryChannels(
  event: EventDetail,
  options: { eventId: string; eventPath?: string },
): VenueStoryChannel[] {
  const eventPath = options.eventPath ?? `/events/${options.eventId}`
  const cover = eventCoverSrc(event.cover_image, event.category)
  const gallery = buildEventGalleryImages(event)
  const channels: VenueStoryChannel[] = []
  const cat = categoryMeta(event.category)
  const start = formatEventDateLong(event.starts_at)
  const location = eventLocationLine(event)
  const organizer = organizerLabel(event)

  const vibeSlides: VenueStorySlide[] = []
  if (cover) {
    vibeSlides.push({
      id: `${event.id}-headline`,
      kind: 'image',
      src: cover,
      headline: event.title,
      sub: [cat.label, start.month !== 'TBA' ? `${start.month} ${start.day}` : null, location]
        .filter(Boolean)
        .join(' · '),
      ctaPath: eventPath,
      ctaLabel: 'View event',
    })
    vibeSlides.push({
      id: `${event.id}-vibe`,
      kind: 'image',
      src: cover,
      headline: event.is_free ? 'Free to join' : admissionLabel(event),
      sub: event.description?.trim()?.slice(0, 120) || `Hosted by ${organizer}`,
      ctaPath: eventPath,
      ctaLabel: event.ticket_url ? 'Get tickets' : 'View event',
    })
  }
  if (vibeSlides.length > 0) {
    channels.push({
      id: 'the-vibe',
      label: 'The vibe',
      coverSrc: cover,
      slides: vibeSlides,
    })
  }

  const planSlides: VenueStorySlide[] = buildEventHighlights(event).map((highlight, i) => ({
    id: `plan-${i}`,
    kind: 'image' as const,
    src: gallery[0]?.src || cover,
    headline: highlight,
    sub: `At ${event.venue || location}`,
    ctaPath: eventPath,
    ctaLabel: 'Plan your visit',
  }))
  if (planSlides.length > 0) {
    channels.push({
      id: 'plan-visit',
      label: 'Plan your night',
      coverSrc: planSlides[0].src,
      slides: planSlides,
    })
  }

  const venueSlides: VenueStorySlide[] = []
  if (cover) {
    venueSlides.push({
      id: `${event.id}-when`,
      kind: 'image',
      src: cover,
      headline: start.weekday,
      sub: `${start.date} · ${eventTimeRange(event)}`,
      ctaPath: eventPath,
      ctaLabel: 'Add to calendar',
    })
    venueSlides.push({
      id: `${event.id}-where`,
      kind: 'image',
      src: cover,
      headline: event.venue?.trim() || 'Venue TBA',
      sub: location,
      ctaPath: eventPath,
      ctaLabel: 'Get directions',
    })
  }
  if (venueSlides.length > 0) {
    channels.push({
      id: 'venue',
      label: 'When & where',
      coverSrc: cover,
      slides: venueSlides,
    })
  }

  return ownerHighlightsOnly(channels, event.event_stories, (custom) => mapCustomChannel(custom, eventPath))
}

export function buildEventProviderStoryItems(
  event: EventDetail,
  options: { eventId: string; eventPath?: string },
): ProviderStoryItem[] {
  const eventPath = options.eventPath ?? `/events/${options.eventId}`
  return buildEventStoryChannels(event, { eventId: options.eventId, eventPath }).map((channel) => ({
    id: channel.id,
    label: channel.label,
    channelLabel: `${event.title} · ${channel.label}`,
    explorePath: eventPath,
    coverSrc: channel.coverSrc,
    slides: channel.slides.map(eventSlideToStorySlide),
  }))
}
