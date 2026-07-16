import type { TripEntry, TripStop } from '../../data/mockTrips'

export type JourneyStopMediaItem = {
  id: number
  kind: 'image' | 'video'
  src: string
  poster?: string | null
  caption?: string
  stopIndex: number
  stopName: string
}

function isVideoSrc(src: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)
}

/** All media for a single diary moment — the new `media` carousel, or the
 *  legacy single image/video. IDs stay unique across a moment's items. */
export function mediaListFromStopEntry(
  stop: TripStop,
  stopIndex: number,
  entry: TripEntry,
): JourneyStopMediaItem[] {
  const caption = entry.body?.trim() || undefined
  const list = Array.isArray(entry.media) ? entry.media.filter((m) => m && m.src) : []

  if (list.length > 0) {
    return list.map((m, i) => ({
      id: entry.id * 100 + i,
      kind: m.kind === 'video' || isVideoSrc(m.src) ? 'video' : 'image',
      src: m.src,
      poster: m.poster ?? null,
      caption,
      stopIndex,
      stopName: stop.place_name,
    }))
  }

  if (entry.video) {
    return [
      {
        id: entry.id * 100,
        kind: 'video',
        src: entry.video,
        poster: entry.image,
        caption,
        stopIndex,
        stopName: stop.place_name,
      },
    ]
  }
  if (entry.image) {
    return [
      {
        id: entry.id * 100,
        kind: 'image',
        src: entry.image,
        caption,
        stopIndex,
        stopName: stop.place_name,
      },
    ]
  }
  return []
}

export function mediaFromStopEntry(
  stop: TripStop,
  stopIndex: number,
  entry: TripEntry,
): JourneyStopMediaItem | null {
  return mediaListFromStopEntry(stop, stopIndex, entry)[0] ?? null
}

export function collectStopMedia(stop: TripStop, stopIndex: number): JourneyStopMediaItem[] {
  return stop.entries.flatMap((entry) => mediaListFromStopEntry(stop, stopIndex, entry))
}

export function collectRouteMedia(stops: TripStop[]): JourneyStopMediaItem[] {
  return stops.flatMap((stop, stopIndex) => collectStopMedia(stop, stopIndex))
}
