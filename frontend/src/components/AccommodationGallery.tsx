import { useCallback, useEffect, useState } from 'react'
import { Building2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { mediaUrl } from '../api/client'

export type GalleryItem = { kind: 'image' | 'video'; src: string }

type Props = {
  items: GalleryItem[]
  title: string
  /** `detail` — premium Airbnb-style grid + mobile carousel for stay detail pages. */
  variant?: 'default' | 'detail'
}

function resolveSrc(src: string): string {
  return mediaUrl(src) || src
}

function positionClass(index: number): string {
  if (index === 0) return 'acc-gallery__img--room'
  if (index === 1) return 'acc-gallery__img--exterior'
  return 'acc-gallery__img--view'
}

function GalleryMedia({ item, index, alt }: { item: GalleryItem; index: number; alt: string }) {
  const resolved = resolveSrc(item.src)
  if (item.kind === 'video') {
    return (
      <video
        className={`acc-gallery__img acc-gallery__img--video ${positionClass(index)}`}
        src={resolved}
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    )
  }
  return (
    <img
      className={`acc-gallery__img ${positionClass(index)}`}
      src={resolved}
      alt={alt}
      decoding="async"
    />
  )
}

export function AccommodationGallery({ items, title, variant = 'default' }: Props) {
  const [index, setIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalIndex, setModalIndex] = useState(0)
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

  const openModal = (start: number) => {
    setModalIndex(start)
    setModalOpen(true)
  }

  useEffect(() => {
    if (index >= n) setIndex(0)
  }, [index, n])

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false)
      if (e.key === 'ArrowRight') setModalIndex((i) => (i + 1) % n)
      if (e.key === 'ArrowLeft') setModalIndex((i) => (i - 1 + n) % n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen, n])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen || variant !== 'detail' || n <= 1) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, modalOpen, n, variant])

  if (n === 0) {
    return (
      <div className="acc-gallery acc-gallery--empty" aria-label={`${title} — no photos yet`}>
        <Building2 size={36} strokeWidth={1.75} aria-hidden />
        <span>Photo coming from host</span>
      </div>
    )
  }

  if (variant === 'detail') {
    const sideItems = items.slice(1, 3)

    return (
      <>
        <div className="acc-gallery acc-gallery--detail" aria-label={`Photos of ${title}`}>
          <div className="acc-gallery__grid">
            <button
              type="button"
              className="acc-gallery__main"
              onClick={() => openModal(0)}
              aria-label={`View photo 1 of ${n} for ${title}`}
            >
              <GalleryMedia item={items[0]} index={0} alt={`${title} — main photo`} />
            </button>

            {sideItems.length > 0 ? (
              <div className="acc-gallery__side">
                {sideItems.map((item, i) => (
                  <button
                    key={`side-${i}`}
                    type="button"
                    className="acc-gallery__side-cell"
                    onClick={() => openModal(i + 1)}
                    aria-label={`View photo ${i + 2} of ${n}`}
                  >
                    <GalleryMedia item={item} index={i + 1} alt={`${title} — photo ${i + 2}`} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="acc-gallery__carousel" aria-roledescription="carousel">
            <div className="acc-gallery__carousel-viewport">
              <GalleryMedia
                item={items[index]}
                index={index}
                alt={`${title} — photo ${index + 1} of ${n}`}
              />
              {n > 1 ? (
                <>
                  <button
                    type="button"
                    className="acc-gallery__arrow acc-gallery__arrow--prev"
                    onClick={() => go(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="acc-gallery__arrow acc-gallery__arrow--next"
                    onClick={() => go(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {n > 0 ? (
            <button
              type="button"
              className="acc-gallery__view-all"
              onClick={() => openModal(index)}
            >
              {n > 1 ? `View all photos · ${index + 1}/${n}` : 'View photo'}
            </button>
          ) : null}
        </div>

        {modalOpen ? (
          <div
            className="acc-gallery__modal"
            role="dialog"
            aria-modal="true"
            aria-label={`All photos of ${title}`}
            onClick={() => setModalOpen(false)}
          >
            <div className="acc-gallery__modal-inner" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="acc-gallery__modal-close"
                onClick={() => setModalOpen(false)}
                aria-label="Close gallery"
              >
                <X size={22} strokeWidth={2.25} aria-hidden />
              </button>
              <div className="acc-gallery__modal-stage">
                <GalleryMedia
                  item={items[modalIndex]}
                  index={modalIndex}
                  alt={`${title} — photo ${modalIndex + 1} of ${n}`}
                />
                {n > 1 ? (
                  <>
                    <button
                      type="button"
                      className="acc-gallery__arrow acc-gallery__arrow--prev"
                      onClick={() => setModalIndex((i) => (i - 1 + n) % n)}
                      aria-label="Previous photo"
                    >
                      <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="acc-gallery__arrow acc-gallery__arrow--next"
                      onClick={() => setModalIndex((i) => (i + 1) % n)}
                      aria-label="Next photo"
                    >
                      <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
                    </button>
                  </>
                ) : null}
              </div>
              <p className="acc-gallery__modal-counter">
                {modalIndex + 1} / {n}
              </p>
            </div>
          </div>
        ) : null}
      </>
    )
  }

  const current = items[index]
  return (
    <div className="acc-gallery" aria-roledescription="carousel" aria-label={`Photos of ${title}`}>
      <div className="acc-gallery__viewport">
        <GalleryMedia item={current} index={index} alt={`${title} — photo ${index + 1}`} />
        {n > 1 ? (
          <>
            <button
              type="button"
              className="acc-gallery__arrow acc-gallery__arrow--prev"
              onClick={() => go(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              className="acc-gallery__arrow acc-gallery__arrow--next"
              onClick={() => go(1)}
              aria-label="Next photo"
            >
              <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      {n > 1 ? (
        <button type="button" className="acc-gallery__view-all acc-gallery__view-all--inline" onClick={() => openModal(index)}>
          View all photos · {index + 1}/{n}
        </button>
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
