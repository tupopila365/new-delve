import type { HighlightChannelInput } from '../components/highlights/types'
import { normalizeHighlightsForSave } from '../components/highlights/highlightFormUtils'
import type { ListingPhotoDraft } from '../components/listing/photos/types'
import type { ListingGalleryMediaItem } from '../components/listing/photos/listingGalleryMedia'
import { photosFromListingGallery, serializeGalleryForApi } from '../components/listing/photos/listingPhotoUtils'
import type { EventTicketingMode } from './eventTicketing'
import { resolveTicketingMode } from './eventTicketing'

export type EventFormState = {
  title: string
  description: string
  category: string
  startsAt: string
  endsAt: string
  venue: string
  city: string
  region: string
  ticketingMode: 'free' | 'on_platform' | 'external'
  price: string
  ticketUrl: string
  capacity: string
  eventStories: HighlightChannelInput[]
}

export const emptyEventFormState = (region = ''): EventFormState => ({
  title: '',
  description: '',
  category: 'other',
  startsAt: '',
  endsAt: '',
  venue: '',
  city: '',
  region,
  ticketingMode: 'free',
  price: '',
  ticketUrl: '',
  capacity: '',
  eventStories: [],
})

export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function eventToFormState(
  event: {
    title: string
    description?: string | null
    category: string
    starts_at: string
    ends_at?: string | null
    venue?: string | null
    city?: string | null
    region?: string | null
    is_free?: boolean | null
    price?: string | null
    ticket_url?: string | null
    ticketing_mode?: EventTicketingMode | null
    capacity?: number | null
    event_stories?: HighlightChannelInput[]
  },
  fallbackRegion = '',
): EventFormState {
  const ticketingMode = resolveTicketingMode(event)
  return {
    title: event.title ?? '',
    description: event.description ?? '',
    category: event.category ?? 'other',
    startsAt: isoToDatetimeLocal(event.starts_at),
    endsAt: isoToDatetimeLocal(event.ends_at),
    venue: event.venue ?? '',
    city: event.city ?? '',
    region: event.region ?? fallbackRegion,
    ticketingMode,
    price: event.price ?? '',
    ticketUrl: event.ticket_url ?? '',
    capacity: event.capacity ? String(event.capacity) : '',
    eventStories: (event.event_stories ?? []).map((ch) => ({
      ...ch,
      slides: (ch.slides ?? []).map((s) => ({ ...s })),
    })),
  }
}

export function buildEventFormData(
  state: EventFormState,
  photos: ListingPhotoDraft[],
  resolved: { cover: string; gallery: ListingGalleryMediaItem[] },
  businessId?: number | null,
): FormData {
  const fd = new FormData()
  fd.append('title', state.title.trim())
  fd.append('description', state.description.trim())
  fd.append('category', state.category)
  fd.append('starts_at', new Date(state.startsAt).toISOString())
  if (state.endsAt) fd.append('ends_at', new Date(state.endsAt).toISOString())
  fd.append('venue', state.venue.trim())
  fd.append('city', state.city.trim())
  fd.append('region', state.region.trim())
  fd.append('is_published', 'true')
  fd.append('is_free', state.ticketingMode === 'free' ? 'true' : 'false')
  if (state.ticketingMode === 'on_platform' && state.price.trim()) fd.append('price', state.price.trim())
  if (state.ticketingMode === 'external') {
    if (state.price.trim()) fd.append('price', state.price.trim())
    if (state.ticketUrl.trim()) fd.append('ticket_url', state.ticketUrl.trim())
  }
  const cap = Number.parseInt(state.capacity.trim(), 10)
  if (state.capacity.trim() && Number.isFinite(cap) && cap > 0) fd.append('capacity', String(cap))
  const coverFile = photos[0]?.file ?? null
  if (coverFile) fd.append('cover_image', coverFile)
  fd.append('gallery_images', JSON.stringify(serializeGalleryForApi(resolved.gallery)))
  if (businessId) fd.append('business', String(businessId))
  fd.append('event_stories', JSON.stringify(normalizeHighlightsForSave(state.eventStories)))
  return fd
}

export function photosFromEvent(event: {
  cover_image?: string | null
  gallery_images?: unknown[] | null
}): ListingPhotoDraft[] {
  return photosFromListingGallery(event.cover_image, event.gallery_images)
}

export function canSubmitEventForm(state: EventFormState): boolean {
  if (!state.title.trim() || !state.startsAt) return false
  if (state.ticketingMode === 'on_platform' && !state.price.trim()) return false
  if (state.ticketingMode === 'external' && !state.ticketUrl.trim()) return false
  return true
}
