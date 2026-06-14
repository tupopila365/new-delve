import type { ReactNode } from 'react'
import { Heart, Share2 } from 'lucide-react'

type Props = {
  saved?: boolean
  onSave?: () => void
  onShare?: () => void
  children?: ReactNode
}

export function SocialActionRow({ saved, onSave, onShare, children }: Props) {
  return (
    <div className="dl-detail__social-row acc-detail__social-row">
      {onSave ? (
        <button
          type="button"
          className={saved ? 'dl-detail__social-btn--saved acc-detail__social-btn--saved' : ''}
          onClick={onSave}
          aria-label={saved ? 'Remove from saved' : 'Save'}
        >
          <Heart size={15} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          {saved ? 'Saved' : 'Save'}
        </button>
      ) : null}
      {onShare ? (
        <button type="button" onClick={onShare} aria-label="Share">
          <Share2 size={15} strokeWidth={2.25} aria-hidden />
          Share
        </button>
      ) : null}
      {children}
    </div>
  )
}
