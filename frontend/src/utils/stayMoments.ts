import { mediaUrl } from '../api/client'
import type { ListingMomentItem } from '../components/listing/types'

export type StayMomentPost = {
  id: number
  body: string
  image?: string | null
  video?: string | null
  author: { username: string; display_name?: string | null }
  listing?: { id: number; title: string } | null
}

export function postsToStayMoments(posts: StayMomentPost[], stayTitle: string): ListingMomentItem[] {
  return posts.map((post) => ({
    id: post.id,
    image: post.image ? mediaUrl(post.image) : post.video ? mediaUrl(post.video) : null,
    author: post.author.display_name?.trim() || post.author.username,
    body: post.body.trim() || 'Shared a moment',
    taggedListing: post.listing?.title || stayTitle,
  }))
}
