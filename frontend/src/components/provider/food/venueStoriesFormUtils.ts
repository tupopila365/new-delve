import type { VenueStoryChannelInput } from '../../food/stories/types'

export const MAX_VENUE_STORY_CHANNELS = 8
export const MAX_VENUE_STORY_SLIDES = 12

export function emptyVenueStoryChannel(index = 0): VenueStoryChannelInput {
  return {
    id: `channel-${index + 1}`,
    label: '',
    coverSrc: '',
    slides: [emptyVenueStorySlide(0)],
  }
}

export function emptyVenueStorySlide(index = 0) {
  return {
    id: `slide-${index + 1}`,
    kind: 'image' as const,
    src: '',
    headline: '',
    sub: '',
  }
}

export function normalizeVenueStoriesForSave(
  channels: VenueStoryChannelInput[],
): VenueStoryChannelInput[] {
  return channels
    .map((ch, channelIndex) => {
      const label = ch.label.trim()
      const slides = ch.slides
        .map((slide, slideIndex) => {
          const src = slide.src.trim()
          const headline = slide.headline.trim()
          if (!src || !headline) return null
          return {
            id: slide.id?.trim() || `slide-${channelIndex + 1}-${slideIndex + 1}`,
            kind: slide.kind === 'video' ? 'video' : 'image',
            src,
            headline,
            sub: slide.sub?.trim() || undefined,
          }
        })
        .filter((slide): slide is NonNullable<typeof slide> => slide != null)
      if (!label || slides.length === 0) return null
      return {
        id: ch.id.trim() || `channel-${channelIndex + 1}`,
        label,
        coverSrc: ch.coverSrc?.trim() || slides[0].src,
        slides,
      }
    })
    .filter((ch): ch is VenueStoryChannelInput => ch != null)
}
