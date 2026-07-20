import { mediaUrl } from '../../../api/client'
import { resolveVenuePhotos } from '../../../data/foodVenueSocial'
import type { StorySlide } from '../../../data/homeStories'
import { foodCoverSrc } from '../../../utils/foodDisplay'
import type { FoodVenueListing } from '../../../utils/foodListing'
import type { VenueStoryChannel, VenueStoryChannelInput, VenueStorySlide } from './types'
import { ownerHighlightsOnly } from '../../highlights/highlightChannelMerge'

function imgSrc(path: string): string {
  return mediaUrl(path) || path
}

export function venueSlideToStorySlide(slide: VenueStorySlide): StorySlide {
  return slide
}

export function buildVenueStoryChannels(
  venue: FoodVenueListing,
  options?: { venuePath?: string },
): VenueStoryChannel[] {
  const venuePath = options?.venuePath ?? `/food/${venue.id}`
  const photos = resolveVenuePhotos(venue.photos, venue.cover_image, venue.cuisine)
  const cover = foodCoverSrc(venue.cover_image, venue.cuisine)
  const channels: VenueStoryChannel[] = []

  const storySlides: VenueStorySlide[] = []
  if (venue.tagline?.trim() || venue.description?.trim()) {
    storySlides.push({
      id: `${venue.id}-story-intro`,
      kind: 'image',
      src: cover,
      headline: venue.tagline?.trim() || venue.name,
      sub: venue.description?.trim(),
      ctaPath: venuePath,
      ctaLabel: 'View venue',
    })
  }
  const ownerPhoto = photos.find((p) => p.category === 'owner')
  if (ownerPhoto) {
    storySlides.push({
      id: `${venue.id}-story-team`,
      kind: 'image',
      src: imgSrc(ownerPhoto.image),
      headline: `The people behind ${venue.name}`,
      sub: `Hosted by @${venue.owner_username}`,
      ctaPath: venuePath,
    })
  }
  if (storySlides.length > 0) {
    channels.push({
      id: 'our-story',
      label: 'Our story',
      coverSrc: storySlides[0].src,
      slides: storySlides,
    })
  }

  const menuPhotos = photos.filter((p) => p.category === 'menu')
  if (menuPhotos.length > 0) {
    channels.push({
      id: 'menu',
      label: 'Menu',
      coverSrc: imgSrc(menuPhotos[0].image),
      slides: menuPhotos.map((p) => ({
        id: `menu-${p.id}`,
        kind: 'image',
        src: imgSrc(p.image),
        headline: p.caption || 'From the menu',
        sub: venue.popular_dish ? `Try the ${venue.popular_dish}` : undefined,
        ctaPath: venuePath,
      })),
    })
  }

  const foodPhotos = photos.filter((p) => p.category === 'food' && !p.is_cover)
  if (foodPhotos.length > 0) {
    channels.push({
      id: 'food',
      label: 'The food',
      coverSrc: imgSrc(foodPhotos[0].image),
      slides: foodPhotos.map((p) => ({
        id: `food-${p.id}`,
        kind: 'image',
        src: imgSrc(p.image),
        headline: p.caption || venue.popular_dish || 'Fresh from the kitchen',
        sub:
          venue.popular_dish && !p.caption?.toLowerCase().includes(venue.popular_dish.toLowerCase())
            ? venue.popular_dish
            : undefined,
      })),
    })
  }

  // Guest / Delvers moments stay on the listing page separately — not part of provider showcase.

  const vibePhotos = photos.filter((p) => p.category === 'interior' || p.category === 'exterior')
  if (vibePhotos.length > 0) {
    channels.push({
      id: 'vibe',
      label: 'The vibe',
      coverSrc: imgSrc(vibePhotos[0].image),
      slides: vibePhotos.map((p) => ({
        id: `vibe-${p.id}`,
        kind: 'image',
        src: imgSrc(p.image),
        headline: p.caption || (p.category === 'interior' ? 'Inside' : 'Outside'),
        ctaPath: venuePath,
      })),
    })
  }

  return ownerHighlightsOnly(channels, venue.venue_stories, (custom) => mapCustomChannel(custom, venuePath))
}

function mapCustomChannel(input: VenueStoryChannelInput, venuePath: string): VenueStoryChannel | null {
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
    ctaPath: s.ctaPath ?? venuePath,
    ctaLabel: s.ctaLabel,
  }))
  return {
    id: input.id,
    label: input.label,
    coverSrc: input.coverSrc ? imgSrc(input.coverSrc) : slides[0].src,
    slides,
  }
}

/** One ring per venue on list pages — first slide from each highlight channel. */
export function buildVenueSpotlightChannel(
  venue: FoodVenueListing,
  options?: { venuePath?: string },
): VenueStoryChannel | null {
  const venuePath = options?.venuePath ?? `/food/${venue.id}`
  const channels = buildVenueStoryChannels(venue, { venuePath })
  const cover = foodCoverSrc(venue.cover_image, venue.cuisine)

  if (channels.length === 0) {
    return buildSummarySpotlight(venue, venuePath)
  }

  const slides = channels
    .map((ch) => ch.slides[0])
    .filter((s): s is VenueStorySlide => !!s)
    .slice(0, 5)

  if (slides.length === 0) {
    return buildSummarySpotlight(venue, venuePath)
  }

  return {
    id: `spotlight-${venue.id}`,
    label: venue.name,
    coverSrc: cover,
    slides,
  }
}

function buildSummarySpotlight(venue: FoodVenueListing, venuePath: string): VenueStoryChannel | null {
  const cover = foodCoverSrc(venue.cover_image, venue.cuisine)
  const slides: VenueStorySlide[] = []

  if (venue.tagline?.trim() || venue.description?.trim()) {
    slides.push({
      id: `${venue.id}-intro`,
      kind: 'image',
      src: cover,
      headline: venue.tagline?.trim() || venue.name,
      sub: venue.description?.trim(),
      ctaPath: venuePath,
      ctaLabel: 'View place',
    })
  }
  if (venue.popular_dish?.trim()) {
    slides.push({
      id: `${venue.id}-dish`,
      kind: 'image',
      src: cover,
      headline: `Known for ${venue.popular_dish}`,
      sub: `Hosted by @${venue.owner_username}`,
      ctaPath: venuePath,
    })
  }
  if (slides.length === 0) {
    slides.push({
      id: `${venue.id}-cover`,
      kind: 'image',
      src: cover,
      headline: venue.name,
      ctaPath: venuePath,
      ctaLabel: 'View place',
    })
  }

  return {
    id: `spotlight-${venue.id}`,
    label: venue.name,
    coverSrc: cover,
    slides,
  }
}
