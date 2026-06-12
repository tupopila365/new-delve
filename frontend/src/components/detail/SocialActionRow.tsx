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
        >
          {saved ? '♥ Saved' : '♡ Save'}
        </button>
      ) : null}
      {onShare ? (
        <button type="button" onClick={onShare}>
          ↗ Share
        </button>
      ) : null}
      {children}
    </div>
  )
}
