import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { mediaUrl } from '../api/client'

function touchDist(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

type PinchRef = { initialDist: number; baseZoom: number }
type PanRef = { startX: number; startY: number; panX: number; panY: number }

export function RoomPhotoCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const pinchRef = useRef<PinchRef | null>(null)
  const panRef = useRef<PanRef | null>(null)
  const swipeRef = useRef<number | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const panR = useRef(pan)
  panR.current = pan

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length)
  const next = () => setIdx((i) => (i + 1) % images.length)

  const openLightbox = () => {
    setLightboxOpen(true)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    pinchRef.current = null
    panRef.current = null
    swipeRef.current = null
  }, [])

  useEffect(() => {
    if (!lightboxOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const n = images.length

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + n) % n)
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % n)
    }
    window.addEventListener('keydown', onKey)
    queueMicrotask(() => closeBtnRef.current?.focus())

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [lightboxOpen, closeLightbox, images.length])

  useEffect(() => {
    if (!lightboxOpen) return
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [idx, lightboxOpen])

  const onLbTouchStart = (e: React.TouchEvent) => {
    const t = e.touches
    if (t.length === 2) {
      pinchRef.current = {
        initialDist: touchDist(t[0], t[1]),
        baseZoom: zoomRef.current,
      }
      panRef.current = null
      swipeRef.current = null
      return
    }
    if (t.length === 1) {
      pinchRef.current = null
      if (zoomRef.current > 1) {
        panRef.current = {
          startX: t[0].clientX,
          startY: t[0].clientY,
          panX: panR.current.x,
          panY: panR.current.y,
        }
        swipeRef.current = null
      } else {
        swipeRef.current = t[0].clientX
        panRef.current = null
      }
    }
  }

  const onLbTouchMove = (e: React.TouchEvent) => {
    const t = e.touches
    if (t.length === 2 && pinchRef.current) {
      e.preventDefault()
      const d = touchDist(t[0], t[1])
      const { initialDist, baseZoom } = pinchRef.current
      if (initialDist > 0) {
        setZoom(clamp((baseZoom * d) / initialDist, 1, 4))
        setPan({ x: 0, y: 0 })
      }
      return
    }
    if (t.length === 1 && panRef.current && zoomRef.current > 1) {
      e.preventDefault()
      const p = panRef.current
      setPan({
        x: p.panX + (t[0].clientX - p.startX),
        y: p.panY + (t[0].clientY - p.startY),
      })
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const dz = e.deltaY > 0 ? -0.12 : 0.12
    setZoom((z) => clamp(z + dz, 1, 4))
  }

  const onLbTouchEnd = (e: React.TouchEvent) => {
    const rem = e.touches.length
    if (rem < 2) pinchRef.current = null
    if (rem === 0) {
      if (zoomRef.current <= 1 && swipeRef.current != null && e.changedTouches.length === 1) {
        const end = e.changedTouches[0].clientX
        const delta = end - swipeRef.current
        if (delta < -48) next()
        else if (delta > 48) prev()
      }
      panRef.current = null
      swipeRef.current = null
    }
  }

  const backdropClick = () => {
    if (zoom > 1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    } else {
      closeLightbox()
    }
  }

  const lightbox =
    lightboxOpen &&
    typeof document !== 'undefined' &&
    createPortal(
      <div className="acc-detail__lightbox" role="dialog" aria-modal="true" aria-label={`${name} photos`}>
        <button
          type="button"
          className="acc-detail__lightbox-backdrop"
          aria-label={zoom > 1 ? 'Reset zoom or close' : 'Close gallery'}
          onClick={backdropClick}
        />
        <div className="acc-detail__lightbox-sheet">
          <button
            ref={closeBtnRef}
            type="button"
            className="acc-detail__lightbox-close"
            aria-label="Close gallery"
            onClick={(e) => {
              e.stopPropagation()
              closeLightbox()
            }}
          >
            ×
          </button>
          <div className="acc-detail__lightbox-toolbar">
            <span className="acc-detail__lightbox-counter">
              {idx + 1} / {images.length}
            </span>
          </div>
          <div
            className="acc-detail__lightbox-stage"
            onTouchStart={onLbTouchStart}
            onTouchMove={onLbTouchMove}
            onTouchEnd={onLbTouchEnd}
            onWheel={onWheel}
            style={{ touchAction: 'none' }}
          >
            <img
              className="acc-detail__lightbox-img"
              src={mediaUrl(images[idx]) || ''}
              alt={`${name} — photo ${idx + 1} of ${images.length}`}
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            />
          </div>
          <button
            type="button"
            className="acc-detail__lightbox-nav acc-detail__lightbox-nav--prev"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="acc-detail__lightbox-nav acc-detail__lightbox-nav--next"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
          >
            ›
          </button>
          <p className="acc-detail__lightbox-hint">
            Pinch or scroll to zoom · swipe for next photo · Esc to close
          </p>
        </div>
      </div>,
      document.body,
    )

  if (images.length === 0) {
    return <div className="acc-detail__room-img acc-detail__room-img--placeholder" aria-hidden />
  }

  const tile = (
    <>
      <img
        className="acc-detail__room-img"
        src={mediaUrl(images[idx]) || ''}
        alt={
          images.length === 1
            ? name
            : `${name} — photo ${idx + 1} of ${images.length}`
        }
        loading="lazy"
        decoding="async"
      />
      <button
        type="button"
        className="acc-detail__room-carousel-open"
        aria-label={`Open ${name} photos full screen`}
        onClick={(e) => {
          e.stopPropagation()
          openLightbox()
        }}
      />
    </>
  )

  if (images.length === 1) {
    return (
      <>
        <div className="acc-detail__room-carousel acc-detail__room-carousel--single">{tile}</div>
        {lightbox}
      </>
    )
  }

  return (
    <>
      <div className="acc-detail__room-carousel">
        {tile}
        <button
          type="button"
          className="acc-detail__room-carousel-btn acc-detail__room-carousel-btn--prev"
          onClick={(e) => {
            e.stopPropagation()
            prev()
          }}
          aria-label="Previous photo"
        >
          ‹
        </button>
        <button
          type="button"
          className="acc-detail__room-carousel-btn acc-detail__room-carousel-btn--next"
          onClick={(e) => {
            e.stopPropagation()
            next()
          }}
          aria-label="Next photo"
        >
          ›
        </button>
        <div className="acc-detail__room-carousel-dots" role="tablist" aria-label="Room photos">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Photo ${i + 1}`}
              className={`acc-detail__room-carousel-dot${i === idx ? ' acc-detail__room-carousel-dot--active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setIdx(i)
              }}
            />
          ))}
        </div>
      </div>
      {lightbox}
    </>
  )
}
