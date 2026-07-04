import { apiFetch, asArray, mediaUrl } from '../api/client'
import type { ListingMomentItem } from '../components/listing/types'

export type ListingMomentPost = {
  id: number
  body: string
  image?: string | null
  video?: string | null
  author: { username: string; display_name?: string | null }
  listing?: { id: number; title: string } | null
  event?: { id: number; title: string } | null
  vehicle_listing?: { id: number; title: string } | null
  bus_trip?: { id: number; title: string } | null
  food_venue?: { id: number; title: string } | null
}

export function postsToListingMoments(
  posts: ListingMomentPost[],
  taggedTitle: string,
): ListingMomentItem[] {
  return posts.map((post) => ({
    id: post.id,
    image: post.image
      ? mediaUrl(post.image)
      : post.video
        ? mediaUrl(post.video)
        : null,
    author: post.author.display_name?.trim() || post.author.username,
    body: post.body.trim() || 'Shared a moment',
    taggedListing:
      post.listing?.title ||
      post.event?.title ||
      post.vehicle_listing?.title ||
      post.bus_trip?.title ||
      post.food_venue?.title ||
      taggedTitle,
  }))
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
