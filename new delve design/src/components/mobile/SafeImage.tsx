import { useState } from 'react'
import { ImageOff, RefreshCw } from 'lucide-react'
import type { CSSProperties } from 'react'

export type MediaFallbackKind =
  | 'avatar'
  | 'listing'
  | 'transport'
  | 'journey'
  | 'community'
  | 'post'
  | 'business'
  | 'generic'

interface SafeImageProps {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  kind?: MediaFallbackKind
  onRetry?: () => void
}

const KIND_LABEL: Record<MediaFallbackKind, string> = {
  avatar: 'Photo unavailable',
  listing: 'Listing photo unavailable',
  transport: 'Transport photo unavailable',
  journey: 'Journey photo unavailable',
  community: 'Community photo unavailable',
  post: 'Media unavailable',
  business: 'Business logo unavailable',
  generic: 'Image unavailable',
}

export default function SafeImage({
  src,
  alt = '',
  className = '',
  style,
  kind = 'generic',
  onRetry,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  if (failed || !src) {
    return (
      <div
        className={`safe-image-fallback flex flex-col items-center justify-center gap-2 ${className}`}
        style={{
          background: 'var(--surface-subtle)',
          color: 'var(--fg-muted)',
          minHeight: style?.minHeight ?? 120,
          ...style,
        }}
        role="img"
        aria-label={KIND_LABEL[kind]}
      >
        <ImageOff size={22} aria-hidden />
        <span className="text-xs font-medium px-3 text-center">{KIND_LABEL[kind]}</span>
        {(onRetry || src) && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg min-h-[44px]"
            style={{ color: 'var(--primary)', background: 'rgba(140,82,255,0.1)', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              setFailed(false)
              setLoading(true)
              setKey(k => k + 1)
              onRetry?.()
            }}
          >
            <RefreshCw size={14} aria-hidden />
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {loading && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ background: 'var(--surface-subtle)' }}
          aria-hidden
        />
      )}
      <img
        key={key}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
        style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.2s' }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setFailed(true)
        }}
      />
    </div>
  )
}
