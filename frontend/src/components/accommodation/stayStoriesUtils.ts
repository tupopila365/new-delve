import { mediaUrl } from '../../api/client'
import type { VenueStoryChannel, VenueStoryChannelInput, VenueStorySlide } from '../food/stories/types'
import { ownerHighlightsOnly } from '../highlights/highlightChannelMerge'
import {
  buildListingImages,
  propertyTypeLabel,
  type AccommodationListing,
} from '../../utils/accommodationListing'
import { formatDisplayMoney } from '../../lib/displayMoney'
import { exploreDisplayCurrency } from '../../lib/exploreDestination'
import { isVideoUrl } from '../listing/photos/listingGalleryMedia'

function shortLabel(title: string, max = 16): string {
  const t = title.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function resolveSrc(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  return mediaUrl(raw) || raw
}

function mediaKind(kind: string | undefined, src: string): 'image' | 'video' {
  if (kind === 'video' || isVideoUrl(src)) return 'video'
  return 'image'
}

function pickCover(
  slides: VenueStorySlide[],
  preferredSrc?: string,
): { coverSrc: string; coverKind: 'image' | 'video' } {
  const preferred = preferredSrc?.trim()
  if (preferred) {
    const match = slides.find((s) => s.src === preferred)
    return { coverSrc: preferred, coverKind: match?.kind ?? mediaKind(undefined, preferred) }
  }
  const imageSlide = slides.find((s) => s.kind === 'image')
  if (imageSlide) return { coverSrc: imageSlide.src, coverKind: 'image' }
  const first = slides[0]
  return { coverSrc: first.src, coverKind: first.kind }
}

function mapCustomChannel(input: VenueStoryChannelInput, stayPath: string): VenueStoryChannel | null {
  if (!input.slides?.length) return null
  const slides: VenueStorySlide[] = input.slides.map((s, i) => {
    const src = resolveSrc(s.src)
    return {
      id: s.id ?? `${input.id}-${i}`,
      kind: mediaKind(s.kind, src),
      src,
      headline: s.headline,
      sub: s.sub,
      captionX: s.captionX,
      captionY: s.captionY,
      durationMs: s.durationMs,
      ctaPath: s.ctaPath ?? stayPath,
      ctaLabel: s.ctaLabel ?? 'View stay',
    }
  })
  const cover = pickCover(slides, input.coverSrc ? resolveSrc(input.coverSrc) : undefined)
  return {
    id: input.id,
    label: input.label,
    coverSrc: cover.coverSrc,
    coverKind: cover.coverKind,
    slides,
  }
}

/** Highlight channels from stay cover/gallery — custom listing_stories replace auto when set. */
export function buildStayStoryChannels(
  data: AccommodationListing,
  options: { listingId: string; stayPath?: string },
): VenueStoryChannel[] {
  const stayPath = options.stayPath ?? `/accommodation/${options.listingId}`
  const gallery = buildListingImages(data)
    .map((img) => ({
      ...img,
      src: resolveSrc(img.src),
      kind: mediaKind(img.kind, resolveSrc(img.src)) as 'image' | 'video',
    }))
    .filter((img) => Boolean(img.src?.trim()))

  const coverSrc = gallery[0]?.src || resolveSrc(data.cover_image)
  const coverKind = gallery[0]?.kind ?? mediaKind(undefined, coverSrc)
  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const typeLabel = data.property_type ? propertyTypeLabel(data.property_type) : 'Stay'
  const channels: VenueStoryChannel[] = []

  if (coverSrc) {
    const introSlides: VenueStorySlide[] = [
      {
        id: `${data.id}-intro`,
        kind: coverKind,
        src: coverSrc,
        headline: data.title,
        sub: data.description?.trim()?.slice(0, 140) || locationLine || typeLabel,
        ctaPath: stayPath,
        ctaLabel: 'View stay',
      },
    ]

    const rateMedia = gallery[1]
    if (rateMedia?.src) {
      introSlides.push({
        id: `${data.id}-rate`,
        kind: rateMedia.kind,
        src: rateMedia.src,
        headline: formatDisplayMoney(data.price_per_night, exploreDisplayCurrency(), {
          suffix: '/night',
          from: true,
        }),
        sub: [locationLine, `Up to ${data.max_guests} guests`].filter(Boolean).join(' · '),
        ctaPath: stayPath,
        ctaLabel: 'Select room',
      })
    }

    const introCover = pickCover(introSlides, coverSrc)
    channels.push({
      id: 'the-stay',
      label: shortLabel(data.title),
      coverSrc: introCover.coverSrc,
      coverKind: introCover.coverKind,
      slides: introSlides,
    })
  }

  const gallerySlides: VenueStorySlide[] = gallery.map((item, index) => ({
    id: `${data.id}-gallery-${item.id ?? index}`,
    kind: item.kind,
    src: item.src,
    headline: item.kind === 'video' ? 'Stay video' : 'Stay photo',
    sub: [locationLine, typeLabel].filter(Boolean).join(' · ') || data.title,
    ctaPath: stayPath,
    ctaLabel: 'View stay',
  }))

  if (gallerySlides.length > 1) {
    const galleryCover = pickCover(gallerySlides)
    channels.push({
      id: 'spaces',
      label: gallerySlides.some((s) => s.kind === 'video') ? 'Photos & video' : 'Spaces',
      coverSrc: galleryCover.coverSrc,
      coverKind: galleryCover.coverKind,
      slides: gallerySlides,
    })
  }

  return ownerHighlightsOnly(channels, data.listing_stories, (custom) =>
    mapCustomChannel(custom, stayPath),
  )
}
