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

export type HashtagHighlightRing = {
  id: string
  ringKey: string
  label: string
  tagSlug: string
  posts: DelversFeedPost[]
}

export type DelversStoryRing =
  | { kind: 'board'; ring: BoardHighlightRing }
  | { kind: 'tag'; ring: HashtagHighlightRing }
  | { kind: 'place'; ring: PlaceHighlightRing }

export function mapHashtagRing(ring: {
  ring_id: string
  tag_slug: string
  label?: string
  posts: DelversFeedPost[]
}): HashtagHighlightRing {
  return {
    id: ring.ring_id || ring.tag_slug,
    ringKey: `tag:${ring.tag_slug.trim().toLowerCase()}`,
    label: `#${ring.tag_slug}`,
    tagSlug: ring.tag_slug,
    posts: ring.posts,
  }
}

/** Display order matches the Delvers stories row: boards, hashtags, places. */
export function buildDelversStoryRingQueue(
  boardRings: BoardHighlightRing[],
  hashtagRings: HashtagHighlightRing[],
  placeRings: PlaceHighlightRing[],
): DelversStoryRing[] {
  return [
    ...boardRings.filter((ring) => ring.posts.length > 0).map((ring) => ({ kind: 'board' as const, ring })),
    ...hashtagRings.filter((ring) => ring.posts.length > 0).map((ring) => ({ kind: 'tag' as const, ring })),
    ...placeRings.filter((ring) => ring.posts.length > 0).map((ring) => ({ kind: 'place' as const, ring })),
  ]
}

export function findStoryRingIndex(queue: DelversStoryRing[], entry: DelversStoryRing): number {
  const key = ringKeyForStoryTarget(storyTargetFromRing(entry))
  return queue.findIndex((item) => ringKeyForStoryTarget(storyTargetFromRing(item)) === key)
}

export function storyTargetFromRing(entry: DelversStoryRing): {
  kind: 'board' | 'place' | 'tag'
  title: string
  subtitle: string
  avatar: string | null
  username?: string
  boardKey?: string
  tagSlug?: string
  posts: DelversFeedPost[]
} {
  if (entry.kind === 'board') {
    const { ring } = entry
    return {
      kind: 'board',
      title: ring.label,
      subtitle: `@${ring.username} · ${ring.posts.length} ${ring.posts.length === 1 ? 'slide' : 'slides'}`,
      avatar: ring.avatar,
      username: ring.username,
      boardKey: ring.ringKey,
      posts: ring.posts,
    }
  }
  if (entry.kind === 'tag') {
    const { ring } = entry
    return {
      kind: 'tag',
      title: ring.label,
      subtitle: `${ring.posts.length} ${ring.posts.length === 1 ? 'highlight' : 'highlights'} for ${ring.label}`,
      avatar: null,
      tagSlug: ring.tagSlug,
      posts: ring.posts,
    }
  }
  const { ring } = entry
  return {
    kind: 'place',
    title: ring.label,
    subtitle: `${ring.posts.length} ${ring.posts.length === 1 ? 'highlight' : 'highlights'} from this place`,
    avatar: null,
    posts: ring.posts,
  }
}

export function ringKeyForStoryTarget(target: {
  kind: 'board' | 'place' | 'tag'
  boardKey?: string
  tagSlug?: string
  title: string
}): string {
  if (target.kind === 'board' && target.boardKey) return target.boardKey
  if (target.kind === 'tag' && target.tagSlug) return `tag:${target.tagSlug.trim().toLowerCase()}`
  return `place:${target.title.trim().toLowerCase()}`
}
