import { useState, useRef, useEffect, useCallback } from 'react'
import type { MouseEvent, TouchEvent, ReactNode } from 'react'
import { Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Pause, ImageOff } from 'lucide-react'

export interface MediaItem {
  url: string
  type?: 'image' | 'video'
  alt?: string
  poster?: string
}

export type MediaSource = string | MediaItem | (string | MediaItem)[]

export interface EntityCardMediaProps {
  /** Single URL, MediaItem, or array of mixed images and videos */
  media: MediaSource
  /** Aspect ratio preset */
  aspectRatio?: 'video' | 'square' | 'wide' | 'portrait' | 'auto'
  /** Content to render in top-left overlay (e.g. Category badge, Calendar tear-off, Discount pill) */
  overlayTopLeft?: ReactNode
  /** Content to render in top-right overlay (e.g. SaveButton) */
  overlayTopRight?: ReactNode
  /** Content to render across bottom overlay */
  overlayBottom?: ReactNode
  /** Default alt text */
  alt?: string
  /** Whether videos should attempt autoplay when loaded (defaults to true) */
  autoPlay?: boolean
  /** Additional container styling */
  className?: string
}

const ASPECT_RATIO_STYLES = {
  video: 'aspect-[16/9]',
  wide: 'aspect-[4/3]',
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  auto: '',
}

function normalizeMedia(source: MediaSource, defaultAlt = ''): MediaItem[] {
  if (!source) return []
  const items = Array.isArray(source) ? source : [source]
  return items.map(item => {
    if (typeof item === 'string') {
      const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(item)
      return {
        url: item,
        type: isVideo ? 'video' : 'image',
        alt: defaultAlt,
      }
    }
    const isVideo = item.type === 'video' || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(item.url)
    return {
      ...item,
      type: isVideo ? 'video' : 'image',
      alt: item.alt || defaultAlt,
    }
  })
}

export default function EntityCardMedia({
  media,
  aspectRatio = 'wide',
  overlayTopLeft,
  overlayTopRight,
  overlayBottom,
  alt = 'Media preview',
  autoPlay = true,
  className = '',
}: EntityCardMediaProps) {
  const items = normalizeMedia(media, alt)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [hasError, setHasError] = useState<Record<number, boolean>>({})
  const [isLoading, setIsLoading] = useState<Record<number, boolean>>({})
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const currentItem = items[currentIndex] || items[0]
  const isMultiMedia = items.length > 1

  // Handle active slide video playback
  useEffect(() => {
    videoRefs.current.forEach((video, idx) => {
      if (!video) return
      if (idx === currentIndex) {
        video.muted = isMuted
        if (isPlaying) {
          video.play().catch(() => {
            // Browser autoplay policy rejected unmuted or user blocked
            setIsPlaying(false)
          })
        } else {
          video.pause()
        }
      } else {
        video.pause()
      }
    })
  }, [currentIndex, isMuted, isPlaying])

  const toggleMute = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    setIsMuted(prev => {
      const next = !prev
      if (videoRefs.current[currentIndex]) {
        videoRefs.current[currentIndex]!.muted = next
      }
      return next
    })
  }, [currentIndex])

  const togglePlay = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    setIsPlaying(prev => {
      const next = !prev
      const currentVideo = videoRefs.current[currentIndex]
      if (currentVideo) {
        if (next) {
          currentVideo.play().catch(() => {})
        } else {
          currentVideo.pause()
        }
      }
      return next
    })
  }, [currentIndex])

  const goToNext = useCallback((e?: MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex(prev => (prev + 1) % items.length)
  }, [items.length])

  const goToPrev = useCallback((e?: MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length)
  }, [items.length])

  // Touch swipe handling for mobile
  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (touchStartX === null) return
    const diffX = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diffX) > 40) {
      if (diffX > 0 && currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (diffX < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
    }
    setTouchStartX(null)
  }

  return (
    <div
      className={`relative w-full overflow-hidden select-none bg-[var(--surface-subtle)] ${
        ASPECT_RATIO_STYLES[aspectRatio]
      } ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {items.map((item, idx) => {
          const isActive = idx === currentIndex
          const itemFailed = hasError[idx]
          const itemLoading = isLoading[idx]

          return (
            <div
              key={`${item.url}-${idx}`}
              className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
                isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              {itemFailed ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-[var(--fg-muted)] bg-[var(--surface-subtle)]">
                  <ImageOff size={28} aria-hidden />
                  <span className="text-xs font-medium">Media unavailable</span>
                </div>
              ) : item.type === 'video' ? (
                <div className="relative w-full h-full bg-black">
                  <video
                    ref={el => {
                      videoRefs.current[idx] = el
                    }}
                    src={item.url}
                    poster={item.poster}
                    playsInline
                    loop
                    muted={isMuted}
                    preload="metadata"
                    onClick={togglePlay}
                    onLoadedData={() => {
                      setIsLoading(prev => ({ ...prev, [idx]: false }))
                    }}
                    onError={() => {
                      setHasError(prev => ({ ...prev, [idx]: true }))
                    }}
                    className="w-full h-full object-cover cursor-pointer"
                  />

                  {/* Video Play/Pause Overlay Indicator on Tap */}
                  <div
                    onClick={togglePlay}
                    className={`absolute inset-0 flex items-center justify-center bg-black/25 transition-opacity cursor-pointer ${
                      !isPlaying && isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/60 text-white backdrop-blur-md shadow-lg transition-transform hover:scale-110">
                      <Play size={22} className="ml-1" />
                    </div>
                  </div>

                  {/* Instagram / TikTok Style Floating Mute/Unmute Button */}
                  {isActive && (
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white bg-black/60 hover:bg-black/80 backdrop-blur-md transition-all active:scale-90 cursor-pointer border border-white/20 shadow-md"
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {itemLoading && (
                    <div className="absolute inset-0 animate-pulse bg-[var(--border)]/30" />
                  )}
                  <img
                    src={item.url}
                    alt={item.alt || alt}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={() => {
                      setIsLoading(prev => ({ ...prev, [idx]: false }))
                    }}
                    onError={() => {
                      setHasError(prev => ({ ...prev, [idx]: true }))
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Carousel Navigation Chevrons (only if multiple items) */}
      {isMultiMedia && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Carousel Dot Indicators (User Comment: "use dot indicators") */}
      {isMultiMedia && (
        <div className="absolute bottom-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
          {items.map((_, idx) => {
            const active = idx === currentIndex
            return (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 shadow-xs ${
                  active
                    ? 'w-5 bg-white'
                    : 'w-1.5 bg-white/50'
                }`}
              />
            )
          })}
        </div>
      )}

      {/* Overlays */}
      {overlayTopLeft && (
        <div className="absolute top-3 left-3 z-10 pointer-events-auto">
          {overlayTopLeft}
        </div>
      )}

      {overlayTopRight && (
        <div className="absolute top-3 right-3 z-10 pointer-events-auto">
          {overlayTopRight}
        </div>
      )}

      {overlayBottom && (
        <div className="absolute bottom-0 inset-x-0 z-10 pointer-events-auto">
          {overlayBottom}
        </div>
      )}
    </div>
  )
}
