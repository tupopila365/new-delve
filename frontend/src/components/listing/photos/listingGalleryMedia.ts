import type { MediaKind } from '../../create/types'

export type ListingGalleryMediaItem = {
  url: string
  kind: MediaKind
}

export function parseGalleryMediaItem(raw: unknown): ListingGalleryMediaItem | null {
  if (typeof raw === 'string') {
    const url = raw.trim()
    return url ? { url, kind: 'image' } : null
  }
  if (raw && typeof raw === 'object') {
    const row = raw as { url?: unknown; kind?: unknown }
    const url = String(row.url ?? '').trim()
    if (!url) return null
    const kind: MediaKind = row.kind === 'video' ? 'video' : 'image'
    return { url, kind }
  }
  return null
}

export function parseGalleryMediaList(raw: unknown[] | null | undefined): ListingGalleryMediaItem[] {
  if (!raw?.length) return []
  return raw.map(parseGalleryMediaItem).filter((item): item is ListingGalleryMediaItem => item !== null)
}

/** Serialize for API — plain strings when all images; objects when any video. */
export function serializeGalleryMediaList(items: ListingGalleryMediaItem[]): (string | ListingGalleryMediaItem)[] {
  const clean = items.filter((item) => item.url.trim())
  if (clean.some((item) => item.kind === 'video')) {
    return clean
  }
  return clean.map((item) => item.url)
}

/** Food form `gallery_urls` — JSON array when videos present, else newline URLs. */
export function parseGalleryUrlsField(raw: string): ListingGalleryMediaItem[] {
  const text = raw.trim()
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text) as unknown
      if (Array.isArray(parsed)) return parseGalleryMediaList(parsed)
    } catch {
      /* fall through */
    }
  }
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url, kind: 'image' as const }))
}

export function formatGalleryUrlsField(items: ListingGalleryMediaItem[]): string {
  if (items.some((item) => item.kind === 'video')) {
    return JSON.stringify(items)
  }
  return items.map((item) => item.url).join('\n')
}

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith('data:video/')
}
