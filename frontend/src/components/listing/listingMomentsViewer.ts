import type { FeedPost } from '../IgPostCard'
import type { ListingMomentItem } from './types'

export function listingMomentToFeedPost(moment: ListingMomentItem, index: number): FeedPost {
  const rawId = moment.id
  const id =
    typeof rawId === 'number'
      ? rawId
      : Number.isFinite(Number(rawId))
        ? Number(rawId)
        : 900_000_000 + index

  return {
    id,
    author: {
      username: moment.author,
      display_name: moment.author,
      avatar: null,
    },
    body: moment.body,
    region: '',
    image: moment.image ?? null,
    video: null,
    likes_count: 0,
    saves_count: 0,
    liked_by_me: false,
    saved_by_me: false,
    comments_count: 0,
  }
}

/** Open viewer at one moment; scroll shows other photos from the same Delver. */
export function buildMomentsViewerState(
  moments: ListingMomentItem[],
  momentId: string | number,
): { posts: FeedPost[]; index: number } | null {
  const clicked = moments.find((m) => m.id === momentId)
  if (!clicked?.image) return null

  const authorMoments = moments.filter((m) => m.author === clicked.author && m.image)
  if (authorMoments.length === 0) return null

  const posts = authorMoments.map((m, i) => listingMomentToFeedPost(m, i))
  const index = authorMoments.findIndex((m) => m.id === momentId)
  if (index < 0) return null

  return { posts, index }
}
