import type { ReactNode } from 'react'
import type { ReviewItem } from '../GuestReviewCard'

export type ListingGalleryItem = {
  id?: string | number
  src: string
  alt?: string
  caption?: string
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
  image?: string | null
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
