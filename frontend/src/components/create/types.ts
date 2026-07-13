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
  { id: '1:1', label: 'Square' },
  { id: '4:5', label: 'Portrait' },
  { id: '16:9', label: 'Landscape' },
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

/* ─── New types for social media editing ─── */

/** Perceptual adjustment values (0–200, 100 = neutral) */
export type Adjustments = {
  brightness: number   // 0–200, default 100
  contrast: number     // 0–200, default 100
  saturation: number   // 0–200, default 100
  warmth: number       // 0–200, default 100
  sharpen: number      // 0–200, default 0 (off)
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 100,
  sharpen: 0,
}

export type FilterIntensity = number // 0–100, default 100

/** A text overlay placed on the media */
export type TextOverlay = {
  id: string
  text: string
  font: string
  fontSize: number
  color: string
  bgColor: string
  hasBg: boolean
  shadow: boolean
  align: 'left' | 'center' | 'right'
  x: number // percent 0–100
  y: number // percent 0–100
}

/** A sticker/emoji placed on the media */
export type StickerOverlay = {
  id: string
  emoji: string
  size: number
  x: number
  y: number
  rotation: number
}

/** A freehand drawing stroke */
export type DrawStroke = {
  id: string
  points: { x: number; y: number }[]
  color: string
  size: number
  opacity: number
}

/** Snapshot of the entire editor state for undo/redo */
export type EditorSnapshot = {
  filter: MediaFilter
  filterIntensity: FilterIntensity
  adjustments: Adjustments
  crop: CropSettings
  caption: string
  captionPosition: CaptionPosition
  textOverlays: TextOverlay[]
  stickers: StickerOverlay[]
  strokes: DrawStroke[]
}

export const FONT_OPTIONS = [
  { id: 'sans', label: 'Sans', family: 'system-ui, sans-serif' },
  { id: 'serif', label: 'Serif', family: 'Georgia, serif' },
  { id: 'mono', label: 'Mono', family: '"Courier New", monospace' },
  { id: 'bold', label: 'Bold', family: 'system-ui, sans-serif', weight: 900 },
  { id: 'playful', label: 'Playful', family: '"Comic Sans MS", cursive' },
]

export const STICKER_PACK: { emoji: string; label: string }[] = [
  { emoji: '📍', label: 'Location' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '✨', label: 'Sparkle' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '💬', label: 'Chat' },
  { emoji: '📸', label: 'Camera' },
  { emoji: '🌍', label: 'Globe' },
  { emoji: '☀️', label: 'Sun' },
  { emoji: '🌙', label: 'Moon' },
  { emoji: '🌈', label: 'Rainbow' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🏆', label: 'Trophy' },
  { emoji: '💡', label: 'Idea' },
  { emoji: '🗺️', label: 'Map' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '🏖️', label: 'Beach' },
  { emoji: '⛰️', label: 'Mountain' },
  { emoji: '🌊', label: 'Ocean' },
  { emoji: '🌸', label: 'Flower' },
  { emoji: '🍽️', label: 'Food' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🎂', label: 'Celebration' },
  { emoji: '👀', label: 'Eyes' },
  { emoji: '🙌', label: 'Celebrate' },
  { emoji: '💪', label: 'Strong' },
  { emoji: '🧳', label: 'Luggage' },
]

export const ADJUSTMENT_LABELS: Record<keyof Adjustments, string> = {
  brightness: 'Brightness',
  contrast: 'Contrast',
  saturation: 'Saturation',
  warmth: 'Warmth',
  sharpen: 'Sharpen',
}