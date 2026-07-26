import { apiFetch } from '../api/client'

export type PlaceSignalKind = 'chip_click' | 'search' | 'near_point'

/** Fire-and-forget Explore engagement — never blocks UI. */
export function recordPlaceSignal(country: string, label: string, kind: PlaceSignalKind): void {
  const cc = (country || '').trim().toUpperCase()
  const place = (label || '').trim()
  if (cc.length !== 2 || !place) return
  if (place.toLowerCase() === 'near me') return
  void apiFetch('/api/explore/place-signals/', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ country: cc, label: place, kind }),
  }).catch(() => {
    /* ignore — ranking still works without telemetry */
  })
}
