import { useQuery } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../../api/client'
import { Featured, type FeaturedItem } from '../Featured'

type Guide = {
  id: number
  headline: string
  bio?: string
  hourly_rate: string | null
  languages: string[]
  regions: string[]
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  specialities?: string[]
  licensed_guide?: boolean
  response_hours_typical?: number | null
  tour_packages?: unknown[]
}

const FALLBACK_GUIDE_PHOTO = '/images/default-journey.jpg'

function guideName(guide: Guide) {
  return guide.display_name?.trim() || guide.username
}

function priceLabel(rate: string | null) {
  if (!rate) return 'Rates on profile'
  return `From $${rate}/hr`
}

export function FeaturedGuides() {
  const { data, isLoading } = useQuery({
    queryKey: ['featured-guides-rail'],
    queryFn: () => apiFetch<Guide[]>('/api/guides/profiles/', { auth: false }),
    staleTime: 45_000,
  })

  const items: FeaturedItem[] = (data ?? []).slice(0, 8).map((guide) => {
    const regions = (guide.regions || []).slice(0, 2).join(' · ')
    const specs = (guide.specialities || []).slice(0, 2).join(' · ')
    const langs = (guide.languages || []).slice(0, 2).join(' · ')
    return {
      id: guide.id,
      title: guide.headline || guideName(guide),
      href: `/guides/${guide.id}`,
      image: mediaUrl(guide.photo) || FALLBACK_GUIDE_PHOTO,
      fallbackImage: FALLBACK_GUIDE_PHOTO,
      eyebrow: guide.licensed_guide ? 'Licensed guide' : guide.response_hours_typical != null && guide.response_hours_typical <= 3 ? 'Fast response' : 'Local expert',
      location: regions,
      meta: specs || langs || guideName(guide),
      price: priceLabel(guide.hourly_rate),
      rating: guide.rating_avg ? Number.parseFloat(guide.rating_avg).toFixed(1) : null,
    }
  })

  if (isLoading) return null

  return (
    <Featured
      title="Featured local guides"
      subtitle="Trusted guides, private experiences, and local experts travellers are checking."
      items={items}
      emptyText="Featured guides will appear here once local experts add profiles."
    />
  )
}
