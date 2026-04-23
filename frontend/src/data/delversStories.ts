import { mediaUrl } from '../api/client'
import type { StorySlide } from './homeStories'

/** Pin fields needed to build user story reels (Delvers). */
export type DelversStoryPin = {
  id: number
  author: { username: string; display_name: string; avatar?: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  delvers_board: string
  created_at?: string
}

export function buildDelversSlidesForUser(posts: DelversStoryPin[]): StorySlide[] {
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
    const headline = body ? (body.length > 100 ? `${body.slice(0, 97)}…` : body) : 'Delvers pin'
    const bits = [p.delvers_board ? p.delvers_board : null, p.region].filter(Boolean)
    const sub = bits.length ? bits.join(' · ') : undefined
    return {
      id: `delvers-pin-${p.id}`,
      kind: isVid ? 'video' : 'image',
      src,
      headline,
      sub,
      durationMs: isVid ? 15000 : 5200,
    } satisfies StorySlide
  })
}
