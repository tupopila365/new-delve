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
    image: moment.media && moment.media.length > 0 ? null : moment.kind === 'video' ? null : moment.image ?? null,
    video: moment.media && moment.media.length > 0 ? null : moment.video ?? null,
    media: moment.media,
    likes_count: 0,
    saves_count: 0,
    liked_by_me: false,
    saved_by_me: false,
    comments_count: 0,
  }
}

/** Open viewer at one moment; scroll shows other photos from the same Delver. */
/** True when a moment has any renderable media (image, video, or carousel). */
function hasMedia(moment: ListingMomentItem): boolean {
  return Boolean(moment.image || moment.video || (moment.media && moment.media.length > 0))
}

export function buildMomentsViewerState(
  moments: ListingMomentItem[],
  momentId: string | number,
): { posts: FeedPost[]; index: number } | null {
  const clicked = moments.find((m) => m.id === momentId)
  if (!clicked || !hasMedia(clicked)) return null

  const authorMoments = moments.filter((m) => m.author === clicked.author && hasMedia(m))
  if (authorMoments.length === 0) return null

  const posts = authorMoments.map((m, i) => listingMomentToFeedPost(m, i))
  const index = authorMoments.findIndex((m) => m.id === momentId)
  if (index < 0) return null

  return { posts, index }
}
