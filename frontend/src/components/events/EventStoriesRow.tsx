import { useMemo } from 'react'
import { ProviderStoriesRow, type ProviderStoryItem } from '../ProviderStoriesRow'
import {
  eventCoverSrc,
  eventLocationLine,
  formatEventDate,
  type EventListing,
} from '../../utils/eventDisplay'

type Props = {
  events: EventListing[]
  className?: string
}

function eventToStoryItem(event: EventListing): ProviderStoryItem | null {
  const cover = eventCoverSrc(event.cover_image, event.category)
  const when = formatEventDate(event.starts_at)
  const sub = [when.full, eventLocationLine(event)].filter(Boolean).join(' · ')

  return {
    id: String(event.id),
    label: event.title,
    channelLabel: event.title,
    explorePath: `/events/${event.id}`,
    coverSrc: cover,
    slides: [
      {
        id: `event-${event.id}`,
        kind: 'image',
        src: cover,
        headline: event.title,
        sub: sub || undefined,
        ctaPath: `/events/${event.id}`,
        ctaLabel: 'View event',
      },
    ],
  }
}

/** Event stories on the events page. */
export function EventStoriesRow({ events, className }: Props) {
  const items = useMemo(
    () => events.map(eventToStoryItem).filter((item): item is ProviderStoryItem => item != null),
    [events],
  )

  return (
    <ProviderStoriesRow
      items={items}
      ariaLabel="Event stories"
      ctaLabel="View event"
      className={className}
    />
  )
}
