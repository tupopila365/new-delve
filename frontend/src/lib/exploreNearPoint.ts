/** Reference point for “Near me” / distance sort inside Explore destination. */

export const EXPLORE_NEAR_POINT_STORAGE_KEY = 'delve_explore_near_point'
export const EXPLORE_NEAR_CHANGED_EVENT = 'delve:explore-near-changed'

export type ExploreNearPointSource = 'geolocation' | 'places' | 'preset'

export type ExploreNearPoint = {
  latitude: number
  longitude: number
  label: string
  source: ExploreNearPointSource
  /** Explore country code when this point was set — cleared if destination country changes. */
  country: string
}

export type TownCentrePreset = {
  label: string
  latitude: number
  longitude: number
  /** Optional region to suggest aligning Explore region. */
  region?: string
}

/** Well-known town centres for Explore countries (fallback when Places is unavailable). */
export const TOWN_CENTRES_BY_COUNTRY: Record<string, readonly TownCentrePreset[]> = {
  NA: [
    { label: 'Windhoek', latitude: -22.5609, longitude: 17.0658, region: 'Khomas' },
    { label: 'Swakopmund', latitude: -22.6783, longitude: 14.5261, region: 'Erongo' },
    { label: 'Walvis Bay', latitude: -22.9575, longitude: 14.5053, region: 'Erongo' },
  ],
  ZA: [
    { label: 'Cape Town', latitude: -33.9249, longitude: 18.4241, region: 'Western Cape' },
    { label: 'Johannesburg', latitude: -26.2041, longitude: 28.0473, region: 'Gauteng' },
    { label: 'Durban', latitude: -29.8587, longitude: 31.0218, region: 'KwaZulu-Natal' },
  ],
  BW: [{ label: 'Gaborone', latitude: -24.6282, longitude: 25.9231, region: 'South-East' }],
  KE: [
    { label: 'Nairobi', latitude: -1.2921, longitude: 36.8219, region: 'Nairobi' },
    { label: 'Mombasa', latitude: -4.0435, longitude: 39.6682, region: 'Coast' },
  ],
  TZ: [
    { label: 'Dar es Salaam', latitude: -6.7924, longitude: 39.2083, region: 'Dar es Salaam' },
    { label: 'Arusha', latitude: -3.3869, longitude: 36.683, region: 'Arusha' },
  ],
  ZM: [{ label: 'Lusaka', latitude: -15.3875, longitude: 28.3228, region: 'Lusaka' }],
  MZ: [{ label: 'Maputo', latitude: -25.9692, longitude: 32.5732, region: 'Maputo' }],
  AO: [{ label: 'Luanda', latitude: -8.839, longitude: 13.2894, region: 'Luanda' }],
  NG: [{ label: 'Lagos', latitude: 6.5244, longitude: 3.3792, region: 'Lagos' }],
  GH: [{ label: 'Accra', latitude: 5.6037, longitude: -0.187, region: 'Greater Accra' }],
  US: [
    { label: 'New York', latitude: 40.7128, longitude: -74.006, region: 'New York' },
    { label: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, region: 'California' },
  ],
  GB: [{ label: 'London', latitude: 51.5074, longitude: -0.1278, region: 'England' }],
  DE: [{ label: 'Berlin', latitude: 52.52, longitude: 13.405, region: 'Berlin' }],
  FR: [{ label: 'Paris', latitude: 48.8566, longitude: 2.3522, region: 'Île-de-France' }],
  AU: [
    { label: 'Sydney', latitude: -33.8688, longitude: 151.2093, region: 'New South Wales' },
    { label: 'Melbourne', latitude: -37.8136, longitude: 144.9631, region: 'Victoria' },
  ],
}

export function townCentresForCountry(country: string): readonly TownCentrePreset[] {
  return TOWN_CENTRES_BY_COUNTRY[country.trim().toUpperCase()] ?? []
}

function isValidPoint(raw: unknown): raw is ExploreNearPoint {
  if (!raw || typeof raw !== 'object') return false
  const p = raw as ExploreNearPoint
  return (
    typeof p.latitude === 'number' &&
    typeof p.longitude === 'number' &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    typeof p.label === 'string' &&
    p.label.trim().length > 0 &&
    (p.source === 'geolocation' || p.source === 'places' || p.source === 'preset') &&
    typeof p.country === 'string'
  )
}

export function readExploreNearPoint(exploreCountry?: string): ExploreNearPoint | null {
  try {
    const raw = localStorage.getItem(EXPLORE_NEAR_POINT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isValidPoint(parsed)) return null
    if (exploreCountry && parsed.country.toUpperCase() !== exploreCountry.trim().toUpperCase()) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeExploreNearPoint(point: ExploreNearPoint | null): void {
  try {
    if (!point) {
      localStorage.removeItem(EXPLORE_NEAR_POINT_STORAGE_KEY)
      return
    }
    localStorage.setItem(EXPLORE_NEAR_POINT_STORAGE_KEY, JSON.stringify(point))
  } catch {
    // ignore
  }
}

export function announceExploreNearChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EXPLORE_NEAR_CHANGED_EVENT))
}

export function setExploreNearPoint(point: ExploreNearPoint): void {
  writeExploreNearPoint(point)
  announceExploreNearChanged()
}

export function clearExploreNearPoint(): void {
  writeExploreNearPoint(null)
  announceExploreNearChanged()
}
