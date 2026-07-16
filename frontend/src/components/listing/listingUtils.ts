import { mediaUrl } from '../../api/client'
import type { ListingGalleryItem } from './types'

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|ogg|avi|mkv)(\?.*)?$/i

/** Guess whether a media URL points at a video from its file extension. */
export function guessMediaKind(src: string): 'image' | 'video' {
  return VIDEO_EXT.test(src.trim()) ? 'video' : 'image'
}

export function toListingGalleryImages(
  sources: string[],
  alt: string,
  idPrefix = 'img',
): ListingGalleryItem[] {
  const items: ListingGalleryItem[] = []
  sources.forEach((raw, index) => {
    const src = mediaUrl(raw) || raw
    if (!src?.trim()) return
    items.push({ id: `${idPrefix}-${index}`, src, alt, kind: guessMediaKind(src) })
  })
  return items
}

export function roomGalleryImages(
  room: { name: string; image?: string | null; images?: ListingGalleryItem[] },
): ListingGalleryItem[] {
  if (room.images && room.images.length > 0) {
    return room.images.map((img) => ({ ...img, kind: img.kind ?? guessMediaKind(img.src) }))
  }
  if (room.image) {
    const src = mediaUrl(room.image) || room.image
    return [{ id: 'cover', src, alt: room.name, kind: guessMediaKind(src) }]
  }
  return []
}
