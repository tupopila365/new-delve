import type { ReviewItem } from '../GuestReviewCard'

export type TourPackage = {
  id: string
  title: string
  hours: number
  price: string
  photo?: string | null
  description?: string
  photos?: string[]
  reviews?: ReviewItem[]
}
