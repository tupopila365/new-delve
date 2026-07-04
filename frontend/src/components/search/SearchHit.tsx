import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { mediaUrl } from '../../api/client'
import './SearchHit.css'

type Props = {
  to: string
  title: string
  subtitle?: string
  meta?: string
  imageUrl?: string | null
  /** Round avatar vs square listing thumb. */
  imageVariant?: 'avatar' | 'thumb'
  fallbackIcon?: ReactNode
}

export function SearchHit({
  to,
  title,
  subtitle,
  meta,
  imageUrl,
  imageVariant = 'thumb',
  fallbackIcon,
}: Props) {
  const src = mediaUrl(imageUrl) ?? imageUrl ?? null
  const line = [subtitle, meta].filter(Boolean).join(' · ')

  return (
    <Link to={to} className="search-hit">
      {src ? (
        <img
          src={src}
          alt=""
          className={`search-hit__media search-hit__media--${imageVariant}`}
        />
      ) : (
        <span
          className={`search-hit__media search-hit__media--${imageVariant} search-hit__media--empty`}
          aria-hidden
        >
          {fallbackIcon}
        </span>
      )}
      <span className="search-hit__copy">
        <strong>{title}</strong>
        {line ? <span>{line}</span> : null}
      </span>
    </Link>
  )
}
