import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export type TravelerAvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export interface TravelerAvatarProps {
  /** Image URL for the traveler profile or avatar */
  src?: string | null
  /** Descriptive alt text for screen readers */
  alt: string
  /** Size tier: 'sm' (32px), 'md' (40px), 'lg' (48px), or 'xl' (64px) */
  size?: TravelerAvatarSize
  /** Fallback initials (1-2 characters) rendered when image is absent or fails */
  fallbackInitials: string
  /** Optional badge overlay (e.g. verified icon or presence dot) */
  badge?: ReactNode
  /** Additional CSS classes */
  className?: string
  /** Optional click handler */
  onClick?: () => void
}

const SIZE_MAP: Record<
  TravelerAvatarSize,
  { container: string; text: string; badgePos: string }
> = {
  sm: {
    container: 'w-8 h-8 min-w-8 min-h-8',
    text: 'text-xs font-bold',
    badgePos: '-bottom-0.5 -right-0.5',
  },
  md: {
    container: 'w-10 h-10 min-w-10 min-h-10',
    text: 'text-sm font-bold',
    badgePos: '-bottom-0.5 -right-0.5',
  },
  lg: {
    container: 'w-12 h-12 min-w-12 min-h-12',
    text: 'text-base font-bold',
    badgePos: 'bottom-0 right-0',
  },
  xl: {
    container: 'w-16 h-16 min-w-16 min-h-16',
    text: 'text-lg font-extrabold',
    badgePos: 'bottom-0.5 right-0.5',
  },
}

export default function TravelerAvatar({
  src,
  alt,
  size = 'md',
  fallbackInitials,
  badge,
  className = '',
  onClick,
}: TravelerAvatarProps) {
  const [hasError, setHasError] = useState(false)

  // Reset error state if the src URL changes
  useEffect(() => {
    setHasError(false)
  }, [src])

  const config = SIZE_MAP[size]
  const cleanInitials = (fallbackInitials || alt || 'D')
    .slice(0, 2)
    .toUpperCase()

  const showImage = Boolean(src && !hasError)

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-shrink-0 select-none ${
        onClick ? 'cursor-pointer transition-transform active:scale-95' : ''
      } ${className}`}
    >
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center border transition-colors duration-150 ${
          config.container
        }`}
        style={{
          background: showImage ? 'var(--surface-subtle)' : 'rgba(95, 47, 201, 0.12)',
          borderColor: showImage ? 'var(--border)' : 'rgba(95, 47, 201, 0.25)',
          color: 'var(--primary)',
        }}
      >
        {showImage ? (
          <img
            src={src!}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className={`leading-none tracking-wider ${config.text}`}
            style={{ fontFamily: 'Syne, var(--font-display, sans-serif)' }}
            aria-label={alt}
          >
            {cleanInitials}
          </span>
        )}
      </div>

      {/* Optional Badge Overlay */}
      {badge && (
        <div className={`absolute z-10 ${config.badgePos}`}>
          {badge}
        </div>
      )}
    </div>
  )
}
