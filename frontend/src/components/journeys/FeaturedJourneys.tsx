import { mockTrips } from '../../data/mockTrips'
import { loadUserTrips } from '../../data/userTrips'
import {
  dayLabel,
  formatJourneyCost,
  journeyAccentBadge,
  JOURNEY_DEFAULT_IMAGE,
  routeLabel,
} from '../../utils/journeyDisplay'
import { Featured, type FeaturedItem } from '../Featured'

export function FeaturedJourneys() {
  const trips = [...loadUserTrips(), ...mockTrips]
  const items: FeaturedItem[] = [...trips]
      .sort((a, b) => b.saves_count - a.saves_count || b.likes_count - a.likes_count)
      .slice(0, 8)
      .map((trip) => ({
        id: trip.id,
        title: trip.title,
        href: `/journeys/${trip.id}`,
        image: trip.cover_image,
        fallbackImage: JOURNEY_DEFAULT_IMAGE,
        eyebrow: journeyAccentBadge(trip) || 'Journey',
        location: routeLabel(trip),
        meta: `${dayLabel(trip.days)} · ${trip.stops.length} ${trip.stops.length === 1 ? 'stop' : 'stops'} · ${trip.author.display_name}`,
        price: formatJourneyCost(trip.total_cost, trip.currency),
        rating: trip.likes_count > 0 ? trip.likes_count : null,
      }))

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
