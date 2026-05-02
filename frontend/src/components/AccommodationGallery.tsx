import { useCallback, useEffect, useState } from 'react'
import { mediaUrl } from '../api/client'

export type GalleryItem = { kind: 'image' | 'video'; src: string }

type Props = {
  /** Resolved gallery items (from API `media_gallery` or built from `cover_image`). */
  items: GalleryItem[]
  title: string
  /** `hero` fills a `.td-hero` (Journey detail–style immersive header). */
  variant?: 'default' | 'hero'
}

export function AccommodationGallery({ items, title, variant = 'default' }: Props) {
  const [index, setIndex] = useState(0)
  const n = items.length

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        const next = i + delta
        if (next < 0) return n - 1
        if (next >= n) return 0
        return next
      })
    },
    [n],
  )

  useEffect(() => {
    if (index >= n) setIndex(0)
  }, [index, n])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (n <= 1) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, n])

  if (n === 0) {
    if (variant === 'hero') return null
    return (
      <div className="acc-detail__hero acc-detail__hero--placeholder" aria-label={`${title} — no photos yet`}>
        <span>Photo coming from host</span>
      </div>
    )
  }

  const current = items[index]
  const resolved = mediaUrl(current.src) || ''

  const rootClass =
    variant === 'hero' ? 'acc-gallery acc-gallery--hero' : 'acc-gallery'
  const metaClass =
    n > 1
      ? variant === 'hero'
        ? 'acc-gallery__meta acc-gallery__meta--hero'
        : 'acc-gallery__meta'
      : ''

  return (
    <div className={rootClass} aria-roledescription="carousel" aria-label={`Photos and video of ${title}`}>
      <div className="acc-gallery__viewport">
        {current.kind === 'video' ? (
          <video
            key={`v-${index}`}
            className="acc-gallery__media acc-gallery__media--video"
            src={resolved}
            controls
            playsInline
            preload="metadata"
            aria-label={`Video ${index + 1} of ${n}`}
          />
        ) : (
          <img
            key={`i-${index}`}
            className="acc-gallery__media"
            src={resolved}
            alt=""
            decoding="async"
          />
        )}

        {n > 1 ? (
          <>
            <button type="button" className="acc-gallery__nav acc-gallery__nav--prev" onClick={() => go(-1)} aria-label="Previous photo or video">
              ‹
            </button>
            <button type="button" className="acc-gallery__nav acc-gallery__nav--next" onClick={() => go(1)} aria-label="Next photo or video">
              ›
            </button>
          </>
        ) : null}
      </div>

      {n > 1 ? (
        <div className={metaClass}>
          <div className="acc-gallery__dots" role="tablist" aria-label="Gallery slides">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}${items[i].kind === 'video' ? ' (video)' : ''}`}
                className={`acc-gallery__dot${i === index ? ' acc-gallery__dot--active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <span className="acc-gallery__counter" aria-live="polite">
            {index + 1} / {n}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function normalizeGalleryItem(raw: unknown): GalleryItem | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as { kind?: string; src?: string }
  const src = typeof o.src === 'string' ? o.src : ''
  if (!src) return null
  const kind = o.kind === 'video' ? 'video' : 'image'
  return { kind, src }
}

/** Merge API `media_gallery` with legacy `cover_image` when gallery is empty. */
export function buildGalleryItems(media_gallery: unknown, cover_image: string | null | undefined): GalleryItem[] {
  const fromApi: GalleryItem[] = []
  if (Array.isArray(media_gallery)) {
    for (const row of media_gallery) {
      const item = normalizeGalleryItem(row)
      if (item) fromApi.push(item)
    }
  }
  if (fromApi.length > 0) return fromApi
  if (cover_image) return [{ kind: 'image', src: cover_image }]
  return []
}
