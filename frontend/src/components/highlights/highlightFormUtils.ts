import type { HighlightChannelInput } from './types'

export const MAX_HIGHLIGHT_CHANNELS = 8
export const MAX_HIGHLIGHT_SLIDES = 12

export function emptyHighlightChannel(index = 0): HighlightChannelInput {
  return {
    id: `channel-${index + 1}`,
    label: '',
    coverSrc: '',
    slides: [emptyHighlightSlide(0)],
  }
}

export function emptyHighlightSlide(index = 0) {
  return {
    id: `slide-${index + 1}`,
    kind: 'image' as const,
    src: '',
    headline: '',
    sub: '',
  }
}

export function filledHighlightSlides(
  slides: HighlightChannelInput['slides'],
): HighlightChannelInput['slides'] {
  return slides.filter((s) => s.src?.trim() && s.headline?.trim())
}

export function normalizeHighlightsForSave(channels: HighlightChannelInput[]): HighlightChannelInput[] {
  return channels
    .map((ch, channelIndex) => {
      const label = ch.label.trim()
      const slides = ch.slides
        .map((slide, slideIndex) => {
          const src = slide.src.trim()
          const headline = slide.headline.trim()
          if (!src || !headline) return null
          const normalized: {
            id: string
            kind: 'image' | 'video'
            src: string
            headline: string
            sub?: string
            captionX?: number
            captionY?: number
          } = {
            id: slide.id?.trim() || `slide-${channelIndex + 1}-${slideIndex + 1}`,
            kind: slide.kind === 'video' ? 'video' : 'image',
            src,
            headline,
            sub: slide.sub?.trim() || undefined,
          }
          if (typeof slide.captionX === 'number' && Number.isFinite(slide.captionX)) {
            normalized.captionX = Math.min(100, Math.max(0, slide.captionX))
          }
          if (typeof slide.captionY === 'number' && Number.isFinite(slide.captionY)) {
            normalized.captionY = Math.min(100, Math.max(0, slide.captionY))
          }
          return normalized
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
    .filter((ch): ch is HighlightChannelInput => ch != null)
}
