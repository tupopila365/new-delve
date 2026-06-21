import { foodCoverSrc } from '../../utils/foodDisplay'
import { Featured, type FeaturedItem } from '../Featured'
import { FEATURED_API, useFeaturedPlacement } from '../../hooks/useFeaturedPlacement'
import { partnerBadgeFields } from '../../utils/featuredPartner'

type FoodVenue = {
  id: number
  name: string
  cuisine: string
  region: string
  city?: string | null
  price_level: number
  cover_image: string | null
  rating_avg?: string | null
  rating_count?: number | null
  is_open?: boolean | null
  popular_dish?: string | null
  is_featured_partner?: boolean
  partner_label?: string
}

function cuisineLabel(value?: string | null) {
  if (!value) return 'Food spot'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function priceLabel(level: number) {
  return '$'.repeat(Math.max(1, Math.min(4, level || 1)))
}

export function FeaturedFood() {
  const { data, isLoading } = useFeaturedPlacement<FoodVenue>('featured-food-rail', FEATURED_API.food)

  const items: FeaturedItem[] = (data ?? []).map((venue) => ({
    id: venue.id,
    title: venue.name,
    href: `/food/${venue.id}`,
    image: foodCoverSrc(venue.cover_image, venue.cuisine),
    fallbackImage: foodCoverSrc(null, venue.cuisine),
    ...partnerBadgeFields(venue, venue.is_open === true ? 'Open now' : cuisineLabel(venue.cuisine)),
    location: venue.city ? `${venue.city}, ${venue.region}` : venue.region,
    meta: venue.popular_dish ? `Known for ${venue.popular_dish}` : cuisineLabel(venue.cuisine),
    price: `${priceLabel(venue.price_level)} typical`,
    rating: venue.rating_avg ? Number.parseFloat(venue.rating_avg).toFixed(1) : null,
  }))

  if (isLoading) return null

  return (
    <Featured
      title="Featured food & drinks"
      subtitle="Popular restaurants, cafés, bars, and local food spots."
      items={items}
      emptyText="Featured food spots will appear here once providers add listings."
    />
  )
}
