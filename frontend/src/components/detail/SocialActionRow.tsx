import type { ReactNode } from 'react'

type Props = {
  saved?: boolean
  onSave?: () => void
  onShare?: () => void
  children?: ReactNode
}

export function SocialActionRow({ saved, onSave, onShare, children }: Props) {
  return (
    <div className="dl-detail__social-row">
      {onSave ? (
        <button
          type="button"
          className={saved ? 'dl-detail__social-btn--saved' : ''}
          onClick={onSave}
          aria-label={saved ? 'Remove from saved' : 'Save'}
        >
          {saved ? '♥ Saved' : '♡ Save'}
        </button>
      ) : null}
      {onShare ? (
        <button type="button" onClick={onShare} aria-label="Share">
          ↗ Share
        </button>
      ) : null}
      {children}
    </div>
  )
}
