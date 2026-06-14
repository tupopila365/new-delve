import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { StorySlide } from '../data/homeStories'

type Props = {
  open: boolean
  onClose: () => void
  channelLabel: string
  explorePath: string
  slides: StorySlide[]
  ctaLabel?: string
}

export function StoryViewer({ open, onClose, channelLabel, explorePath, slides, ctaLabel }: Props) {
  const [index, setIndex] = useState(0)
  const [videoProgress, setVideoProgress] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  const slide = slides[index]
  const isVideo = slide?.kind === 'video'
  const imageDuration = slide?.durationMs ?? 5200
  const videoCapMs = slide?.durationMs ?? 15000

  const go = useCallback(
    (delta: number) => {
      setVideoProgress(0)
      setIndex((i) => {
        const next = i + delta
        if (next < 0) return 0
        if (next >= slides.length) return slides.length - 1
        return next
      })
    },
    [slides.length],
  )

  useEffect(() => {
    if (!open) return
    setIndex(0)
    setVideoProgress(0)
  }, [open, slides])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, go])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  useEffect(() => {
    if (!open || !slide || slide.kind !== 'image') return
    const t = window.setTimeout(() => {
      if (index >= slides.length - 1) return
      setIndex((i) => i + 1)
    }, imageDuration)
    return () => window.clearTimeout(t)
  }, [open, index, slide?.id, slide?.kind, imageDuration, slides.length])

  useEffect(() => {
    if (!open || !isVideo) return
    const t = window.setTimeout(() => {
      if (index >= slides.length - 1) return
      setIndex((i) => i + 1)
      setVideoProgress(0)
    }, videoCapMs)
    return () => window.clearTimeout(t)
  }, [open, isVideo, index, slides.length, videoCapMs, slide?.id])

  if (!open || slides.length === 0 || !slide) return null

  const isFirst = index === 0
  const isLast = index === slides.length - 1

  return createPortal(
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`${channelLabel} highlights`}>
      <div className="story-viewer__progress" aria-hidden>
        {slides.map((_, i) => {
          const done = i < index
          const active = i === index
          return (
            <div key={i} className="story-viewer__seg">
              <div
                className={
                  done
                    ? 'story-viewer__fill story-viewer__fill--done'
                    : active
                      ? isVideo
                        ? 'story-viewer__fill story-viewer__fill--video'
                        : 'story-viewer__fill story-viewer__fill--active'
                      : 'story-viewer__fill story-viewer__fill--idle'
                }
                style={
                  active && isVideo
                    ? { transform: `scaleX(${Math.max(0.02, videoProgress)})` }
                    : active && !isVideo
                      ? { animationDuration: `${imageDuration}ms` }
                      : undefined
                }
              />
            </div>
          )
        })}
      </div>

      <header className="story-viewer__head">
        <span className="story-viewer__brand">DELVE</span>
        <span className="story-viewer__channel">{channelLabel}</span>
        <button ref={closeRef} type="button" className="story-viewer__close" onClick={onClose} aria-label="Close highlights">
          <X size={18} strokeWidth={2.35} aria-hidden />
        </button>
      </header>

      <div className="story-viewer__media">
        {slide.kind === 'image' ? (
          <img key={slide.id} className="story-viewer__img" src={slide.src} alt="" />
        ) : (
          <video
            key={slide.id}
            className="story-viewer__video"
            src={slide.src}
            autoPlay
            playsInline
            muted
            onEnded={() => {
              if (index < slides.length - 1) {
                setIndex((i) => i + 1)
                setVideoProgress(0)
              }
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget
              if (v.duration && Number.isFinite(v.duration)) setVideoProgress(v.currentTime / v.duration)
            }}
          />
        )}
        <div className="story-viewer__scrim" />
        <div className="story-viewer__caption">
          <p className="story-viewer__kicker">{channelLabel}</p>
          <h2 className="story-viewer__headline">{slide.headline}</h2>
          {slide.sub ? <p className="story-viewer__sub">{slide.sub}</p> : null}
        </div>
      </div>

      <button
        type="button"
        className="story-viewer__zone story-viewer__zone--left"
        aria-label="Previous highlight"
        onClick={() => go(-1)}
        disabled={isFirst}
      >
        <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        className="story-viewer__zone story-viewer__zone--right"
        aria-label="Next highlight"
        onClick={() => go(1)}
        disabled={isLast}
      >
        <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
      </button>

      <footer className="story-viewer__footer">
        <Link to={slide.ctaPath ?? explorePath} className="story-viewer__cta" onClick={onClose}>
          {slide.ctaLabel ?? ctaLabel ?? `Explore ${channelLabel}`}
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </Link>
      </footer>
    </div>,
    document.body,
  )
}
