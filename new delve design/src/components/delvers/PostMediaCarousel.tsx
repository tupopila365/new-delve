import { useCallback, useRef, useState, type CSSProperties } from 'react'
import type { PostDto } from '@delve/contracts'

type PostMedia = PostDto['media'][number]

function isVideo(item: PostMedia) {
  return String(item.resourceType || '').toLowerCase() === 'video'
}

interface PostMediaCarouselProps {
  media: PostMedia[]
  /** Feed uses edge-to-edge; profile can pass rounded styles. */
  className?: string
  mediaClassName?: string
  maxHeightClass?: string
}

/**
 * Swipeable post media (image + video). Single item skips chrome.
 */
export default function PostMediaCarousel({
  media,
  className = '',
  mediaClassName = 'w-full max-h-[70vh] object-cover',
  maxHeightClass = 'max-h-[70vh]',
}: PostMediaCarouselProps) {
  const items = media.filter(m => Boolean(m?.url))
  const [index, setIndex] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback((i: number) => {
    const el = scrollerRef.current
    if (!el || !items.length) return
    const next = Math.max(0, Math.min(items.length - 1, i))
    setIndex(next)
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
  }, [items.length])

  function onScroll() {
    const el = scrollerRef.current
    if (!el || !items.length) return
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
    setIndex(Math.max(0, Math.min(items.length - 1, i)))
  }

  if (!items.length) return null

  if (items.length === 1) {
    const item = items[0]
    return (
      <div className={`relative bg-black/5 ${className}`}>
        {isVideo(item) ? (
          <video
            src={item.url}
            className={mediaClassName}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <img src={item.url} alt="" className={mediaClassName} />
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollerRef}
        className={`flex overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden ${maxHeightClass}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as CSSProperties}
        onScroll={onScroll}
      >
        {items.map((item, i) => (
          <div
            key={item.id || `${item.url}-${i}`}
            className={`w-full shrink-0 snap-center snap-always bg-black/5 ${maxHeightClass} flex items-center justify-center`}
          >
            {isVideo(item) ? (
              <video
                src={item.url}
                className={mediaClassName}
                controls
                playsInline
                preload={i === index ? 'metadata' : 'none'}
              />
            ) : (
              <img src={item.url} alt="" className={mediaClassName} draggable={false} />
            )}
          </div>
        ))}
      </div>

      <div
        className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        aria-hidden
      >
        {index + 1}/{items.length}
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        {items.map((item, i) => (
          <button
            key={item.id || `dot-${i}`}
            type="button"
            aria-label={`Go to media ${i + 1}`}
            className="pointer-events-auto h-1.5 rounded-full transition-all"
            style={{
              width: i === index ? 16 : 6,
              background: i === index ? '#fff' : 'rgba(255,255,255,0.45)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  )
}
