import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'
import {
  dayLabel,
  formatJourneyCost,
  journeyAccentBadge,
  JOURNEY_DEFAULT_IMAGE,
  routeLabel,
} from '../../utils/journeyDisplay'
import { mapApiJourneyToTrip, type ApiJourney } from '../../utils/journeyApi'
import { Featured, type FeaturedItem } from '../Featured'

export function FeaturedJourneys() {
  const { data, isLoading } = useQuery({
    queryKey: ['journeys', 'featured'],
    queryFn: () => apiFetch<ApiJourney[]>('/api/journeys/?featured=1&limit=8', { auth: false }),
    staleTime: 60_000,
  })

  const items: FeaturedItem[] = (data ?? []).map((journey) => {
    const trip = mapApiJourneyToTrip(journey)
    return {
      id: trip.id,
      title: trip.title,
      href: `/journeys/${trip.id}`,
      image: trip.cover_image,
      fallbackImage: JOURNEY_DEFAULT_IMAGE,
      eyebrow: journey.is_featured ? 'Featured journey' : journeyAccentBadge(trip) || 'Journey',
      location: routeLabel(trip),
      meta: `${dayLabel(trip.days)} · ${trip.stops.length} ${trip.stops.length === 1 ? 'stop' : 'stops'} · ${trip.author.display_name}`,
      price: formatJourneyCost(trip.total_cost, trip.currency),
      rating: trip.likes_count > 0 ? trip.likes_count : null,
    }
  })

  if (isLoading) return null
  if (items.length === 0) return null

  return (
    <Featured
      title="Featured journeys"
      subtitle="Routes and stories travellers are saving for their next trip."
      items={items}
      emptyText="Featured journeys will appear here once travellers share routes."
    />
  )
}
