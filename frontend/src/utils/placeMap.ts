/** Shared place / maps helpers for listing detail and cards. */

export function formatPlaceLine(...parts: Array<string | null | undefined>): string {
  return parts.map((p) => (typeof p === 'string' ? p.trim() : '')).filter(Boolean).join(', ')
}

export function hasValidCoords(
  latitude?: number | null,
  longitude?: number | null,
): latitude is number {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  )
}

/** OpenStreetMap search by free-text place parts (city, venue, address, etc.). */
export function openStreetMapSearchUrl(...parts: Array<string | null | undefined>): string {
  const q = formatPlaceLine(...parts)
  if (!q) return ''
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`
}

/** Marker page for precise coordinates. */
export function openStreetMapMarkerUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
}

/** Embeddable map for precise coordinates (no API key). */
export function openStreetMapEmbedUrl(latitude: number, longitude: number, delta = 0.01): string {
  const minLon = longitude - delta
  const minLat = latitude - delta
  const maxLon = longitude + delta
  const maxLat = latitude + delta
  const bbox = [minLon, minLat, maxLon, maxLat].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`
}

/** Google Maps directions to a precise pin. */
export function googleMapsDirectionsUrl(
  latitude: number,
  longitude: number,
  label?: string | null,
): string {
  const destination =
    label?.trim() ?
      encodeURIComponent(`${label.trim()}@${latitude},${longitude}`)
    : `${latitude},${longitude}`
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

/** Google Maps place view / search for coordinates. */
export function googleMapsPlaceUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

export function resolveDirectionsUrl(options: {
  name?: string | null
  address?: string | null
  city?: string | null
  region?: string | null
  latitude?: number | null
  longitude?: number | null
}): string {
  if (hasValidCoords(options.latitude, options.longitude)) {
    const label = formatPlaceLine(options.name, options.address)
    return googleMapsDirectionsUrl(options.latitude!, options.longitude!, label || null)
  }
  const q = formatPlaceLine(options.name, options.address, options.city, options.region)
  if (!q) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function resolveMapUrl(options: {
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  mapUrl?: string | null
  preferGoogle?: boolean
}): string {
  if (options.mapUrl?.trim()) return options.mapUrl.trim()
  if (options.preferGoogle !== false && hasValidCoords(options.latitude, options.longitude)) {
    return googleMapsPlaceUrl(options.latitude!, options.longitude!)
  }
  if (hasValidCoords(options.latitude, options.longitude)) {
    return openStreetMapMarkerUrl(options.latitude, options.longitude)
  }
  return openStreetMapSearchUrl(options.address)
}

export function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}
