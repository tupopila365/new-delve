import { useEffect, useState } from 'react'
import { User } from 'lucide-react'

export interface MediaPreviewProps {
  previewUrl?: string | null
  deliveryUrl?: string | null
  /** Existing saved profile/media URL from the app (e.g. avatarUrl). */
  currentUrl?: string | null
  alt?: string
  size?: number
  /** Shown while the parent is still loading profile data. */
  loading?: boolean
  /** Used for initials when no image is available. */
  placeholderName?: string
}

function initialsFrom(name?: string) {
  const parts = (name || '')
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
  if (parts.length === 0) return ''
  return parts
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('')
}

export default function MediaPreview({
  previewUrl,
  deliveryUrl,
  currentUrl,
  alt = '',
  size = 72,
  loading = false,
  placeholderName,
}: MediaPreviewProps) {
  const preferred = previewUrl || deliveryUrl || currentUrl || null
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const src = preferred && preferred !== failedUrl ? preferred : null
  const initials = initialsFrom(placeholderName)

  useEffect(() => {
    setFailedUrl(null)
  }, [preferred])

  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: 'rgba(140,82,255,0.18)',
        border: '1px solid var(--border)',
        color: 'var(--primary)',
      }}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span
          className="block rounded-full animate-pulse"
          style={{ width: '40%', height: '40%', background: 'rgba(255,255,255,0.35)' }}
          aria-hidden
        />
      ) : src ? (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          decoding="async"
          onError={() => setFailedUrl(src)}
        />
      ) : initials ? (
        <span className="text-sm font-bold select-none" aria-hidden>
          {initials}
        </span>
      ) : (
        <User size={Math.max(18, Math.round(size * 0.4))} aria-hidden />
      )}
    </div>
  )
}
