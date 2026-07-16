import type { ReactNode } from 'react'
import type { ReviewItem } from '../GuestReviewCard'
import type { PostMediaItem } from '../PostMedia'

export type ListingLabelItem = {
  id?: string | number
  label: string
  icon?: ReactNode
}

export type ListingQuickChip = {
  id?: string | number
  label: string
  icon?: ReactNode
  accent?: boolean
}

export type ListingRoomOption = {
  id?: string | number
  name: string
  description?: string | null
  maxGuests?: number | null
  bedrooms?: number | null
  bedSummary?: string | null
  pricePerNight?: string | null
  compareAtPrice?: string | null
  fallbackPrice?: string | null
  image?: string | null
  images?: ListingGalleryItem[]
  badge?: string | null
  featured?: boolean
  bookHref: string
}

export type ListingGalleryItem = {
  id?: string | number
  src: string
  alt?: string
  caption?: string
  kind?: 'image' | 'video'
}

export type ListingDetailRow = {
  id?: string | number
  label: string
  value: string
  icon?: ReactNode
}

export type ListingFaqItem = {
  id?: string | number
  question: string
  answer: string
}

export type ListingMomentItem = {
  id: string | number
  /** Thumbnail source for the strip (first image, or video poster/URL). */
  image?: string | null
  /** Whether this shared post's primary media is a video or an image. */
  kind?: 'image' | 'video'
  /** Single video source (when the post is a lone clip). */
  video?: string | null
  /** Carousel slides when the shared post has multiple images/videos. */
  media?: PostMediaItem[]
  author: string
  body: string
  taggedListing?: string
}

export type ListingGalleryPageState = {
  title: string
  images: ListingGalleryItem[]
  backTo?: string
}

export type ListingMomentsPageState = {
  title: string
  moments: ListingMomentItem[]
  backTo?: string
}

export type ListingReviewsPageState = {
  title: string
  reviews: ReviewItem[]
  rating?: string | number | null
  count?: number | null
  backTo?: string
}
