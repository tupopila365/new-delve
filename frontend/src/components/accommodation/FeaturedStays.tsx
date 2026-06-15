import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../../api/client'
import { Featured, type FeaturedItem } from '../Featured'

type Stay = {
  id: number
  title: string
  region: string
  city?: string | null
  price_per_night: string
  cover_image: string | null
  property_type?: string | null
  rating_avg?: string | null
}

const STAY_FALLBACK = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'

function typeLabel(value?: string | null) {
  if (!value) return 'Stay'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function FeaturedStays() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-stays-rail'],
    queryFn: () => apiFetch<Stay[]>('/api/accommodation/listings/?ordering=-created_at', { auth: false }),
    staleTime: 45_000,
  })

  const items: FeaturedItem[] = (data ?? []).slice(0, 8).map((stay) => ({
    id: stay.id,
    title: stay.title,
    href: `/accommodation/${stay.id}`,
    image: mediaUrl(stay.cover_image),
    fallbackImage: STAY_FALLBACK,
    eyebrow: typeLabel(stay.property_type),
    location: stay.city ? `${stay.city}, ${stay.region}` : stay.region,
    price: `From $${stay.price_per_night}`,
    rating: stay.rating_avg ? Number.parseFloat(stay.rating_avg).toFixed(1) : null,
  }))

  if (isLoading) return null

  return (
    <Featured
      title="Featured stays"
      subtitle="A quick look at places travellers are checking before opening details."
      items={items}
      emptyText="Featured stays will appear here once providers add listings."
    />
  )
}
