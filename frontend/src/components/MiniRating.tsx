import { Star } from 'lucide-react'

/** Compact star rating for cards and hero (not for events). */

function parseRating(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return null
  return Math.min(5, Math.max(0, n))
}

type Props = {
  rating: string | number | null | undefined
  count?: number | null
  /** Lighter text for dark image overlays (e.g. home spotlight). */
  variant?: 'default' | 'onDark'
  className?: string
}

export function MiniRating({ rating, count, variant = 'default', className = '' }: Props) {
  const r = parseRating(rating)
  // A 0 rating means "not rated yet" — never surface it as a real score.
  if (r == null || r <= 0) return null
  const label = `${r.toFixed(1)} out of 5 stars${count != null && count > 0 ? `, ${count} reviews` : ''}`
  const rootClass = ['mini-rating', variant === 'onDark' ? 'mini-rating--on-dark' : '', className].filter(Boolean).join(' ')

  return (
    <span className={rootClass} role="img" aria-label={label}>
      <Star className="mini-rating__star" size={14} strokeWidth={2.25} fill="currentColor" aria-hidden />
      <span className="mini-rating__value">{r.toFixed(1)}</span>
      {count != null && count > 0 ? <span className="mini-rating__count">({count})</span> : null}
    </span>
  )
}
