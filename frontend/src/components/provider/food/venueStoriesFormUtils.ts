import type { HighlightChannelInput } from '../../highlights/types'

export {
  MAX_HIGHLIGHT_CHANNELS as MAX_VENUE_STORY_CHANNELS,
  MAX_HIGHLIGHT_SLIDES as MAX_VENUE_STORY_SLIDES,
  emptyHighlightChannel as emptyVenueStoryChannel,
  emptyHighlightSlide as emptyVenueStorySlide,
  normalizeHighlightsForSave as normalizeVenueStoriesForSave,
} from '../../highlights/highlightFormUtils'

export type { HighlightChannelInput as VenueStoryChannelInput }
