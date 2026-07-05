import type { SponsoredListingFeedItem } from './SponsoredListingFeedCard'

export type DelversFeedPost = {
  id: number
  author: { username: string; display_name: string; avatar?: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  delvers_board?: string
  liked_by_me: boolean
  saved_by_me: boolean
  fired_by_me?: boolean
  likes_count: number
  saves_count: number
  fires_count?: number
  comments_count?: number
  created_at?: string
  feed_item_type?: 'post'
  post_kind?: 'tip' | 'question'
  is_delvers?: boolean
  is_delvers_highlight?: boolean
  is_sponsored?: boolean
  sponsor_label?: string
  promotion_id?: number
  listing?: { id: number; title: string } | null
  event?: { id: number; title: string } | null
}

export type DelversFeedItem = DelversFeedPost | SponsoredListingFeedItem

export function isSponsoredListingItem(item: DelversFeedItem): item is SponsoredListingFeedItem {
  return item.feed_item_type === 'sponsored_listing'
}

export function isFeedPost(item: DelversFeedItem): item is DelversFeedPost {
  return !isSponsoredListingItem(item)
}

export function isDelversPin(item: DelversFeedPost): boolean {
  return (
    !item.is_delvers_highlight &&
    item.post_kind !== 'question' &&
    item.is_delvers !== false
  )
}
