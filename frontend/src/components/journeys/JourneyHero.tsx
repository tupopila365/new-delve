import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, ChevronLeft, ChevronRight, Heart, Share2 } from 'lucide-react'
import type { ListingGalleryItem } from '../listing/types'
import './journey-detail.css'

type Props = {
  images: ListingGalleryItem[]
  backTo: string
  backLabel?: string
  liked?: boolean
  saved?: boolean
  likeBusy?: boolean
  saveBusy?: boolean
  onLike?: () => void
  onSave?: () => void
  onShare?: () => void
}

/** Journey hero — a swipeable cover carousel with back + like/save/share.
 *  Self-contained (no listing gallery import). */
export function JourneyHero({
  images,
  backTo,
  backLabel = 'Journeys',
  liked,
  saved,
  likeBusy = false,
  saveBusy = false,
  onLike,
  onSave,
  onShare,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(() => new Set())

  const candidates =
    images.filter((item) => Boolean(item.src?.trim())).length > 0
      ? images.filter((item) => Boolean(item.src?.trim()))
      : [{ id: 'empty', src: '', alt: '', kind: 'image' as const }]

  const slides = candidates.map((item) => {
    if (!item.src?.trim()) return item
    if (failedSrcs.has(item.src)) return { ...item, src: '', kind: 'image' as const }
    return item
  })

  const visibleSrcCount = slides.filter((s) => s.src?.trim()).length
  const multi = slides.length > 1 && visibleSrcCount > 0
  const isEmptyHero = visibleSrcCount === 0

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
    setActive(Math.min(Math.max(idx, 0), slides.length - 1))
  }

  const goTo = (index: number) => {
    const el = trackRef.current
    if (!el) return
    const next = Math.min(Math.max(index, 0), slides.length - 1)
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setActive(next)
  }

  const markFailed = (src: string) => {
    if (!src) return
    setFailedSrcs((prev) => {
      if (prev.has(src)) return prev
      const next = new Set(prev)
      next.add(src)
      return next
    })
  }

  return (
    <div className={`jd-hero${isEmptyHero ? ' jd-hero--empty' : ''}`}>
      <Link to={backTo} className="jd-hero__back">
        <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
        {backLabel}
      </Link>

      <div className="jd-hero__acts">
        {onLike ? (
          <button
            type="button"
            className={`jd-hero__act jd-hero__act--like${liked ? ' is-active' : ''}`}
            onClick={onLike}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike journey' : 'Like journey'}
            aria-pressed={liked}
          >
            <Heart size={16} strokeWidth={2.25} fill={liked ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
        {onShare ? (
          <button type="button" className="jd-hero__act" onClick={onShare} aria-label="Share journey">
            <Share2 size={16} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
        {onSave ? (
          <button
            type="button"
            className={`jd-hero__act jd-hero__act--save${saved ? ' is-active' : ''}`}
            onClick={onSave}
            disabled={saveBusy}
            aria-label={saved ? 'Saved' : 'Save journey'}
            aria-pressed={saved}
          >
            <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="jd-hero__carousel" ref={trackRef} onScroll={onScroll}>
        {slides.map((item, index) => (
          <div key={item.id ?? `${candidates[index]?.src ?? index}-${index}`} className="jd-hero__slide">
            {item.kind === 'video' && item.src?.trim() ? (
              <video
                src={item.src}
                playsInline
                muted
                loop
                autoPlay
                preload="metadata"
                aria-label={item.alt ?? ''}
                onError={() => markFailed(candidates[index]?.src || item.src)}
              />
            ) : item.src?.trim() ? (
              <img
                src={item.src}
                alt={item.alt ?? ''}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onError={() => markFailed(candidates[index]?.src || item.src)}
              />
            ) : (
              <div className="jd-hero__slide-empty" aria-hidden />
            )}
          </div>
        ))}
      </div>

      {multi && visibleSrcCount > 1 ? (
        <>
          {active > 0 ? (
            <button
              type="button"
              className="jd-hero__nav jd-hero__nav--prev"
              onClick={() => goTo(active - 1)}
              aria-label="Previous photo"
            >
              <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          {active < slides.length - 1 ? (
            <button
              type="button"
              className="jd-hero__nav jd-hero__nav--next"
              onClick={() => goTo(active + 1)}
              aria-label="Next photo"
            >
              <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
          <span className="jd-hero__count">
            {active + 1} / {slides.length}
          </span>
          <div className="jd-hero__dots" aria-label="Gallery pages">
            {slides.slice(0, Math.min(slides.length, 8)).map((_, index) => (
              <button
                key={index}
                type="button"
                className={`jd-hero__dot${index === active ? ' jd-hero__dot--on' : ''}`}
                onClick={() => goTo(index)}
                aria-label={`Go to photo ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
