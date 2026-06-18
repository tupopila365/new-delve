export type VenueStorySlide = {
  id: string
  kind: 'image' | 'video'
  src: string
  headline: string
  sub?: string
  durationMs?: number
  ctaPath?: string
  ctaLabel?: string
}

export type VenueStoryChannel = {
  id: string
  label: string
  coverSrc: string
  slides: VenueStorySlide[]
}

/** Provider-defined highlight — saved on the venue and merged into story rings. */
export type VenueStoryChannelInput = {
  id: string
  label: string
  coverSrc?: string
  slides: Array<{
    id?: string
    kind?: 'image' | 'video'
    src: string
    headline: string
    sub?: string
    durationMs?: number
    ctaPath?: string
    ctaLabel?: string
  }>
}
