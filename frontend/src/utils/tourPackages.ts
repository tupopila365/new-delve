import type { TourPackage } from '../components/guide/GuideTourPackages'
import { normalizeReviews } from '../components/GuestReviewCard'

function mergeGalleryUrls(o: Record<string, unknown>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (s: string) => {
    const t = s.trim()
    if (!t || seen.has(t)) return
    seen.add(t)
    out.push(t)
  }

  const ingest = (raw: unknown) => {
    if (!Array.isArray(raw)) return
    for (const item of raw) {
      if (typeof item === 'string') add(item)
      else if (item && typeof item === 'object') {
        const sr = (item as { src?: unknown }).src
        if (typeof sr === 'string') add(sr)
      }
    }
  }

  for (const key of ['gallery', 'photos', 'images'] as const) {
    ingest(o[key])
  }
  return out
}

/** Parse API `tour_packages` JSON on guide profiles into typed rows. */
export function normalizeTourPackages(raw: unknown): TourPackage[] {
  if (!Array.isArray(raw)) return []
  const out: TourPackage[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const hours = typeof o.hours === 'number' ? o.hours : Number(o.hours)
    const price = o.price != null ? String(o.price) : ''
    const photoRaw = o.photo ?? o.image
    const photo =
      typeof photoRaw === 'string' && photoRaw.trim() ? photoRaw.trim() : null
    const descRaw = o.description
    const description =
      typeof descRaw === 'string' && descRaw.trim() ? descRaw.trim() : undefined
    const extraPhotosRaw = mergeGalleryUrls(o)
    const extraPhotos =
      extraPhotosRaw.length > 0
        ? extraPhotosRaw.filter((u) => !(photo && u.trim() === photo.trim()))
        : undefined

    const rev = normalizeReviews(o.reviews)
    const reviews = rev.length > 0 ? rev : undefined

    if (id && title && Number.isFinite(hours) && hours > 0 && price) {
      out.push({
        id,
        title,
        hours,
        price,
        photo,
        description,
        photos: extraPhotos,
        reviews,
      })
    }
  }
  return out
}
