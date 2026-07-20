import { mediaUrl } from '../../api/client'
import type { VenueStoryChannel, VenueStoryChannelInput, VenueStorySlide } from '../food/stories/types'
import { ownerHighlightsOnly } from '../highlights/highlightChannelMerge'
import {
  buildListingImages,
  propertyTypeLabel,
  type AccommodationListing,
} from '../../utils/accommodationListing'

function shortLabel(title: string, max = 16): string {
  const t = title.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function resolveSrc(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  return mediaUrl(raw) || raw
}

function mapCustomChannel(input: VenueStoryChannelInput, stayPath: string): VenueStoryChannel | null {
  if (!input.slides?.length) return null
  const slides: VenueStorySlide[] = input.slides.map((s, i) => ({
    id: s.id ?? `${input.id}-${i}`,
    kind: s.kind ?? 'image',
    src: resolveSrc(s.src),
    headline: s.headline,
    sub: s.sub,
    captionX: s.captionX,
    captionY: s.captionY,
    durationMs: s.durationMs,
    ctaPath: s.ctaPath ?? stayPath,
    ctaLabel: s.ctaLabel ?? 'View stay',
  }))
  return {
    id: input.id,
    label: input.label,
    coverSrc: input.coverSrc ? resolveSrc(input.coverSrc) : slides[0].src,
    slides,
  }
}

/** Compact highlight rings from stay cover/gallery — custom listing_stories replace auto when set. */
export function buildStayStoryChannels(
  data: AccommodationListing,
  options: { listingId: string; stayPath?: string },
): VenueStoryChannel[] {
  const stayPath = options.stayPath ?? `/accommodation/${options.listingId}`
  const gallery = buildListingImages(data)
    .map((img) => ({ ...img, src: resolveSrc(img.src) }))
    .filter((img) => Boolean(img.src?.trim()))

  const cover = gallery[0]?.src || resolveSrc(data.cover_image)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const typeLabel = data.property_type ? propertyTypeLabel(data.property_type) : 'Stay'
  const channels: VenueStoryChannel[] = []

  if (cover) {
    const introSlides: VenueStorySlide[] = [
      {
        id: `${data.id}-intro`,
        kind: 'image',
        src: cover,
        headline: data.title,
        sub: data.description?.trim()?.slice(0, 140) || locationLine || typeLabel,
        ctaPath: stayPath,
        ctaLabel: 'View stay',
      },
    ]

    if (gallery[1]?.src) {
      introSlides.push({
        id: `${data.id}-rate`,
        kind: 'image',
        src: gallery[1].src,
        headline: `From N$${data.price_per_night} / night`,
        sub: [locationLine, `Up to ${data.max_guests} guests`].filter(Boolean).join(' · '),
        ctaPath: stayPath,
        ctaLabel: 'Select room',
      })
    }

    channels.push({
      id: 'the-stay',
      label: shortLabel(data.title),
      coverSrc: cover,
      slides: introSlides,
    })
  }

  return ownerHighlightsOnly(channels, data.listing_stories, (custom) =>
    mapCustomChannel(custom, stayPath),
  )
}
