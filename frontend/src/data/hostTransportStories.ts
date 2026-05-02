import { mediaUrl } from '../api/client'
import type { StorySlide } from './homeStories'

/** Mock pins for rental-provider story rings on Transport (same shape as host stays, vehicle CTA). */
export type TransportStoryPost = {
  id: number
  author: { username: string; display_name: string; avatar?: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  created_at?: string
  vehicle?: { id: number; title: string } | null
}

export function buildTransportStorySlides(posts: TransportStoryPost[]): StorySlide[] {
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
    const headline = body ? (body.length > 100 ? `${body.slice(0, 97)}…` : body) : 'Fleet update'
    const bits = [p.vehicle?.title ? p.vehicle.title : null, p.region].filter(Boolean)
    const sub = bits.length ? bits.join(' · ') : undefined
    const ctaPath = p.vehicle
      ? `/transport/vehicle/${p.vehicle.id}`
      : `/u/${encodeURIComponent(p.author.username)}`
    const ctaLabel = p.vehicle ? 'View vehicle' : 'View provider'
    return {
      id: `transport-story-${p.id}`,
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
