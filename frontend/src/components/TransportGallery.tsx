import { useCallback, useEffect, useState } from 'react'
import { Car, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { mediaUrl } from '../api/client'
import type { GalleryItem } from './AccommodationGallery'

type Props = {
  items: GalleryItem[]
  title: string
  emptyLabel?: string
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
  return <img className={`acc-gallery__img ${positionClass(index)}`} src={resolved} alt={alt} decoding="async" />
}

export function TransportGallery({ items, title, emptyLabel = 'Photo coming soon' }: Props) {
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
      if (modalOpen || n <= 1) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, modalOpen, n])

  if (n === 0) {
    return (
      <div className="acc-gallery acc-gallery--empty tp-gallery--empty" aria-label={`${title} — no photos`}>
        <Car size={40} strokeWidth={1.5} aria-hidden className="tp-gallery__empty-icon" />
        <span>{emptyLabel}</span>
      </div>
    )
  }

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
            <GalleryMedia item={items[index]} index={index} alt={`${title} — photo ${index + 1} of ${n}`} />
            {n > 1 ? (
              <>
                <button
                  type="button"
                  className="acc-gallery__arrow acc-gallery__arrow--prev"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={22} strokeWidth={2.5} aria-hidden />
                </button>
                <button
                  type="button"
                  className="acc-gallery__arrow acc-gallery__arrow--next"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                >
                  <ChevronRight size={22} strokeWidth={2.5} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
        </div>

        <button type="button" className="acc-gallery__view-all" onClick={() => openModal(index)}>
          {n > 1 ? `View all photos · ${index + 1}/${n}` : 'View photo'}
        </button>
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
              <X size={20} strokeWidth={2.25} aria-hidden />
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
                    <ChevronLeft size={22} strokeWidth={2.5} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="acc-gallery__arrow acc-gallery__arrow--next"
                    onClick={() => setModalIndex((i) => (i + 1) % n)}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={22} strokeWidth={2.5} aria-hidden />
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

export function buildVehicleGalleryItems(
  cover_image: string | null | undefined,
  gallery_images?: string[] | null,
): GalleryItem[] {
  const items: GalleryItem[] = []
  const seen = new Set<string>()
  const add = (src: string | null | undefined) => {
    const s = (src || '').trim()
    if (!s || seen.has(s)) return
    seen.add(s)
    items.push({ kind: 'image', src: s })
  }
  add(cover_image)
  for (const src of gallery_images ?? []) add(src)
  return items
}

export function buildBusGalleryItems(
  cover_image: string | null | undefined,
  gallery_images?: string[] | null,
): GalleryItem[] {
  return buildVehicleGalleryItems(cover_image, gallery_images)
}
