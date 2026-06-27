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
})

export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

import type { EventTicketingMode } from './eventTicketing'
import { resolveTicketingMode } from './eventTicketing'

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
  }
}

export function buildEventFormData(state: EventFormState, coverFile: File | null, businessId?: number | null): FormData {
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
  if (coverFile) fd.append('cover_image', coverFile)
  if (businessId) fd.append('business', String(businessId))
  return fd
}

export function canSubmitEventForm(state: EventFormState): boolean {
  if (!state.title.trim() || !state.startsAt) return false
  if (state.ticketingMode === 'on_platform' && !state.price.trim()) return false
  if (state.ticketingMode === 'external' && !state.ticketUrl.trim()) return false
  return true
}
