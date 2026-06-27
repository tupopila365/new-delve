import { mediaUrl } from '../api/client'
import type { ListingMomentItem } from '../components/listing/types'

export type EventMomentPost = {
  id: number
  body: string
  image?: string | null
  video?: string | null
  author: { username: string; display_name?: string | null }
  event?: { id: number; title: string } | null
}

export function postsToEventMoments(posts: EventMomentPost[], eventTitle: string): ListingMomentItem[] {
  return posts.map((post) => ({
    id: post.id,
    image: post.image ? mediaUrl(post.image) : null,
    author: post.author.display_name?.trim() || post.author.username,
    body: post.body.trim() || 'Shared a moment',
    taggedListing: post.event?.title || eventTitle,
  }))
}
