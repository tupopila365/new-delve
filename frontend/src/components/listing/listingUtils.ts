import { mediaUrl } from '../../api/client'
import type { ListingGalleryItem } from './types'

export function toListingGalleryImages(
  sources: string[],
  alt: string,
  idPrefix = 'img',
): ListingGalleryItem[] {
  const items: ListingGalleryItem[] = []
  sources.forEach((raw, index) => {
    const src = mediaUrl(raw) || raw
    if (!src?.trim()) return
    items.push({ id: `${idPrefix}-${index}`, src, alt })
  })
  return items
}

export function roomGalleryImages(
  room: { name: string; image?: string | null; images?: ListingGalleryItem[] },
): ListingGalleryItem[] {
  if (room.images && room.images.length > 0) return room.images
  if (room.image) {
    const src = mediaUrl(room.image) || room.image
    return [{ id: 'cover', src, alt: room.name }]
  }
  return []
}
