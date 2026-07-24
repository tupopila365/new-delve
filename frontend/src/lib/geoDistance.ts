/** Great-circle distance helpers for “near me” / distance sort (no Maps API required). */

import { parseCoord } from '../utils/placeMap'

const EARTH_RADIUS_KM = 6371

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function listingDistanceKm(
  origin: { latitude: number; longitude: number },
  listing: { latitude?: unknown; longitude?: unknown },
): number | null {
  const lat = parseCoord(listing.latitude)
  const lng = parseCoord(listing.longitude)
  if (lat == null || lng == null) return null
  return haversineKm(origin.latitude, origin.longitude, lat, lng)
}

/** Human distance label, e.g. "350 m" or "2.4 km". */
export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null
  if (km < 0.05) return 'Here'
  if (km < 1) return `${Math.max(50, Math.round(km * 1000))} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function compareByDistance(
  aKm: number | null,
  bKm: number | null,
): number {
  if (aKm == null && bKm == null) return 0
  if (aKm == null) return 1
  if (bKm == null) return -1
  return aKm - bKm
}
