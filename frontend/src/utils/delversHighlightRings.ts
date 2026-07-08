import { mediaUrl } from '../api/client'
import type { DelversFeedPost } from '../components/social/delversFeedTypes'
import { boardRingKey } from './delversHighlightSeen'

export type HighlightCover = {
  src: string | null
  kind: 'image' | 'video'
}

export type BoardHighlightRing = {
  id: string
  ringKey: string
  label: string
  cover: HighlightCover
  avatar: string | null
  username: string
  displayName: string
  isFollowing: boolean
  posts: DelversFeedPost[]
}

export type PlaceHighlightRing = {
  id: string
  ringKey: string
  label: string
  cover: HighlightCover
  posts: DelversFeedPost[]
}

export function normalizeHighlightBoard(board?: string): string {
  const value = (board || 'Highlights').trim()
  return value || 'Highlights'
}

export function highlightCoverFromPost(post: DelversFeedPost): HighlightCover {
  const image = mediaUrl(post.image ?? null)
  if (image) return { src: image, kind: 'image' }
  const video = mediaUrl(post.video ?? null)
  if (video) return { src: video, kind: 'video' }
  return { src: null, kind: 'image' }
}

function sortPostsNewestFirst(posts: DelversFeedPost[]): DelversFeedPost[] {
  return [...posts].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return tb - ta
  })
}

export function buildBoardRings(highlights: DelversFeedPost[]): BoardHighlightRing[] {
  const map = new Map<string, DelversFeedPost[]>()

  for (const post of highlights) {
    if (!post.image && !post.video) continue
    const board = normalizeHighlightBoard(post.delvers_board)
    const key = `${post.author.username}\0${board.toLowerCase()}`
    const list = map.get(key) ?? []
    list.push(post)
    map.set(key, list)
  }

  const rings: BoardHighlightRing[] = []
  for (const [, posts] of map) {
    const sorted = sortPostsNewestFirst(posts)
    const latest = sorted[0]
    if (!latest) continue
    const board = normalizeHighlightBoard(latest.delvers_board)
    rings.push({
      id: `${latest.author.username}:${board.toLowerCase()}`,
      ringKey: boardRingKey(latest.author.username, board),
      label: board,
      cover: highlightCoverFromPost(latest),
      avatar: latest.author.avatar ?? null,
      username: latest.author.username,
      displayName: latest.author.display_name || latest.author.username,
      isFollowing: Boolean(latest.is_author_followed),
      posts: sorted,
    })
  }

  return rings.sort((a, b) => {
    const follow = Number(b.isFollowing) - Number(a.isFollowing)
    if (follow !== 0) return follow
    const aTime = a.posts[0]?.created_at ? new Date(a.posts[0].created_at).getTime() : 0
    const bTime = b.posts[0]?.created_at ? new Date(b.posts[0].created_at).getTime() : 0
    return bTime - aTime
  })
}

export function buildPlaceRings(highlights: DelversFeedPost[]): PlaceHighlightRing[] {
  const map = new Map<string, { label: string; posts: DelversFeedPost[] }>()

  for (const post of highlights) {
    if (!post.image && !post.video) continue
    const region = post.region?.trim()
    if (!region) continue
    const key = region.toLowerCase()
    const bucket = map.get(key)
    if (bucket) {
      bucket.posts.push(post)
    } else {
      map.set(key, { label: region, posts: [post] })
    }
  }

  const rings: PlaceHighlightRing[] = []
  for (const [key, { label, posts }] of map) {
    const sorted = sortPostsNewestFirst(posts)
    const latest = sorted[0]
    if (!latest) continue
    rings.push({
      id: `place:${key}`,
      ringKey: `place:${key}`,
      label,
      cover: highlightCoverFromPost(latest),
      posts: sorted,
    })
  }

  return rings.sort((a, b) => {
    const aTime = a.posts[0]?.created_at ? new Date(a.posts[0].created_at).getTime() : 0
    const bTime = b.posts[0]?.created_at ? new Date(b.posts[0].created_at).getTime() : 0
    return bTime - aTime
  })
}
