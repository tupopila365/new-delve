import type { FeedPost } from '../components/IgPostCard'

export type ProfilePostFilter = 'all' | 'delvers' | 'community'

export function isDelversPost(post: FeedPost): boolean {
  return Boolean(post.is_delvers) && !post.is_accommodation_story
}

export function isCommunityFeedPost(post: FeedPost): boolean {
  return !post.is_delvers && !post.is_accommodation_story
}

export function isCommunityTipPost(post: FeedPost): boolean {
  if (!isCommunityFeedPost(post)) return false
  const board = (post.delvers_board || '').trim().toLowerCase()
  if (board.includes('tip')) return true
  return !post.image && !post.video
}

export function filterProfilePosts(posts: FeedPost[], filter: ProfilePostFilter): FeedPost[] {
  switch (filter) {
    case 'delvers':
      return posts.filter(isDelversPost)
    case 'community':
      return posts.filter(isCommunityFeedPost)
    default:
      return posts.filter((post) => !post.is_accommodation_story)
  }
}
