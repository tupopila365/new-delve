import { useEffect, useRef } from 'react'

interface JourneyCoverMediaProps {
  url: string
  resourceType?: 'image' | 'video' | string | null
  className?: string
  /** Card/list mode: autoplay muted, no controls */
  variant?: 'card' | 'hero' | 'inline'
}

export default function JourneyCoverMedia({
  url,
  resourceType,
  className = 'w-full h-full object-cover',
  variant = 'inline',
}: JourneyCoverMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (resourceType !== 'video' || variant === 'inline') return
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
  }, [resourceType, variant, url])

  if (resourceType === 'video') {
    return (
      <video
        ref={videoRef}
        src={url}
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
  return <img src={url} alt="" className={className} loading="lazy" />
}
