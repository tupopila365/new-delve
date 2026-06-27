import { apiUrl } from '../api/client'

export type EventTicketingMode = 'free' | 'on_platform' | 'external'

export function resolveTicketingMode(event: {
  is_free?: boolean | null
  price?: string | null
  ticket_url?: string | null
  ticketing_mode?: EventTicketingMode | null
}): EventTicketingMode {
  if (event.ticketing_mode) return event.ticketing_mode
  if (event.is_free) return 'free'
  if ((event.ticket_url || '').trim()) return 'external'
  if ((event.price || '').trim()) return 'on_platform'
  return 'free'
}

/** Tracked redirect through the API (counts external ticket clicks). */
export function externalTicketHref(eventId: number | string): string {
  return apiUrl(`/api/events/${eventId}/ticket_redirect/`)
}

export async function trackExternalTicketClick(eventId: number | string): Promise<number | null> {
  try {
    const res = await fetch(apiUrl(`/api/events/${eventId}/track_ticket_click/`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { clicks?: number }
    return typeof data.clicks === 'number' ? data.clicks : null
  } catch {
    return null
  }
}
