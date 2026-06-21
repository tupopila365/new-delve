import {
  categoryMeta,
  eventCoverSrc,
  EVENT_DEFAULT_IMAGE,
  eventLocationLine,
  eventPriceLabel,
  formatEventDate,
  type EventListing,
} from '../../utils/eventDisplay'
import { Featured, type FeaturedItem } from '../Featured'
import { FEATURED_API, useFeaturedPlacement } from '../../hooks/useFeaturedPlacement'
import { partnerBadgeFields } from '../../utils/featuredPartner'

export function FeaturedEvents() {
  const { data, isLoading } = useFeaturedPlacement<EventListing>('featured-events-rail', FEATURED_API.events)

  const items: FeaturedItem[] = (data ?? []).map((event) => {
    const when = formatEventDate(event.starts_at)
    const cat = categoryMeta(event.category)
    return {
      id: event.id,
      title: event.title,
      href: `/events/${event.id}`,
      image: eventCoverSrc(event.cover_image, event.category),
      fallbackImage: EVENT_DEFAULT_IMAGE,
      ...partnerBadgeFields(event, event.is_free ? 'Free event' : cat.label),
      location: eventLocationLine(event),
      meta: `${when.full} · ${when.time}`,
      price: eventPriceLabel(event) ?? 'View details',
      rating: event.likes_count && event.likes_count > 0 ? event.likes_count : null,
    }
  })

  if (isLoading) return null

  return (
    <Featured
      title="Featured events"
      subtitle="Markets, music, culture nights, and local gatherings happening soon."
      items={items}
      emptyText="Featured events will appear here once organizers add listings."
    />
  )
}
