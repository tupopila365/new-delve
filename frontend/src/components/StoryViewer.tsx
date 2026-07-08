import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { StorySlide } from '../data/homeStories'
import { StoryProgressRail } from './stories/StoryProgressRail'
import { useStoryPlayback, type StoryPlaybackSlide } from '../hooks/useStoryPlayback'
import { useStoryMediaGestures } from '../hooks/useStoryMediaGestures'

type Props = {
  open: boolean
  onClose: () => void
  channelLabel: string
  explorePath: string
  slides: StorySlide[]
  ctaLabel?: string
}

function toPlaybackSlides(slides: StorySlide[]): StoryPlaybackSlide[] {
  return slides.map((slide) => ({
    id: slide.id,
    kind: slide.kind,
    durationMs: slide.durationMs,
  }))
}

export function StoryViewer({ open, onClose, channelLabel, explorePath, slides, ctaLabel }: Props) {
  const [index, setIndex] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  const playbackSlides = toPlaybackSlides(slides)

  const {
    slide: playbackSlide,
    videoProgress,
    isPaused,
    videoRef,
    goNext,
    goPrev,
    holdStart,
    holdEnd,
    handleVideoTimeUpdate,
    handleVideoEnded,
    currentImageDurationMs,
  } = useStoryPlayback({
    active: open,
    slides: playbackSlides,
    index,
    onIndexChange: setIndex,
    onComplete: onClose,
    imageDurationMs: slides[index]?.durationMs ?? 5200,
    videoCapMs: slides[index]?.durationMs ?? 15000,
  })

  const { mediaPointerProps } = useStoryMediaGestures({
    enabled: open,
    holdStart,
    holdEnd,
    swipeHandlers: {
      onPointerDown: () => {},
      onPointerMove: () => {},
      onPointerUp: () => {},
    },
  })

  const slide = slides[index]

  useEffect(() => {
    if (!open) return
    setIndex(0)
  }, [open, slides])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, goNext, goPrev])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open || slides.length === 0 || !slide || !playbackSlide) return null

  const hasOverlayCaption =
    typeof slide.captionX === 'number' &&
    typeof slide.captionY === 'number' &&
    Boolean(slide.headline.trim())

  return createPortal(
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`${channelLabel} highlights`}>
      <StoryProgressRail
        segments={slides}
        index={index}
        activeKind={playbackSlide.kind}
        videoProgress={videoProgress}
        imageDurationMs={currentImageDurationMs}
        paused={isPaused}
        variant="home"
      />

      <header className="story-viewer__head">
        <span className="story-viewer__brand">DELVE</span>
        <span className="story-viewer__channel">{channelLabel}</span>
        <button ref={closeRef} type="button" className="story-viewer__close" onClick={onClose} aria-label="Close highlights">
          <X size={18} strokeWidth={2.35} aria-hidden />
        </button>
      </header>

      <div className="story-viewer__media" {...mediaPointerProps}>
        {slide.kind === 'image' ? (
          <img key={slide.id} className="story-viewer__img" src={slide.src} alt="" />
        ) : (
          <video
            ref={videoRef}
            key={slide.id}
            className="story-viewer__video"
            src={slide.src}
            autoPlay
            playsInline
            muted
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
          />
        )}
        <div className="story-viewer__scrim" />
        {hasOverlayCaption ? (
          <div
            className="story-viewer__overlay-caption"
            style={{ left: `${slide.captionX}%`, top: `${slide.captionY}%` }}
          >
            {slide.headline}
          </div>
        ) : null}
        <div className="story-viewer__caption">
          <p className="story-viewer__kicker">{channelLabel}</p>
          {!hasOverlayCaption ? <h2 className="story-viewer__headline">{slide.headline}</h2> : null}
          {slide.sub ? <p className="story-viewer__sub">{slide.sub}</p> : null}
        </div>
      </div>

      <button
        type="button"
        className="story-viewer__zone story-viewer__zone--left"
        aria-label="Previous highlight"
        onClick={goPrev}
      >
        <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
      </button>
      <button
        type="button"
        className="story-viewer__zone story-viewer__zone--right"
        aria-label="Next highlight"
        onClick={goNext}
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
