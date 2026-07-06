/** Shared highlight / story-ring types for journeys, events, food, guides, etc. */

export type HighlightSlide = {
  id: string
  kind: 'image' | 'video'
  src: string
  headline: string
  sub?: string
  /** Caption overlay position (percent of media frame). */
  captionX?: number
  captionY?: number
  durationMs?: number
  ctaPath?: string
  ctaLabel?: string
}

export type HighlightChannel = {
  id: string
  /** Owner-chosen name shown under the story ring. */
  label: string
  coverSrc: string
  slides: HighlightSlide[]
}

export type HighlightChannelInput = {
  id: string
  label: string
  coverSrc?: string
  slides: Array<{
    id?: string
    kind?: 'image' | 'video'
    src: string
    headline: string
    sub?: string
    captionX?: number
    captionY?: number
    durationMs?: number
    ctaPath?: string
    ctaLabel?: string
  }>
}

/** @deprecated Use HighlightSlide */
export type VenueStorySlide = HighlightSlide

/** @deprecated Use HighlightChannel */
export type VenueStoryChannel = HighlightChannel

/** @deprecated Use HighlightChannelInput */
export type VenueStoryChannelInput = HighlightChannelInput
