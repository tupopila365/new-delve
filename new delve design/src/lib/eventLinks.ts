import { eventPath } from '../navigation'

export function eventShareUrl(eventId: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${eventPath(eventId)}`
  }
  return eventPath(eventId)
}

export function mapsUrlForEvent(event: {
  latitude?: number | null
  longitude?: number | null
  locationName?: string | null
  city?: string | null
  country?: string | null
}): string | null {
  if (event.latitude != null && event.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`
  }
  const label = [event.locationName, event.city, event.country].filter(Boolean).join(', ')
  if (!label) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`
}
