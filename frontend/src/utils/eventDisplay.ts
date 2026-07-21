import type { LucideIcon } from 'lucide-react'
import {
  BriefcaseBusiness,
  Landmark,
  Music,
  Ticket,
  Trophy,
  Utensils,
} from 'lucide-react'
import { mediaUrl } from '../api/client'
import {
  isVideoUrl,
  parseGalleryMediaList,
} from '../components/listing/photos/listingGalleryMedia'

export type EventListing = {
  id: number
  title: string
  category: string
  starts_at: string
  ends_at?: string | null
  venue: string
  region: string
  city?: string | null
  cover_image: string | null
  cover_kind?: 'image' | 'video' | null
  gallery_images?: unknown[]
  business?: number | null
  business_name?: string | null
  business_slug?: string | null
  organizer_username?: string
  organizer_display_name?: string | null
  is_free?: boolean | null
  price?: string | null
  likes_count?: number
  saves_count?: number
  comments_count?: number
  attending_by_me?: boolean
  rsvp_count?: number
  liked_by_me?: boolean
  saved_by_me?: boolean
  external_ticket_clicks?: number
  is_featured_partner?: boolean
  partner_label?: string
}

export type EventDateParts = {
  day: string
  month: string
  weekday: string
  time: string
  full: string
  valid: boolean
}

const EVENT_IMAGE_BY_CATEGORY: Record<string, string> = {
  music: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba7331?auto=format&fit=crop&w=1200&q=80',
  culture: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80',
  business: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80',
  other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
}

export const EVENT_DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80'

export const CATEGORY_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'music', label: 'Music', Icon: Music },
  { value: 'sports', label: 'Sports', Icon: Trophy },
  { value: 'culture', label: 'Culture', Icon: Landmark },
  { value: 'business', label: 'Business', Icon: BriefcaseBusiness },
  { value: 'food', label: 'Foodies', Icon: Utensils },
  { value: 'other', label: 'Other', Icon: Ticket },
]

export function categoryMeta(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value) ?? { value, label: value, Icon: Ticket }
}

export function eventCoverSrc(coverImage: string | null | undefined, category: string): string {
  const resolved = mediaUrl(coverImage)
  if (resolved) return resolved
  return EVENT_IMAGE_BY_CATEGORY[category] ?? EVENT_DEFAULT_IMAGE
}

export type EventPreviewMedia = {
  kind: 'image' | 'video'
  src: string
}

/** Prefer video (cover or gallery) for feed autoplay; otherwise a still image. */
export function eventPreviewMedia(
  event: Pick<EventListing, 'cover_image' | 'cover_kind' | 'gallery_images' | 'category'>,
): EventPreviewMedia {
  const coverRaw = mediaUrl(event.cover_image) ?? (event.cover_image?.trim() || '')
  if (coverRaw && (event.cover_kind === 'video' || isVideoUrl(coverRaw))) {
    return { kind: 'video', src: coverRaw }
  }

  const gallery = parseGalleryMediaList(event.gallery_images)
  for (const item of gallery) {
    const src = mediaUrl(item.url) ?? item.url
    if (!src) continue
    if (item.kind === 'video' || isVideoUrl(src)) {
      return { kind: 'video', src }
    }
  }

  if (coverRaw && !isVideoUrl(coverRaw)) {
    return { kind: 'image', src: coverRaw }
  }

  for (const item of gallery) {
    const src = mediaUrl(item.url) ?? item.url
    if (src && !isVideoUrl(src)) {
      return { kind: 'image', src }
    }
  }

  return {
    kind: 'image',
    src: EVENT_IMAGE_BY_CATEGORY[event.category] ?? EVENT_DEFAULT_IMAGE,
  }
}

/**
 * Match API `when=weekend`: upcoming Sat 00:00 → Mon 00:00 (exclusive), local time.
 * Backend uses Django localtime with weekday Mon=0 … Sun=6.
 */
export function isUpcomingWeekendEvent(startsAt: string, now = new Date()): boolean {
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return false
  const pyWeekday = (now.getDay() + 6) % 7 // Mon=0 … Sun=6
  const daysUntilSat = (5 - pyWeekday + 7) % 7
  const sat = new Date(now)
  sat.setHours(0, 0, 0, 0)
  sat.setDate(sat.getDate() + daysUntilSat)
  const mon = new Date(sat)
  mon.setDate(mon.getDate() + 2)
  const t = start.getTime()
  return t >= sat.getTime() && t < mon.getTime()
}

export function formatEventDate(iso: string): EventDateParts {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return {
      day: 'TBA',
      month: 'DATE',
      weekday: 'Date TBA',
      time: 'Time TBA',
      full: 'Date TBA',
      valid: false,
    }
  }
  return {
    day: d.toLocaleDateString('en-NA', { day: 'numeric' }),
    month: d.toLocaleDateString('en-NA', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-NA', { weekday: 'short' }),
    time: d.toLocaleTimeString('en-NA', { hour: '2-digit', minute: '2-digit' }),
    full: d.toLocaleDateString('en-NA', { weekday: 'short', day: 'numeric', month: 'short' }),
    valid: true,
  }
}

export function eventLocationLine(event: Pick<EventListing, 'venue' | 'city' | 'region'>): string {
  return [event.venue || 'Venue TBA', event.city || event.region].filter(Boolean).join(', ')
}

export function eventPriceLabel(event: Pick<EventListing, 'is_free' | 'price'>): string | null {
  if (event.is_free) return 'Free entry'
  if (event.price) return `From N$${event.price}`
  return null
}

export function eventAccentBadge(event: Pick<EventListing, 'category' | 'is_free'>): string {
  if (event.is_free) return 'Free'
  return categoryMeta(event.category).label
}

export function organizerLabel(event: Pick<EventListing, 'organizer_display_name' | 'organizer_username'>): string {
  return event.organizer_display_name?.trim() || event.organizer_username || 'Event organizer'
}
