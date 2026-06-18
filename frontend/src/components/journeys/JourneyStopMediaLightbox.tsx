import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { JourneyStopMediaItem } from './journeyRouteMedia'
import './journey-route-stops.css'

type Props = {
  items: JourneyStopMediaItem[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
}

export function JourneyStopMediaLightbox({ items, index, onClose, onChange }: Props) {
  const total = items.length
  const current = items[index]

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

  if (!current) return null

  return createPortal(
    <div className="jn-media-lightbox" role="dialog" aria-modal="true" aria-label="Stop media viewer">
      <button type="button" className="jn-media-lightbox__close" onClick={onClose} aria-label="Close">
        <X size={22} strokeWidth={2.25} aria-hidden />
      </button>

      {total > 1 ? (
        <>
          <button
            type="button"
            className="jn-media-lightbox__nav jn-media-lightbox__nav--prev"
            onClick={goPrev}
            aria-label="Previous"
          >
            <ChevronLeft size={28} strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className="jn-media-lightbox__nav jn-media-lightbox__nav--next"
            onClick={goNext}
            aria-label="Next"
          >
            <ChevronRight size={28} strokeWidth={2.25} aria-hidden />
          </button>
          <p className="jn-media-lightbox__count">
            {index + 1} / {total}
          </p>
        </>
      ) : null}

      <div className="jn-media-lightbox__stage" onClick={onClose}>
        <div className="jn-media-lightbox__frame" onClick={(e) => e.stopPropagation()}>
          {current.kind === 'video' ? (
            <video
              key={current.src}
              className="jn-media-lightbox__video"
              src={current.src}
              poster={current.poster ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <img
              key={current.src}
              className="jn-media-lightbox__img"
              src={current.src}
              alt={current.caption || current.stopName}
            />
          )}
          <div className="jn-media-lightbox__caption">
            <p className="jn-media-lightbox__place">{current.stopName}</p>
            {current.caption ? <p className="jn-media-lightbox__text">{current.caption}</p> : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
