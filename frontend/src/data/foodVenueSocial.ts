import { foodCoverSrc } from '../utils/foodDisplay'

export type VenuePhotoCategory = 'food' | 'interior' | 'menu' | 'exterior' | 'owner'

export type VenuePhoto = {
  id: number
  image: string
  caption?: string
  category: VenuePhotoCategory
  is_cover?: boolean
}

export type VenueReviewBreakdown = {
  food_quality: number
  service: number
  value: number
  atmosphere: number
}

export type VenueReview = {
  id: number
  author_name: string
  rating: number
  body: string
  created_at: string
}

export type VenueComment = {
  id: number
  author_name: string
  body: string
  created_at: string
}

export type DelversMoment = {
  id: number
  author_username: string
  body: string
  image: string | null
}

export type FoodVenueSocial = {
  photos: VenuePhoto[]
  review_breakdown: VenueReviewBreakdown
  reviews: VenueReview[]
  comments: VenueComment[]
  delvers_moments: DelversMoment[]
  comment_count: number
  delvers_post_count: number
}

type BaseVenue = {
  id: number
  name: string
  cuisine: string
  cover_image: string | null
  owner_username: string
  rating_avg?: string | null
  rating_count?: number | null
  popular_dish?: string | null
  tagline?: string | null
}

const GALLERY_POOL = {
  food: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80',
  ],
  interior: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
  ],
  menu: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
  ],
  exterior: [
    'https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80',
  ],
  owner: [
    'https://images.unsplash.com/photo-1577215197735-259b5d6d0b0e?auto=format&fit=crop&w=1200&q=80',
  ],
} as const

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

function buildPhotos(venue: BaseVenue): VenuePhoto[] {
  const cover = foodCoverSrc(venue.cover_image, venue.cuisine)
  const photos: VenuePhoto[] = [
    {
      id: venue.id * 100 + 1,
      image: cover,
      caption: `${venue.name} cover`,
      category: 'food',
      is_cover: true,
    },
  ]

  const categories: VenuePhotoCategory[] = ['food', 'interior', 'menu', 'exterior', 'owner']
  let pid = venue.id * 100 + 2
  for (const cat of categories) {
    const pool = GALLERY_POOL[cat]
    const src = pool[(venue.id + pid) % pool.length]
    if (cat === 'food' && photos[0].image === src) continue
    photos.push({
      id: pid++,
      image: src,
      caption: `${photoCategoryLabel(cat)} at ${venue.name}`,
      category: cat,
    })
    if (photos.length >= 8) break
  }

  return photos
}

function ratingBase(venue: BaseVenue): number {
  return parseFloat(venue.rating_avg ?? '4.5') || 4.5
}

function buildBreakdown(venue: BaseVenue): VenueReviewBreakdown {
  const base = ratingBase(venue)
  return {
    food_quality: Math.min(5, base + 0.2),
    service: Math.max(3.8, base - 0.1),
    value: Math.max(3.5, base - 0.2),
    atmosphere: Math.min(5, base + 0.1),
  }
}

function buildReviews(venue: BaseVenue): VenueReview[] {
  const dish = venue.popular_dish || 'the house special'
  return [
    {
      id: 1,
      author_name: 'Mila K.',
      rating: 5,
      body: `Great grill plate. Go before 7pm — it gets busy. Ask for ${dish.toLowerCase()}.`,
      created_at: '2026-05-28T14:00:00Z',
    },
    {
      id: 2,
      author_name: 'Jan N.',
      rating: 4,
      body: 'Solid food and friendly staff. Card accepted, but bring cash just in case.',
      created_at: '2026-05-20T11:30:00Z',
    },
    {
      id: 3,
      author_name: 'Tumi R.',
      rating: 5,
      body: `${venue.name} is worth the stop if you are passing through ${venue.name.includes('Coast') ? 'the coast' : 'town'}.`,
      created_at: '2026-05-12T18:45:00Z',
    },
  ]
}

function buildComments(venue: BaseVenue): VenueComment[] {
  return [
    {
      id: 1,
      author_name: 'Mila K.',
      body: 'Best to book if going after 6pm — the grill section fills up fast.',
      created_at: '2026-05-29T09:00:00Z',
    },
    {
      id: 2,
      author_name: 'Jan N.',
      body: 'They accept card, but bring cash just in case. Parking out front is easy.',
      created_at: '2026-05-25T16:20:00Z',
    },
    {
      id: 3,
      author_name: 'Sarah T.',
      body: `Is ${venue.name} open on Sundays? Planning a weekend stop.`,
      created_at: '2026-05-22T08:10:00Z',
    },
  ]
}

function buildDelversMoments(venue: BaseVenue, photos: VenuePhoto[]): DelversMoment[] {
  const userFood = photos.find((p) => p.category === 'food' && !p.is_cover)?.image ?? photos[0]?.image
  return [
    {
      id: 1,
      author_username: 'kako_explorer',
      body: venue.tagline || 'Lunch stop worth saving on the road.',
      image: userFood ?? null,
    },
    {
      id: 2,
      author_username: 'localfoodie',
      body: 'Ask for today\'s special — staff were super helpful.',
      image: null,
    },
    {
      id: 3,
      author_username: 'sara_t',
      body: `Sunset seats if you get here early. ${venue.popular_dish ? `Loved the ${venue.popular_dish.toLowerCase()}.` : ''}`,
      image: photos.find((p) => p.category === 'interior')?.image ?? null,
    },
  ]
}

export function enrichFoodVenueDetail<T extends BaseVenue>(venue: T): T & FoodVenueSocial {
  const photos = buildPhotos(venue)
  const comments = buildComments(venue)
  const delvers_moments = buildDelversMoments(venue, photos)

  return {
    ...venue,
    photos,
    review_breakdown: buildBreakdown(venue),
    reviews: buildReviews(venue),
    comments,
    delvers_moments,
    comment_count: comments.length + 31,
    delvers_post_count: delvers_moments.length + 15,
  }
}

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
