import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { CommunityMediaItem } from './CommunityMediaViewer'
import './community-media-lightbox.css'

type Props = {
  items: CommunityMediaItem[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
}

export function CommunityMediaLightbox({ items, index, onClose, onChange }: Props) {
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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
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
    <div className="cm-media-lightbox" role="dialog" aria-modal="true" aria-label="Media viewer">
      <button type="button" className="cm-media-lightbox__close" onClick={onClose} aria-label="Close">
        <X size={22} strokeWidth={2.25} aria-hidden />
      </button>

      {total > 1 ? (
        <>
          <button
            type="button"
            className="cm-media-lightbox__nav cm-media-lightbox__nav--prev"
            onClick={goPrev}
            aria-label="Previous"
          >
            <ChevronLeft size={28} strokeWidth={2.25} aria-hidden />
          </button>
          <button
            type="button"
            className="cm-media-lightbox__nav cm-media-lightbox__nav--next"
            onClick={goNext}
            aria-label="Next"
          >
            <ChevronRight size={28} strokeWidth={2.25} aria-hidden />
          </button>
          <p className="cm-media-lightbox__count">
            {index + 1} / {total}
          </p>
        </>
      ) : null}

      <div className="cm-media-lightbox__stage" onClick={onClose}>
        <div className="cm-media-lightbox__frame" onClick={(event) => event.stopPropagation()}>
          {current.kind === 'video' ? (
            <video
              key={current.src}
              className="cm-media-lightbox__video"
              src={current.src}
              poster={current.poster ?? undefined}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <img
              key={current.src}
              className="cm-media-lightbox__img"
              src={current.src}
              alt={current.alt || 'Community media'}
            />
          )}
          {current.caption ? <p className="cm-media-lightbox__caption">{current.caption}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
