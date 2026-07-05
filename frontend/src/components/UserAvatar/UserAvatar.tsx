import { useEffect, useMemo, useState } from 'react'
import { UserRound } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import './UserAvatar.css'

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type UserAvatarShape = 'circle' | 'rounded' | 'square'
export type UserAvatarFallback = 'icon' | 'initial'

type Props = {
  src?: string | null
  name?: string
  size?: UserAvatarSize
  shape?: UserAvatarShape
  fallback?: UserAvatarFallback
  /** Fill the parent container (width/height 100%). Use when the parent sets dimensions. */
  fill?: boolean
  className?: string
  alt?: string
  decorative?: boolean
}

const ICON_SIZE: Record<UserAvatarSize, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 28,
}

function avatarInitial(name?: string): string {
  const trimmed = (name || '?').trim()
  return trimmed.charAt(0).toUpperCase() || '?'
}

export function UserAvatar({
  src,
  name,
  size = 'md',
  shape = 'circle',
  fallback = 'icon',
  fill = false,
  className = '',
  alt,
  decorative = true,
}: Props) {
  const resolvedSrc = useMemo(() => mediaUrl(src ?? null), [src])
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [resolvedSrc])

  const showImage = Boolean(resolvedSrc && !imgFailed)
  const label = alt ?? (name?.trim() || 'User')
  const rootClass = [
    'user-avatar',
    `user-avatar--${size}`,
    `user-avatar--${shape}`,
    fill ? 'user-avatar--fill' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={rootClass}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : 'img'}
    >
      {showImage ? (
        <img
          className="user-avatar__img"
          src={resolvedSrc}
          alt={decorative ? '' : label}
          onError={() => setImgFailed(true)}
        />
      ) : fallback === 'initial' ? (
        <span className="user-avatar__initial" aria-hidden>
          {avatarInitial(name)}
        </span>
      ) : (
        <UserRound className="user-avatar__icon" size={ICON_SIZE[size]} strokeWidth={2} aria-hidden />
      )}
    </span>
  )
}
