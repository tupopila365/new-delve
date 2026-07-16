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
  is_excluded?: boolean
  upvote_count?: number
  commercial_flag_count?: number
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
  { value: 'market', label: 'Market' },
  { value: 'cafe', label: 'Café / spot to linger' },
  { value: 'culture', label: 'Culture / heritage' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'hidden', label: 'Hidden gem' },
  { value: 'other', label: 'Other' },
]
