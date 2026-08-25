import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { PostDto } from '@delve/contracts'
import { DoubleTapLike } from './DoubleTapLike'

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
  onDoubleLike?: () => void
}

/**
 * Swipeable post media (image + video). Single item skips chrome.
 */
export default function PostMediaCarousel({
  media,
  className = '',
  mediaClassName = 'w-full h-full max-h-[70vh] object-cover',
  maxHeightClass = 'max-h-[70vh]',
  onDoubleLike,
}: PostMediaCarouselProps) {
  const items = media.filter(m => Boolean(m?.url))
  const [index, setIndex] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])

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

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return
      if (i === index) return
      video.pause()
    })
  }, [index])

  if (!items.length) return null

  if (items.length === 1) {
    const item = items[0]
    return (
      <DoubleTapLike onDoubleLike={onDoubleLike} className={`relative bg-black/5 ${className}`}>
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
      </DoubleTapLike>
    )
  }

  return (
    <DoubleTapLike onDoubleLike={onDoubleLike} className={`relative w-full overflow-hidden ${className}`}>
      <div
        ref={scrollerRef}
        className={`flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden ${maxHeightClass}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x' } as CSSProperties}
        onScroll={onScroll}
      >
        {items.map((item, i) => (
          <div
            key={item.id || `${item.url}-${i}`}
            className={`min-w-full w-full shrink-0 snap-center snap-always bg-black/5 ${maxHeightClass} flex items-center justify-center`}
          >
            {isVideo(item) ? (
              <video
                ref={el => { videoRefs.current[i] = el }}
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
        className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white pointer-events-none"
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
    </DoubleTapLike>
  )
}
