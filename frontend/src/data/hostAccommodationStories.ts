import { mediaUrl } from '../api/client'
import type { StorySlide } from './homeStories'

/** Post fields from `/api/social/accommodation-stories/` used for host story reels. */
export type HostStoryPost = {
  id: number
  author: { username: string; display_name: string; avatar?: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  created_at?: string
  listing?: { id: number; title: string } | null
}

export function buildHostAccommodationSlides(posts: HostStoryPost[]): StorySlide[] {
  const withMedia = posts.filter((p) => p.image || p.video)
  const sorted = [...withMedia].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime()
    const tb = new Date(b.created_at || 0).getTime()
    return tb - ta
  })
  return sorted.map((p) => {
    const isVid = Boolean(p.video)
    const raw = p.video || p.image
    const src = mediaUrl(raw) || ''
    const body = p.body.trim()
    const headline = body ? (body.length > 100 ? `${body.slice(0, 97)}…` : body) : 'Host story'
    const bits = [p.listing?.title ? p.listing.title : null, p.region].filter(Boolean)
    const sub = bits.length ? bits.join(' · ') : undefined
    const ctaPath = p.listing ? `/accommodation/${p.listing.id}` : `/u/${encodeURIComponent(p.author.username)}`
    const ctaLabel = p.listing ? 'View listing' : 'View host'
    return {
      id: `host-story-${p.id}`,
      kind: isVid ? 'video' : 'image',
      src,
      headline,
      sub,
      durationMs: isVid ? 15000 : 5200,
      ctaPath,
      ctaLabel,
    } satisfies StorySlide
  })
}
