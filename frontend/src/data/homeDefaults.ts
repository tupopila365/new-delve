import { mediaUrl } from '../api/client'

/** Home hero + auth screens — scenic lake and mountains. */
export const HOME_HERO_BG =
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=78'

/**
 * Still photograph behind the home scroll — peeks between solid panels.
 * Quiet documentary texture, different from the hero lake.
 */
export const HOME_ATMOSPHERE_BG =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2200&q=72'

/** Chapter plates — full photographs with solid museum-style captions (no washes). */
export const HOME_CHAPTER_IMAGES = {
  sleep: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=78',
  taste: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=78',
  ask: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=78',
  share: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=78',
} as const

/** Fallback cover art when listings have no image — keeps the homepage polished. */
export const HOME_DEFAULT_IMAGES = {
  stay: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  event: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  food: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  guide: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
  journey: '/images/default-journey.jpg',
  transport: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8804?auto=format&fit=crop&w=800&q=80',
  delvers: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80',
} as const

export type HomeImageCategory = keyof typeof HOME_DEFAULT_IMAGES

export function homeCoverSrc(
  cover: string | null | undefined,
  category: HomeImageCategory,
): string {
  if (cover) {
    const resolved = mediaUrl(cover)
    if (resolved) return resolved
  }
  return HOME_DEFAULT_IMAGES[category]
}
