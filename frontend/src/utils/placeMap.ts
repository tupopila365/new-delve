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

export function resolveMapUrl(options: {
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  mapUrl?: string | null
}): string {
  if (options.mapUrl?.trim()) return options.mapUrl.trim()
  if (hasValidCoords(options.latitude, options.longitude)) {
    return openStreetMapMarkerUrl(options.latitude, options.longitude)
  }
  return openStreetMapSearchUrl(options.address)
}
