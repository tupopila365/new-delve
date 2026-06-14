import { Heart, Share2 } from 'lucide-react'

type Props = {
  saved?: boolean
  onSave?: () => void
  onShare?: () => void
  shareLabel?: string
  className?: string
}

export function DetailHeroActions({
  saved = false,
  onSave,
  onShare,
  shareLabel = 'Share',
  className = '',
}: Props) {
  return (
    <div className={`dl-detail__hero-actions ${className}`.trim()}>
      {onSave ? (
        <button
          type="button"
          className={`dl-detail__hero-action${saved ? ' dl-detail__hero-action--saved' : ''}`}
          onClick={onSave}
          aria-label={saved ? 'Remove from saved' : 'Save'}
        >
          <Heart size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saved ? 'Saved' : 'Save'}
        </button>
      ) : null}
      {onShare ? (
        <button type="button" className="dl-detail__hero-action" onClick={onShare} aria-label={shareLabel}>
          <Share2 size={16} strokeWidth={2.25} aria-hidden />
          {shareLabel}
        </button>
      ) : null}
    </div>
  )
}
