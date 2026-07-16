import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ListingGalleryItem } from '../listing/types'
import './media-lightbox.css'

type Props = {
  items: ListingGalleryItem[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
  /** Optional label read by screen readers. */
  label?: string
}

/**
 * Full-screen media viewer for images and videos.
 * Neutral, gradient-free surface; reusable across any page that has a
 * list of `ListingGalleryItem`s (stays, journeys, shops, food, etc.).
 */
export function MediaLightbox({ items, index, onClose, onChange, label = 'Media viewer' }: Props) {
  const total = items.length
  const current = items[index]
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [swiping, setSwiping] = useState(false)

  const goPrev = useCallback(() => {
    if (total <= 1) return
    onChange((index - 1 + total) % total)
  }, [index, onChange, total])

  const goNext = useCallback(() => {
    if (total <= 1) return
    onChange((index + 1) % total)
  }, [index, onChange, total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [goNext, goPrev, onClose])

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartX.current = t.clientX
    touchStartY.current = t.clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchStartX.current
    const dy = t.clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    setSwiping(false)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext()
      else goPrev()
    }
  }

  if (!current) return null

  const isVideo = current.kind === 'video'

  const viewer = (
    <div className="media-lb" role="dialog" aria-modal="true" aria-label={label}>
      <div className="media-lb__topbar">
        {total > 1 ? (
          <span className="media-lb__count">
            {index + 1} / {total}
          </span>
        ) : (
          <span />
        )}
        <button type="button" className="media-lb__btn media-lb__close" onClick={onClose} aria-label="Close">
          <X size={22} strokeWidth={2.25} aria-hidden />
        </button>
      </div>

      <div
        className={`media-lb__stage${swiping ? ' is-swiping' : ''}`}
        onClick={onClose}
        onTouchStart={onTouchStart}
        onTouchMove={() => setSwiping(true)}
        onTouchEnd={onTouchEnd}
      >
        {isVideo ? (
          <video
            key={current.src}
            className="media-lb__media"
            src={current.src}
            controls
            autoPlay
            playsInline
            preload="metadata"
            aria-label={current.alt ?? ''}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            key={current.src}
            className="media-lb__media"
            src={current.src}
            alt={current.alt ?? ''}
            decoding="async"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {total > 1 ? (
        <>
          <button
            type="button"
            className="media-lb__btn media-lb__nav media-lb__nav--prev"
            onClick={goPrev}
            aria-label="Previous"
          >
            <ChevronLeft size={26} strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className="media-lb__btn media-lb__nav media-lb__nav--next"
            onClick={goNext}
            aria-label="Next"
          >
            <ChevronRight size={26} strokeWidth={2.25} aria-hidden />
          </button>
        </>
      ) : null}

      {current.caption ? <p className="media-lb__caption">{current.caption}</p> : null}
    </div>
  )

  if (typeof document === 'undefined') return viewer
  return createPortal(viewer, document.body)
}
