export type ActivityMediaItem = {
  kind: 'image' | 'video'
  src: string
  caption?: string
}

export type ActivityListing = {
  id: number
  owner_username: string
  owner_display_name?: string | null
  owner_avatar?: string | null
  title: string
  description?: string
  tagline?: string | null
  category: string
  category_label?: string
  country_code?: string
  region?: string
  city?: string
  meeting_point?: string
  duration_hours?: string | number
  duration_label?: string
  price_from: string | number
  currency?: string
  price_note?: string | null
  price_label?: string
  max_group_size?: number | null
  min_age?: number | null
  languages?: string[]
  includes?: string[]
  excludes?: string[]
  phone?: string | null
  media_gallery?: ActivityMediaItem[]
  cover_image?: string | null
  cover_kind?: 'image' | 'video' | string | null
  rating_avg?: string | number | null
  rating_count?: number | null
  saved_by_me?: boolean
  saves_count?: number | null
  is_featured?: boolean
  is_active?: boolean
  created_at?: string
}

export type ActivityReview = {
  id: number
  name: string
  avatar?: string | null
  rating: number
  body: string
  seller_reply?: string
  seller_replied_at?: string
  media: { url: string; kind: 'image' | 'video' }[]
  verified_experience?: boolean
  created_at: string
}

export type ActivityReviewsPayload = {
  reviews: ActivityReview[]
  rating_avg: number
  rating_count: number
  distribution: Record<string, number>
  can_review: boolean
  has_reviewed: boolean
  is_owner: boolean
}

export const ACTIVITY_CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'drives', label: 'Drives & scenic tours' },
  { value: 'safari_wildlife', label: 'Safari & wildlife' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'water', label: 'Water activities' },
  { value: 'cultural', label: 'Cultural experiences' },
  { value: 'wellness', label: 'Wellness & nature' },
  { value: 'other', label: 'Other' },
] as const

export function activityLocationLine(a: Pick<ActivityListing, 'city' | 'region' | 'country_code'>): string {
  const parts = [a.city, a.region, a.country_code?.toUpperCase()].filter(Boolean)
  return parts.join(', ')
}

export function activityCover(a: ActivityListing): ActivityMediaItem | null {
  if (a.cover_image) {
    return {
      kind: a.cover_kind === 'video' ? 'video' : 'image',
      src: a.cover_image,
    }
  }
  const first = a.media_gallery?.[0]
  return first?.src ? { kind: first.kind === 'video' ? 'video' : 'image', src: first.src, caption: first.caption } : null
}

export function activityGallery(a: ActivityListing): ActivityMediaItem[] {
  const items = (a.media_gallery ?? []).filter((m) => Boolean(m?.src))
  if (items.length > 0) return items.map((m) => ({ ...m, kind: m.kind === 'video' ? 'video' : 'image' }))
  const cover = activityCover(a)
  return cover ? [cover] : []
}
