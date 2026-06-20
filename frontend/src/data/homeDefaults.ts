import { mediaUrl } from '../api/client'

/** Home hero + auth screens — scenic lake and mountains. */
export const HOME_HERO_BG =
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=78'

/** Fallback cover art when listings have no image — keeps the homepage polished. */
export const HOME_DEFAULT_IMAGES = {
  stay: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  event: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  food: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  guide: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
  journey: '/images/default-journey.jpg',
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
