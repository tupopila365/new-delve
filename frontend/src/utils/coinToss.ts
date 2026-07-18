export type TossMedia = {
  url: string
  kind: 'image' | 'video'
}

export type TossLocation = {
  id: number
  name: string
  category: string
  category_label?: string
  description?: string
  latitude: number | string
  longitude: number | string
  region?: string
  city?: string
  open_source_ref?: string
  media?: TossMedia[]
  is_excluded?: boolean
  upvote_count?: number
  commercial_flag_count?: number
  saved_by_me?: boolean
  candidate_count?: number
  created_at?: string
}

export function mapUrl(lat: number | string, lng: number | string): string {
  const la = Number(lat)
  const lo = Number(lng)
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=16/${la}/${lo}`
}

/** Keep discovery inside Delve — search for the tossed place name. */
export function delveSearchUrl(name: string): string {
  return `/search?q=${encodeURIComponent(name)}`
}

export function categoryLabel(loc: TossLocation): string {
  return loc.category_label || loc.category || 'Spot'
}

/** Must mirror backend LocationCategory choices. */
export const QUINTOS_CATEGORIES: { value: string; label: string }[] = [
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'hike', label: 'Hike / trail' },
  { value: 'beach', label: 'Beach / coast' },
  { value: 'water', label: 'Water / swim' },
  { value: 'market', label: 'Market' },
  { value: 'cafe', label: 'Café / spot to linger' },
  { value: 'culture', label: 'Culture / heritage' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'sports', label: 'Sports / active' },
  { value: 'event', label: 'Event / happening' },
  { value: 'free', label: 'Free to visit' },
  { value: 'hidden', label: 'Hidden gem' },
  { value: 'other', label: 'Other' },
]

/** Mood chips on the toss page — each maps to one or more categories. */
export type TossMood = {
  id: string
  label: string
  /** Empty = any category */
  categories: string[]
}

export const TOSS_MOODS: TossMood[] = [
  { id: 'any', label: 'Anything', categories: [] },
  { id: 'places', label: 'Places', categories: ['viewpoint', 'culture', 'hidden', 'market', 'cafe', 'other'] },
  { id: 'events', label: 'Events', categories: ['event'] },
  { id: 'free', label: 'Free', categories: ['free', 'viewpoint', 'hidden'] },
  { id: 'sports', label: 'Sports', categories: ['sports', 'hike'] },
  { id: 'water', label: 'Water', categories: ['water', 'beach'] },
  { id: 'trails', label: 'Trails', categories: ['hike'] },
  { id: 'food', label: 'Food', categories: ['cafe', 'market'] },
]

export type TossDistanceUnit = 'mi' | 'km'

export const TOSS_DISTANCE_UNITS: { id: TossDistanceUnit; label: string; short: string }[] = [
  { id: 'km', label: 'Kilometers', short: 'km' },
  { id: 'mi', label: 'Miles', short: 'mi' },
]

const KM_PER_MILE = 1.609344
const TOSS_UNIT_KEY = 'delve-coin-toss-distance-unit'

/** Backend radius is always miles; slider ranges match API max (50 mi). */
export const TOSS_RADIUS_MILES = { min: 1, max: 50, default: 5 } as const
export const TOSS_RADIUS_KM = {
  min: 1,
  max: Math.round(TOSS_RADIUS_MILES.max * KM_PER_MILE),
  default: Math.round(TOSS_RADIUS_MILES.default * KM_PER_MILE),
} as const

export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE
}

export function clampRadiusMiles(miles: number): number {
  return Math.min(TOSS_RADIUS_MILES.max, Math.max(TOSS_RADIUS_MILES.min, miles))
}

export function readTossDistanceUnit(): TossDistanceUnit {
  try {
    const raw = localStorage.getItem(TOSS_UNIT_KEY)
    if (raw === 'mi' || raw === 'km') return raw
  } catch {
    /* ignore */
  }
  return 'km'
}

export function writeTossDistanceUnit(unit: TossDistanceUnit): void {
  try {
    localStorage.setItem(TOSS_UNIT_KEY, unit)
  } catch {
    /* ignore */
  }
}

/** e.g. "8 kilometers" / "5 miles" — full words so units are clear. */
export function formatTossRadius(miles: number, unit: TossDistanceUnit): string {
  if (unit === 'km') {
    const km = Math.max(1, Math.round(milesToKm(miles)))
    return `${km} ${km === 1 ? 'kilometer' : 'kilometers'}`
  }
  const mi = Math.max(1, Math.round(miles))
  return `${mi} ${mi === 1 ? 'mile' : 'miles'}`
}
