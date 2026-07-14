import type { QueryClient } from '@tanstack/react-query'
import type { FeedPost } from '../components/IgPostCard'
import {
  type DelversFeedItem,
  type DelversFeedPost,
  isFeedPost,
} from '../components/social/delversFeedTypes'

type InvalidateSocialOptions = {
  username?: string
  accommodationStories?: boolean
  listingId?: number
  eventId?: number
  vehicleListingId?: number
  busTripId?: number
  foodVenueId?: number
  /**
   * Skip invalidating the main feed keys the user is looking at. Use after an
   * optimistic prepend / reconcile so we don't flash a refetch.
   */
  skipFeeds?: boolean
}

/** Map a create-API FeedPost into the Delvers feed card shape. */
export function feedPostToDelversItem(post: FeedPost): DelversFeedPost {
  return {
    id: post.id,
    author: post.author,
    body: post.body,
    region: post.region,
    image: post.image,
    video: post.video,
    media: post.media,
    delvers_board: post.delvers_board,
    liked_by_me: post.liked_by_me,
    saved_by_me: post.saved_by_me,
    likes_count: post.likes_count,
    saves_count: post.saves_count,
    comments_count: post.comments_count,
    created_at: post.created_at,
    feed_item_type: 'post',
    post_kind: post.post_kind,
    is_delvers: post.is_delvers,
    is_delvers_highlight: post.is_delvers_highlight,
    listing: post.listing ?? null,
    event: post.event ?? null,
    processing_status: post.processing_status ?? 'ready',
    processing_error: post.processing_error ?? '',
  }
}

/** Build a temporary Delvers feed card shown before the create POST returns. */
export function buildOptimisticDelversPost(input: {
  tempId: number
  body: string
  region: string
  image: string | null
  video: string | null
  author: { username: string; display_name: string; avatar?: string | null }
  is_delvers?: boolean
  is_delvers_highlight?: boolean
  delvers_board?: string
  processing_status?: 'ready' | 'processing' | 'failed'
}): DelversFeedPost {
  return {
    id: input.tempId,
    author: input.author,
    body: input.body,
    region: input.region,
    image: input.image,
    video: input.video,
    liked_by_me: false,
    saved_by_me: false,
    likes_count: 0,
    saves_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString(),
    feed_item_type: 'post',
    is_delvers: input.is_delvers ?? true,
    is_delvers_highlight: input.is_delvers_highlight ?? false,
    delvers_board: input.delvers_board,
    processing_status: input.processing_status ?? 'ready',
  }
}

export function prependOptimisticDelversPost(qc: QueryClient, post: DelversFeedPost): void {
  qc.setQueriesData<DelversFeedItem[]>({ queryKey: ['delvers-social'] }, (old) => {
    if (!old) return [post]
    if (old.some((item) => isFeedPost(item) && item.id === post.id)) return old
    return [post, ...old]
  })
  qc.setQueriesData<FeedPost[]>({ queryKey: ['feed'] }, (old) => {
    if (!old) return [post as unknown as FeedPost]
    if (old.some((item) => item.id === post.id)) return old
    return [post as unknown as FeedPost, ...old]
  })
}

export function reconcileOptimisticPost(
  qc: QueryClient,
  tempId: number,
  serverPost: FeedPost,
): void {
  const item = feedPostToDelversItem(serverPost)
  qc.setQueriesData<DelversFeedItem[]>({ queryKey: ['delvers-social'] }, (old) => {
    if (!old) return [item]
    const withoutTemp = old.filter((row) => !(isFeedPost(row) && row.id === tempId))
    if (withoutTemp.some((row) => isFeedPost(row) && row.id === item.id)) return withoutTemp
    return [item, ...withoutTemp]
  })
  qc.setQueriesData<FeedPost[]>({ queryKey: ['feed'] }, (old) => {
    if (!old) return [serverPost]
    const withoutTemp = old.filter((row) => row.id !== tempId)
    if (withoutTemp.some((row) => row.id === serverPost.id)) return withoutTemp
    return [serverPost, ...withoutTemp]
  })
}

