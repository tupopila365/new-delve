import { mediaUrl } from '../../../api/client'
import type { MediaKind } from '../../create/types'
import { ensureHighlightMediaUrl } from '../../highlights/highlightMediaApi'
import { isVideoUrl, parseGalleryMediaList, serializeGalleryMediaList, type ListingGalleryMediaItem } from './listingGalleryMedia'
import type { ListingPhotoDraft } from './types'

export function newPhotoId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function photoKind(photo: ListingPhotoDraft): MediaKind {
  if (photo.kind) return photo.kind
  if (photo.file?.type.startsWith('video/')) return 'video'
  if (isVideoUrl(photo.src)) return 'video'
  return 'image'
}

export function photosFromUrls(urls: string[]): ListingPhotoDraft[] {
  return urls.filter(Boolean).map((src) => ({ id: newPhotoId(), src, kind: 'image' as const }))
}

export function photosFromListingGallery(
  coverUrl: string | null | undefined,
  galleryRaw: unknown[] | null | undefined,
  coverKind?: MediaKind | null,
): ListingPhotoDraft[] {
  const items: ListingPhotoDraft[] = []
  const cover = (coverUrl ?? '').trim()
  if (cover) {
    const kind: MediaKind =
      coverKind === 'video' || coverKind === 'image'
        ? coverKind
        : isVideoUrl(cover)
          ? 'video'
          : 'image'
    items.push({
      id: newPhotoId(),
      src: mediaUrl(cover) ?? cover,
      kind,
    })
  }
  for (const item of parseGalleryMediaList(galleryRaw)) {
    const src = mediaUrl(item.url) ?? item.url
    if (!src || items.some((p) => p.src === src)) continue
    items.push({ id: newPhotoId(), src, kind: item.kind })
  }
  return items
}

/** First item = cover (image); rest = gallery with kind metadata. */
export function splitCoverAndGalleryMedia(photos: ListingPhotoDraft[]): {
  cover: string
  gallery: ListingGalleryMediaItem[]
} {
  const clean = photos.filter((p) => p.src?.trim())
  const coverPhoto = clean[0]
  const cover = coverPhoto?.src?.trim() ?? ''
  const gallery = clean.slice(1).map((photo) => ({
    url: photo.src.trim(),
    kind: photoKind(photo),
  }))
  return { cover, gallery }
}

/** @deprecated Use splitCoverAndGalleryMedia + resolveListingGalleryMedia */
export function splitCoverAndGallery(urls: string[]): { cover: string; gallery: string[] } {
  const clean = urls.map((u) => u.trim()).filter(Boolean)
  return {
    cover: clean[0] ?? '',
    gallery: clean.slice(1),
  }
}

export async function resolveListingGalleryMedia(
  photos: ListingPhotoDraft[],
  options?: { allowVideoCover?: boolean },
): Promise<{
  cover: string
  coverKind: MediaKind
  gallery: ListingGalleryMediaItem[]
}> {
  const allowVideoCover = Boolean(options?.allowVideoCover)
  const candidates = photos.filter((photo) => {
    const src = photo.src?.trim()
    if (!src) return false
    return true
  })

  // Upload in parallel (Delvers-style) instead of one-by-one on publish.
  const uploaded = await Promise.all(
    candidates.map(async (photo) => {
      const src = photo.src?.trim() ?? ''
      const kind = photoKind(photo)
      const url = await ensureHighlightMediaUrl(src, kind, photo.file ?? null)
      if (!url) return null
      return { ...photo, src: url, kind } satisfies ListingPhotoDraft
    }),
  )

  const resolved: ListingPhotoDraft[] = []
  for (const photo of uploaded) {
    if (!photo) continue
    if (resolved.length === 0 && photo.kind === 'video' && !allowVideoCover) continue
    resolved.push(photo)
  }
  const { cover, gallery } = splitCoverAndGalleryMedia(resolved)
  const coverKind: MediaKind = resolved[0] ? photoKind(resolved[0]) : 'image'
  return {
    cover,
    coverKind,
    gallery: gallery.map((item) => ({ ...item, url: item.url.trim() })),
  }
}

/** Flat URL list for legacy callers. */
export async function resolveListingPhotoUrls(photos: ListingPhotoDraft[]): Promise<string[]> {
  const { cover, gallery } = await resolveListingGalleryMedia(photos)
  const urls = [cover, ...gallery.map((g) => g.url)].filter(Boolean)
  return urls
}

export function serializeGalleryForApi(gallery: ListingGalleryMediaItem[]): (string | ListingGalleryMediaItem)[] {
  return serializeGalleryMediaList(gallery)
}

