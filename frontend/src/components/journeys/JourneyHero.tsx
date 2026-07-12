import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, ChevronLeft, Share2 } from 'lucide-react'
import type { ListingGalleryItem } from '../listing/types'
import './journey-detail.css'

type Props = {
  images: ListingGalleryItem[]
  backTo: string
  backLabel?: string
  saved?: boolean
  onSave?: () => void
  onShare?: () => void
}

/** Journey hero — a swipeable cover carousel with back + save/share.
 *  Self-contained (no listing gallery import). */
export function JourneyHero({ images, backTo, backLabel = 'Journeys', saved, onSave, onShare }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const slides = images.length > 0 ? images : [{ src: '', alt: '', kind: 'image' as const }]

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1))
    setActive(Math.min(Math.max(idx, 0), slides.length - 1))
  }

  return (
    <div className="jd-hero">
      <Link to={backTo} className="jd-hero__back">
        <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
        {backLabel}
      </Link>

      <div className="jd-hero__acts">
        {onShare ? (
          <button type="button" className="jd-hero__act" onClick={onShare} aria-label="Share journey">
            <Share2 size={16} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
        {onSave ? (
          <button
            type="button"
            className={`jd-hero__act${saved ? ' jd-hero__act--on' : ''}`}
            onClick={onSave}
            aria-label={saved ? 'Saved' : 'Save journey'}
            aria-pressed={saved}
          >
            <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="jd-hero__carousel" ref={trackRef} onScroll={onScroll}>
        {slides.map((item, index) => (
          <div key={item.id ?? `${item.src}-${index}`} className="jd-hero__slide">
            {item.kind === 'video' ? (
              <video src={item.src} playsInline muted loop autoPlay preload="metadata" aria-label={item.alt ?? ''} />
            ) : (
              <img
                src={item.src}
                alt={item.alt ?? ''}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <span className="jd-hero__count">
            {active + 1} / {slides.length}
          </span>
          <div className="jd-hero__dots" aria-hidden>
            {slides.slice(0, Math.min(slides.length, 8)).map((_, index) => (
              <span key={index} className={`jd-hero__dot${index === active ? ' jd-hero__dot--on' : ''}`} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