export function removeOptimisticPost(qc: QueryClient, tempId: number): void {
  qc.setQueriesData<DelversFeedItem[]>({ queryKey: ['delvers-social'] }, (old) =>
    (old ?? []).filter((row) => !(isFeedPost(row) && row.id === tempId)),
  )
  qc.setQueriesData<FeedPost[]>({ queryKey: ['feed'] }, (old) =>
    (old ?? []).filter((row) => row.id !== tempId),
  )
}

/** Invalidate React Query caches after creating or heavily mutating social posts. */
export async function invalidateSocialCaches(
  qc: QueryClient,
  options: InvalidateSocialOptions = {},
): Promise<void> {
  const tasks: Promise<unknown>[] = []

  if (!options.skipFeeds) {
    tasks.push(
      qc.invalidateQueries({ queryKey: ['delvers-social'] }),
      qc.invalidateQueries({ queryKey: ['delvers-highlights'] }),
      qc.invalidateQueries({ queryKey: ['home-delvers-preview'] }),
      qc.invalidateQueries({ queryKey: ['home-community-questions'] }),
      qc.invalidateQueries({ queryKey: ['feed'] }),
      qc.invalidateQueries({ queryKey: ['delvers'] }),
    )
  } else {
    tasks.push(
      qc.invalidateQueries({ queryKey: ['home-delvers-preview'] }),
      qc.invalidateQueries({ queryKey: ['home-community-questions'] }),
    )
  }

  if (options.accommodationStories) {
    tasks.push(qc.invalidateQueries({ queryKey: ['accommodation-stories'] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['provider-accommodation-stories'] }))
  }

  if (options.listingId) {
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'accommodation', String(options.listingId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['stay-moments', String(options.listingId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'accommodation', String(options.listingId)] }))
  }

  if (options.eventId) {
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'event', String(options.eventId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['event-moments', String(options.eventId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'event', String(options.eventId)] }))
  }

  if (options.vehicleListingId) {
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'vehicle', String(options.vehicleListingId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'transport', String(options.vehicleListingId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['veh', String(options.vehicleListingId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['vehicle-reviews', options.vehicleListingId] }))
  }

  if (options.busTripId) {
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'bus_trip', String(options.busTripId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'transport', String(options.busTripId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['trip', String(options.busTripId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['bus-trip-reviews', options.busTripId] }))
  }

  if (options.foodVenueId) {
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-moments', 'food', String(options.foodVenueId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['listing-see-all', 'food', String(options.foodVenueId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['food', String(options.foodVenueId)] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['food-reviews', options.foodVenueId] }))
  }

  if (options.username) {
    tasks.push(qc.invalidateQueries({ queryKey: ['public-profile', options.username] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['user-posts', options.username] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['user-saved', options.username] }))
  }

  await Promise.all(tasks)
}

type EngagementOptions = {
  authorUsername?: string
  savedByUsername?: string
  queryKey?: unknown[]
  /**
   * Skip invalidating the feeds the user is currently looking at. Use this for
   * like/save/fire toggles: the optimistic update already reflects the change,
   * and refetching the feed here causes reorder/flicker and can momentarily
   * reset the toggle if the write hasn't propagated to a read replica yet.
   */
  skipFeeds?: boolean
}

/** Invalidate feeds and optional profile caches after like/save/comment. */
export async function invalidatePostEngagementCaches(
  qc: QueryClient,
  options: EngagementOptions = {},
): Promise<void> {
  const tasks: Promise<unknown>[] = []

  if (options.queryKey?.length) {
    tasks.push(qc.invalidateQueries({ queryKey: options.queryKey }))
  } else if (!options.skipFeeds) {
    tasks.push(
      qc.invalidateQueries({ queryKey: ['delvers-social'] }),
      qc.invalidateQueries({ queryKey: ['delvers-highlights'] }),
      qc.invalidateQueries({ queryKey: ['feed'] }),
      qc.invalidateQueries({ queryKey: ['delvers'] }),
    )
  }

  if (options.authorUsername) {
    tasks.push(qc.invalidateQueries({ queryKey: ['public-profile', options.authorUsername] }))
    tasks.push(qc.invalidateQueries({ queryKey: ['user-posts', options.authorUsername] }))
  }
  if (options.savedByUsername) {
    tasks.push(qc.invalidateQueries({ queryKey: ['user-saved', options.savedByUsername] }))
  }

  await Promise.all(tasks)
}
