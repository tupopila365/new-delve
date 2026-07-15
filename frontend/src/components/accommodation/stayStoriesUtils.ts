import { mediaUrl } from '../../api/client'
import type { VenueStoryChannel, VenueStorySlide } from '../food/stories/types'
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

/** Compact highlight rings from stay cover/gallery — after rooms so tickets stay early. */
export function buildStayStoryChannels(
  data: AccommodationListing,
  options: { listingId: string; stayPath?: string },
): VenueStoryChannel[] {
  const stayPath = options.stayPath ?? `/accommodation/${options.listingId}`
  const gallery = buildListingImages(data)
    .map((img) => ({ ...img, src: resolveSrc(img.src) }))
    .filter((img) => Boolean(img.src?.trim()))

  const cover = gallery[0]?.src || resolveSrc(data.cover_image)
  if (!cover) return []

  const locationLine = [data.city, data.region].filter(Boolean).join(', ')
  const typeLabel = data.property_type ? propertyTypeLabel(data.property_type) : 'Stay'

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

  return [
    {
      id: 'the-stay',
      label: shortLabel(data.title),
      coverSrc: cover,
      slides: introSlides,
    },
  ]
}
