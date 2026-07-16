import { apiFetch, asArray, mediaUrl } from '../api/client'
import type { PostMediaItem } from '../components/PostMedia'
import type { ListingMomentItem } from '../components/listing/types'

export type ListingMomentPost = {
  id: number
  body: string
  image?: string | null
  video?: string | null
  media?: PostMediaItem[] | null
  author: { username: string; display_name?: string | null }
  listing?: { id: number; title: string } | null
  event?: { id: number; title: string } | null
  vehicle_listing?: { id: number; title: string } | null
  bus_trip?: { id: number; title: string } | null
  food_venue?: { id: number; title: string } | null
  guide_profile?: { id: number; title: string } | null
}

/** Normalize carousel slides, resolving every image/video URL. */
function normalizeMomentMedia(media?: PostMediaItem[] | null): PostMediaItem[] | undefined {
  if (!media || media.length === 0) return undefined
  const slides = media
    .map((item) => ({
      order: item.order,
      kind: item.kind,
      image: item.image ? mediaUrl(item.image) : null,
      video: item.video ? mediaUrl(item.video) : null,
    }))
    .filter((item) => Boolean(item.image || item.video))
  return slides.length > 0 ? slides : undefined
}

/** First frame we can show as a thumbnail in the strip (image beats video). */
function momentThumb(post: ListingMomentPost, media?: PostMediaItem[]): string | null {
  if (post.image) return mediaUrl(post.image)
  const firstImage = media?.find((item) => item.image)?.image
  if (firstImage) return firstImage
  const firstVideo = media?.find((item) => item.video)?.video
  if (firstVideo) return firstVideo
  return post.video ? mediaUrl(post.video) : null
}

export function postsToListingMoments(
  posts: ListingMomentPost[],
  taggedTitle: string,
): ListingMomentItem[] {
  return posts.map((post) => {
    const media = normalizeMomentMedia(post.media)
    const thumb = momentThumb(post, media)
    const hasImageThumb = Boolean(post.image) || Boolean(media?.some((item) => item.kind === 'image' && item.image))
    return {
      id: post.id,
      image: thumb,
      kind: hasImageThumb ? 'image' : post.video || media?.some((item) => item.kind === 'video') ? 'video' : 'image',
      video: post.video ? mediaUrl(post.video) : null,
      media,
      author: post.author.display_name?.trim() || post.author.username,
      body: post.body.trim() || 'Shared a moment',
      taggedListing:
        post.listing?.title ||
        post.event?.title ||
        post.vehicle_listing?.title ||
        post.bus_trip?.title ||
        post.food_venue?.title ||
        post.guide_profile?.title ||
        taggedTitle,
    }
  })
}

export function listingMomentsApiPath(listingType: string, listingId: string): string | null {
  switch (listingType) {
    case 'accommodation':
      return `/api/accommodation/listings/${listingId}/moments/`
    case 'event':
      return `/api/events/${listingId}/moments/`
    case 'vehicle':
      return `/api/transport/vehicles/${listingId}/moments/`
    case 'bus_trip':
      return `/api/transport/bus/trips/${listingId}/moments/`
    case 'food':
      return `/api/food/venues/${listingId}/moments/`
    case 'guide':
      return `/api/guides/profiles/${listingId}/moments/`
    default:
      return null
  }
}

export function listingMomentsSupported(listingType: string): boolean {
  return listingMomentsApiPath(listingType, '0') !== null
}

export async function fetchListingMoments(
  listingType: string,
  listingId: string,
  taggedTitle: string,
): Promise<ListingMomentItem[]> {
  const path = listingMomentsApiPath(listingType, listingId)
  if (!path) return []
  const raw = await apiFetch<ListingMomentPost[] | unknown>(path, { auth: false })
  const posts = asArray<ListingMomentPost>(raw)
  return postsToListingMoments(posts, taggedTitle)
}
