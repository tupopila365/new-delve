import type { LucideIcon } from 'lucide-react'
import {
  Clock,
  Coffee,
  Croissant,
  Fish,
  Flame,
  MapPin,
  Phone,
  Sandwich,
  Soup,
  Truck,
  Utensils,
  Wine,
} from 'lucide-react'
import type { ReviewItem } from '../components/GuestReviewCard'
import type { ListingDetailRow, ListingGalleryItem } from '../components/listing/types'
import { mediaUrl } from '../api/client'
import { foodCoverSrc } from './foodDisplay'
import type { VenueStoryChannelInput } from '../components/food/stories/types'
import type { DelversMoment, VenuePhoto, VenueReview } from '../data/foodVenueSocial'
import { resolveVenuePhotos } from '../data/foodVenueSocial'

const CUISINE_LABELS: Record<string, string> = {
  local: 'Local cuisine',
  grill: 'Grill',
  seafood: 'Seafood',
  cafe: 'Café',
  bakery: 'Bakery',
  pizza: 'Pizza',
  asian: 'Asian',
  fast_food: 'Fast food',
  bar: 'Bar & drinks',
  vegan: 'Vegan / vegetarian',
  international: 'International',
  other: 'Restaurant',
}

const CUISINE_ICONS: Record<string, LucideIcon> = {
  local: Utensils,
  grill: Flame,
  seafood: Fish,
  cafe: Coffee,
  bakery: Croissant,
  pizza: Utensils,
  asian: Soup,
  fast_food: Sandwich,
  bar: Wine,
  vegan: Utensils,
  international: Utensils,
  other: Utensils,
}

export type FoodVenueListing = {
  id: number
  name: string
  description: string
  cuisine: string
  region: string
  city?: string | null
  address?: string | null
  price_level: number
  cover_image: string | null
  owner_username: string
  owner_display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  has_reviewed?: boolean
  can_review?: boolean
  saved_by_me?: boolean
  saves_count?: number
  phone?: string | null
  website?: string | null
  opening_hours?: string | null
  is_open?: boolean | null
  tagline?: string | null
  popular_dish?: string | null
  dine_in?: boolean | null
  takeaway?: boolean | null
  delivery?: boolean | null
  reservations?: boolean | null
  amenities?: string[]
  photos?: VenuePhoto[]
  reviews?: VenueReview[]
  delvers_moments?: DelversMoment[]
  /** Provider-defined Instagram-style highlight channels (our story, menu, custom, etc.). */
  venue_stories?: VenueStoryChannelInput[]
}

export function cuisineLabel(value: string): string {
  return CUISINE_LABELS[value] ?? value.replace(/_/g, ' ')
}

export function cuisineIcon(value: string): LucideIcon {
  return CUISINE_ICONS[value] ?? Utensils
}

export function priceLevelLabel(level: number): string {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)))
}

export function priceLevelName(level: number): string {
  return ['', 'Budget', 'Mid-range', 'Upscale', 'Fine dining'][Math.min(4, level || 1)] ?? ''
}

export { openStreetMapSearchUrl, formatPlaceLine, hasValidCoords } from './placeMap'

export function buildFoodGalleryImages(venue: FoodVenueListing): ListingGalleryItem[] {
  const photos = resolveVenuePhotos(venue.photos, venue.cover_image, venue.cuisine)
  if (photos.length === 0) {
    const fallback = foodCoverSrc(venue.cover_image, venue.cuisine)
    return [{ src: fallback, alt: venue.name }]
  }
  return photos.map((p) => ({
    src: mediaUrl(p.image) || p.image,
    alt: p.caption || venue.name,
  }))
}

export function buildFoodHighlights(venue: FoodVenueListing): string[] {
  const items: string[] = []
  if (venue.popular_dish?.trim()) items.push(venue.popular_dish.trim())
  if (venue.rating_avg && parseFloat(venue.rating_avg) >= 4.4) items.push('Local favourite')
  if (venue.reservations) items.push('Reservations welcome')
  if (venue.dine_in) items.push('Dine in')
  if (venue.takeaway) items.push('Takeaway')
  if (venue.delivery) items.push('Delivery')
  const fill = ['Signature plates', 'Worth a detour', 'Traveller pick']
  for (const t of fill) {
    if (items.length >= 4) break
    if (!items.includes(t)) items.push(t)
  }
  return items.slice(0, 4)
}

export function buildFoodAmenities(venue: FoodVenueListing): string[] {
  const features = [
    venue.dine_in ? 'Dine in' : null,
    venue.takeaway ? 'Takeaway' : null,
    venue.delivery ? 'Delivery' : null,
    venue.reservations ? 'Reservations' : null,
  ].filter(Boolean) as string[]
  const extra = venue.amenities ?? []
  return [...new Set([...features, ...extra])]
}

export function buildFoodPolicyRows(venue: FoodVenueListing): ListingDetailRow[] {
  const rows: ListingDetailRow[] = []
  if (venue.opening_hours?.trim()) {
    const lines = venue.opening_hours.split('\n').map((l) => l.trim()).filter(Boolean)
    rows.push({
      id: 'hours',
      label: 'Opening hours',
      value: lines.join(' · '),
    })
  }
  if (venue.phone?.trim()) {
    rows.push({
      id: 'phone',
      label: 'Phone',
      value: venue.phone.trim(),
    })
  }
  if (venue.address?.trim()) {
    rows.push({
      id: 'address',
      label: 'Address',
      value: venue.address.trim(),
    })
  }
  return rows
}

export function normalizeFoodReviews(raw: VenueReview[] | undefined, venueName: string): ReviewItem[] {
  if (!raw?.length) return []
  return raw.map((r) => ({
    name: r.author_name,
    place: venueName,
    rating: r.rating,
    body: r.body,
    avatar: null,
  }))
}

export function buildFoodTrustHighlights(venue: FoodVenueListing): string[] {
  const items: string[] = []
  if (venue.is_open === true) items.push('Open now')
  if (venue.is_open === false) items.push('Closed')
  items.push('Verified listing')
  if (venue.reservations) items.push('Reservations')
  return items
}
