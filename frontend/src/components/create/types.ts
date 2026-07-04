export type MediaKind = 'image' | 'video'

export type MediaFilter = 'original' | 'warm' | 'mono' | 'dusk' | 'vivid'

export type CropAspect = 'original' | '1:1' | '4:5' | '16:9'

export type CaptionPosition = { x: number; y: number }

export type CropSettings = {
  aspect: CropAspect
  zoom: number
  offsetX: number
  offsetY: number
}

export type VideoTrim = {
  start: number
  end: number
}

export type CreateStudioMode = 'post' | 'story'

export type PostDestination = 'feed' | 'delvers'

export type PlaceLink =
  | { kind: 'none' }
  | { kind: 'accommodation'; id: number; title: string }
  | { kind: 'event'; id: number; title: string }
  | { kind: 'vehicle'; id: number; title: string }
  | { kind: 'bus_trip'; id: number; title: string }
  | { kind: 'food'; id: number; title: string }

export const DEFAULT_PLACE_LINK: PlaceLink = { kind: 'none' }

export const MEDIA_FILTERS: { id: MediaFilter; label: string }[] = [
  { id: 'original', label: 'Normal' },
  { id: 'warm', label: 'Warm' },
  { id: 'mono', label: 'Mono' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'vivid', label: 'Vivid' },
]

export const CROP_ASPECTS: { id: CropAspect; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: '1:1', label: '1:1' },
  { id: '4:5', label: '4:5' },
  { id: '16:9', label: '16:9' },
]

export const CAPTION_PRESETS: { label: string; position: CaptionPosition }[] = [
  { label: 'Top', position: { x: 50, y: 18 } },
  { label: 'Middle', position: { x: 50, y: 50 } },
  { label: 'Bottom', position: { x: 50, y: 78 } },
]

export const DEFAULT_CROP: CropSettings = {
  aspect: '4:5',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}
