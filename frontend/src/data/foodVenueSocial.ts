import { foodCoverSrc } from '../utils/foodDisplay'

export type VenuePhotoCategory = 'food' | 'interior' | 'menu' | 'exterior' | 'owner'

export type VenuePhoto = {
  id: number
  image: string
  caption?: string
  category: VenuePhotoCategory
  is_cover?: boolean
  kind?: 'image' | 'video'
}

export type VenueReview = {
  id: number
  author_name: string
  rating: number
  body: string
  created_at: string
}

export type DelversMoment = {
  id: number
  author_username: string
  body: string
  image: string | null
}

const PHOTO_CATEGORY_LABELS: Record<VenuePhotoCategory, string> = {
  food: 'Food',
  interior: 'Interior',
  menu: 'Menu',
  exterior: 'Exterior',
  owner: 'Team',
}

export function photoCategoryLabel(cat: VenuePhotoCategory): string {
  return PHOTO_CATEGORY_LABELS[cat]
}

/**
 * Resolve a venue's gallery from real backend photos. When a venue has no
 * uploaded photos we fall back to its cover (or a cuisine placeholder) — no
 * fabricated stock galleries.
 */
export function resolveVenuePhotos(
  photos: VenuePhoto[] | undefined,
  coverImage: string | null,
  cuisine: string,
): VenuePhoto[] {
  if (photos?.length) return photos
  return [
    {
      id: 0,
      image: foodCoverSrc(coverImage, cuisine),
      category: 'food',
      is_cover: true,
    },
  ]
}
