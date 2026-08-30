import { useEffect, useRef } from 'react'
import { useLocalVideo } from '../../media/useLocalMediaStore'

interface JourneyCoverMediaProps {
  url: string
  resourceType?: 'image' | 'video' | string | null
  className?: string
  alt?: string
  /** Card/list mode: autoplay muted, no controls */
  variant?: 'card' | 'hero' | 'inline'
  /**
   * 'high' — fetchpriority=high, no lazy-load (use for LCP / above-fold images).
   * 'low'  — loading=lazy, decoding=async (use for below-fold card images).
   * Default: 'low'
   */
  priority?: 'high' | 'low'
}

export default function JourneyCoverMedia({
  url,
  resourceType,
  className = 'w-full h-full object-cover',
  alt = '',
  variant = 'inline',
  priority = 'low',
}: JourneyCoverMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const localVideo = useLocalVideo(url)
  const activeUrl = localVideo?.blobUrl || url
  const isVideo = resourceType === 'video' || Boolean(localVideo)

  useEffect(() => {
    if (!isVideo || variant === 'inline') return
    const el = videoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void el.play().catch(() => {})
          } else {
            el.pause()
          }
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isVideo, variant, activeUrl])

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={activeUrl}
        className={className}
        controls={variant === 'inline'}
        playsInline
        muted
        loop={variant !== 'inline'}
        autoPlay={variant === 'card'}
        preload={variant === 'card' ? 'metadata' : 'none'}
      />
    )
  }

  if (priority === 'high') {
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — fetchpriority is a valid HTML attribute not yet in React types
        fetchpriority="high"
        decoding="async"
      />
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}
