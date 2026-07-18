import type { ListingDetailRow, ListingGalleryItem } from '../components/listing/types'
import type { HighlightChannelInput } from '../components/highlights/types'
import { mediaUrl } from '../api/client'
import { isVideoUrl, parseGalleryMediaList } from '../components/listing/photos/listingGalleryMedia'
import {
  categoryMeta,
  eventCoverSrc,
  eventLocationLine,
  eventPriceLabel,
  formatEventDate,
  organizerLabel,
  type EventListing,
} from './eventDisplay'

export type EventDetail = EventListing & {
  description: string
  address?: string | null
  ticket_url?: string | null
  capacity?: number | null
  business?: number | null
  event_stories?: HighlightChannelInput[]
}

export type EventListItem = Pick<
  EventDetail,
  'id' | 'title' | 'category' | 'starts_at' | 'venue' | 'city' | 'region' | 'cover_image' | 'cover_kind'
>

export type EventDateLong = {
  weekday: string
  date: string
  time: string
  day: string
  month: string
  gcalDate: string
  valid: boolean
}

export function formatEventDateLong(iso: string): EventDateLong {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return {
      weekday: 'Date TBA',
      date: 'Date TBA',
      time: 'Time TBA',
      day: '--',
      month: 'TBA',
      gcalDate: '',
      valid: false,
    }
  }
  return {
    weekday: d.toLocaleDateString('en-NA', { weekday: 'long' }),
    date: d.toLocaleDateString('en-NA', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
    day: d.toLocaleDateString('en-NA', { day: 'numeric' }),
    month: d.toLocaleDateString('en-NA', { month: 'short' }).toUpperCase(),
    gcalDate: d.toISOString().replace(/[-:]/g, '').split('.')[0],
    valid: true,
  }
}

export function eventTimeRange(event: Pick<EventDetail, 'starts_at' | 'ends_at'>): string {
  const start = formatEventDateLong(event.starts_at)
  const end = event.ends_at ? formatEventDateLong(event.ends_at) : null
  return end ? `${start.time} – ${end.time}` : start.time
}

export function admissionLabel(event: Pick<EventDetail, 'is_free' | 'price'>): string {
  if (event.is_free) return 'Free entry'
  if (event.price) return `N$${event.price}`
  return 'Price TBA'
}

export function buildGoogleCalendarUrl(event: EventDetail): string {
  const start = formatEventDateLong(event.starts_at)
  const end = event.ends_at ? formatEventDateLong(event.ends_at) : null
  const endDate = end?.gcalDate || start.gcalDate
  const location = [event.venue, event.city || event.region].filter(Boolean).join(', ')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start.gcalDate}/${endDate}`,
    details: event.description?.slice(0, 400) ?? '',
    location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export { openStreetMapSearchUrl, formatPlaceLine, hasValidCoords } from './placeMap'

export function eventCountdownLabel(startsAt: string): string | null {
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const diff = start.getTime() - now.getTime()
  if (diff <= 0) return 'Happening soon'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days === 1) return 'Starts tomorrow'
  if (days <= 14) return `Starts in ${days} days`
  if (days <= 45) return `Coming up in ${Math.ceil(days / 7)} weeks`
  return null
}

export function buildEventGalleryImages(event: EventDetail): ListingGalleryItem[] {
  const images: ListingGalleryItem[] = []
  const coverRaw = mediaUrl(event.cover_image) ?? (event.cover_image?.trim() || '')
  if (coverRaw) {
    images.push({
      id: 'cover',
      src: coverRaw,
      alt: event.title,
      kind: event.cover_kind === 'video' || isVideoUrl(coverRaw) ? 'video' : 'image',
    })
  } else {
    const fallback = eventCoverSrc(null, event.category)
    images.push({ id: 'cover', src: fallback, alt: event.title, kind: 'image' })
  }
  for (const [i, item] of parseGalleryMediaList(event.gallery_images).entries()) {
    const src = mediaUrl(item.url) ?? item.url
    if (!src || images.some((img) => img.src === src)) continue
    const kind = item.kind === 'video' || isVideoUrl(src) ? 'video' : 'image'
    images.push({ id: `gallery-${i}`, src, alt: event.title, kind })
  }
  return images
}

export function buildEventTrustHighlights(event: EventDetail): string[] {
  const items: string[] = ['Event on DELVE']
  if (event.is_free) items.push('Free entry')
  else if (event.price) items.push(`From N$${event.price}`)
  if (event.ticket_url?.trim()) items.push('Tickets available')
  if (event.capacity) items.push(`Up to ${event.capacity} attendees`)
  const countdown = eventCountdownLabel(event.starts_at)
  if (countdown) items.push(countdown)
  return items.slice(0, 4)
}

export function buildEventHighlights(event: EventDetail): string[] {
  const cat = categoryMeta(event.category)
  const items = [
    cat.label === 'Music' ? 'Live atmosphere' : 'Local experience',
    'Good for groups',
    'Family friendly',
    event.is_free ? 'Free entry' : 'Ticketed entry',
    cat.label === 'Food & drink' ? 'Food nearby' : null,
    cat.label === 'Sports' ? 'Outdoor energy' : null,
    cat.label === 'Culture' ? 'Creative performances' : null,
    cat.label === 'Business' ? 'Networking' : null,
  ].filter(Boolean) as string[]

  const unique: string[] = []
  for (const item of items) {
    if (!unique.includes(item)) unique.push(item)
    if (unique.length >= 5) break
  }
  return unique
}

export function buildEventDetailRows(event: EventDetail): ListingDetailRow[] {
  const start = formatEventDateLong(event.starts_at)
  const cat = categoryMeta(event.category)
  const cityLine = [event.city, event.region].filter(Boolean).join(', ')
  const rows: ListingDetailRow[] = [
    { id: 'date', label: 'Date', value: start.date },
    { id: 'time', label: 'Time', value: eventTimeRange(event) },
    { id: 'venue', label: 'Venue', value: event.venue?.trim() || 'Venue TBA' },
    { id: 'location', label: 'Location', value: cityLine || event.region || 'Location TBA' },
    { id: 'price', label: 'Price', value: admissionLabel(event) },
    { id: 'organizer', label: 'Organizer', value: organizerLabel(event) },
    { id: 'category', label: 'Category', value: cat.label },
  ]
  if (event.capacity) {
    rows.push({ id: 'capacity', label: 'Capacity', value: `Up to ${event.capacity} attendees` })
  }
  return rows
}

export {
  categoryMeta,
  eventCoverSrc,
  EVENT_DEFAULT_IMAGE,
  eventLocationLine,
  eventPriceLabel,
  formatEventDate,
  organizerLabel,
} from './eventDisplay'
