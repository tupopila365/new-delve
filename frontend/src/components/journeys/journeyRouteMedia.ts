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

export function mediaFromStopEntry(stop: TripStop, stopIndex: number, entry: TripEntry): JourneyStopMediaItem | null {
  if (entry.video) {
    return {
      id: entry.id,
      kind: 'video',
      src: entry.video,
      poster: entry.image,
      caption: entry.body?.trim() || undefined,
      stopIndex,
      stopName: stop.place_name,
    }
  }
  if (entry.image) {
    return {
      id: entry.id,
      kind: 'image',
      src: entry.image,
      caption: entry.body?.trim() || undefined,
      stopIndex,
      stopName: stop.place_name,
    }
  }
  return null
}

export function collectStopMedia(stop: TripStop, stopIndex: number): JourneyStopMediaItem[] {
  return stop.entries
    .map((entry) => mediaFromStopEntry(stop, stopIndex, entry))
    .filter((item): item is JourneyStopMediaItem => !!item)
}

export function collectRouteMedia(stops: TripStop[]): JourneyStopMediaItem[] {
  return stops.flatMap((stop, stopIndex) => collectStopMedia(stop, stopIndex))
}
