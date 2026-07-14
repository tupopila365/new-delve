import { useEffect, useRef, useState } from 'react'
import { mediaUrl } from '../api/client'

export type PostMediaItem = {
  order?: number
  kind: 'image' | 'video'
  image: string | null
  video: string | null
}

type Props = {
  image: string | null | undefined
  video: string | null | undefined
  /** Carousel slides. When more than one, renders a swipeable carousel. */
  media?: PostMediaItem[] | null
  alt?: string
  /** feed: autoplay muted loop; pin: often same; modal: controls */
  variant?: 'feed' | 'pin' | 'detail'
  className?: string
  /** Delvers feed: gradient overlay so video blocks do not look broken */
  showVideoPreview?: boolean
  onMediaError?: () => void
  /**
   * When false (e.g. off-screen in the vertical post viewer), pause playback.
   * Defaults to true.
   */
  playbackActive?: boolean
}

/**
 * Renders post media. A single image/video shows as before; multiple slides
 * render as an Instagram-style swipeable carousel with dots and a counter.
 */
export function PostMedia({
  image,
  video,
  media,
  alt = '',
  variant = 'feed',
  className = '',
  showVideoPreview = false,
  onMediaError,
  playbackActive = true,
}: Props) {
  const slides = normalizeSlides(media, image, video)

  if (slides.length > 1) {
    return (
      <PostCarousel
        slides={slides}
        variant={variant}
        className={className}
        alt={alt}
        showVideoPreview={showVideoPreview}
        onMediaError={onMediaError}
        playbackActive={playbackActive}
      />
    )
  }

  const single = slides[0]
  return (
    <PostMediaSlide
      slide={single ?? null}
      variant={variant}
      className={className}
      alt={alt}
      showVideoPreview={showVideoPreview}
      onMediaError={onMediaError}
      active={playbackActive}
    />
  )
}

function normalizeSlides(
  media: PostMediaItem[] | null | undefined,
  image: string | null | undefined,
  video: string | null | undefined,
): PostMediaItem[] {
  if (media && media.length > 0) {
    return media.filter((m) => m.image || m.video)
  }
  if (video) return [{ kind: 'video', image: null, video }]
  if (image) return [{ kind: 'image', image, video: null }]
  return []
}

function PostMediaSlide({
  slide,
  variant,
  className,
  alt,
  showVideoPreview,
  onMediaError,
  active,
}: {
  slide: PostMediaItem | null
  variant: 'feed' | 'pin' | 'detail'
  className: string
  alt: string
  showVideoPreview: boolean
  onMediaError?: () => void
  active: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const base = variant === 'pin' ? 'pin-card__media-el' : 'ig-post__media'

  // Pause non-active carousel videos; play the active slide (incl. detail viewer).
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (active) {
      const p = el.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    } else {
      el.pause()
      if (variant === 'detail') el.currentTime = 0
    }
  }, [active, variant])

  const v = slide?.video ? mediaUrl(slide.video) : undefined
  const img = slide?.image ? mediaUrl(slide.image) : undefined

  if (v) {
    return (
      <div className={`post-media-wrap post-media-wrap--${variant} ${className}`.trim()}>
        {showVideoPreview && variant !== 'detail' ? (
          <div className="post-media-video-preview" aria-hidden>
            <span className="post-media-video-preview__title">Video preview</span>
            <span className="post-media-video-preview__sub">Tap to watch</span>
          </div>
        ) : variant !== 'detail' ? (
          <span className="post-media-badge">Video</span>
        ) : null}
        <video
          ref={videoRef}
          className={base}
          src={v}
          playsInline
          muted={variant !== 'detail'}
          loop={variant !== 'detail'}
          autoPlay={variant !== 'detail' && active}
          controls={variant === 'detail'}
          preload={variant === 'feed' ? 'auto' : 'metadata'}
          onError={onMediaError}
        />
      </div>
    )
  }

  if (img) {
    return (
      <div className={`post-media-wrap post-media-wrap--${variant} ${className}`.trim()}>
        <img className={base} src={img} alt={alt} loading="lazy" decoding="async" onError={onMediaError} />
      </div>
    )
  }

  return (
    <div className={`post-media-placeholder post-media-wrap--${variant} ${className}`.trim()}>
      <span>Photo or video</span>
    </div>
  )
}

function PostCarousel({
  slides,
  variant,
  className,
  alt,
  showVideoPreview,
  onMediaError,
  playbackActive,
}: {
  slides: PostMediaItem[]
  variant: 'feed' | 'pin' | 'detail'
  className: string
  alt: string
  showVideoPreview: boolean
  onMediaError?: () => void
  playbackActive: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const scrollToIndex = (next: number) => {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(slides.length - 1, next))
    track.scrollTo({ left: track.clientWidth * clamped, behavior: 'smooth' })
  }

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const next = Math.round(track.scrollLeft / track.clientWidth)
    if (next !== index) setIndex(next)
  }

  return (
    <div className={`post-carousel post-carousel--${variant} ${className}`.trim()}>
      <div className="post-carousel__track" ref={trackRef} onScroll={onScroll}>
        {slides.map((slide, i) => (
          <div className="post-carousel__slide" key={slide.order ?? i}>
            <PostMediaSlide
              slide={slide}
              variant={variant}
              className=""
              alt={alt}
              showVideoPreview={showVideoPreview}
              onMediaError={onMediaError}
              active={playbackActive && i === index}
            />
          </div>
        ))}
      </div>

      <span className="post-carousel__counter" aria-hidden>
        {index + 1}/{slides.length}
      </span>

      {index > 0 ? (
        <button
          type="button"
          className="post-carousel__nav post-carousel__nav--prev"
          aria-label="Previous slide"
          onClick={() => scrollToIndex(index - 1)}
        >
          ‹
        </button>
      ) : null}
      {index < slides.length - 1 ? (
        <button
          type="button"
          className="post-carousel__nav post-carousel__nav--next"
          aria-label="Next slide"
          onClick={() => scrollToIndex(index + 1)}
        >
          ›
        </button>
      ) : null}

      <div className="post-carousel__dots" role="tablist" aria-label="Slides">
        {slides.map((slide, i) => (
          <button
            key={slide.order ?? i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to slide ${i + 1}`}
            className={`post-carousel__dot${i === index ? ' is-active' : ''}`}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
