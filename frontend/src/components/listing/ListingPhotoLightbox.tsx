import { useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ListingGalleryItem } from './types'
import './listing-detail.css'

type Props = {
  images: ListingGalleryItem[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
}

export function ListingPhotoLightbox({ images, index, onClose, onChange }: Props) {
  const total = images.length
  const current = images[index]

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
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [goNext, goPrev, onClose])

  if (!current) return null

  return (
    <div className="listing-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button type="button" className="listing-lightbox__close" onClick={onClose} aria-label="Close">
        <X size={22} strokeWidth={2.25} />
      </button>

      {total > 1 ? (
        <>
          <button type="button" className="listing-lightbox__nav listing-lightbox__nav--prev" onClick={goPrev} aria-label="Previous photo">
            <ChevronLeft size={28} strokeWidth={2.25} />
          </button>
          <button type="button" className="listing-lightbox__nav listing-lightbox__nav--next" onClick={goNext} aria-label="Next photo">
            <ChevronRight size={28} strokeWidth={2.25} />
          </button>
          <p className="listing-lightbox__count">
            {index + 1} / {total}
          </p>
        </>
      ) : null}

      <div className="listing-lightbox__stage" onClick={onClose}>
        <img
          className="listing-lightbox__img"
          src={current.src}
          alt={current.alt ?? ''}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
