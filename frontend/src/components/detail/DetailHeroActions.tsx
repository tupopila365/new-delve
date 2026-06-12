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
        >
          {saved ? '♥ Saved' : '♡ Save'}
        </button>
      ) : null}
      {onShare ? (
        <button type="button" className="dl-detail__hero-action" onClick={onShare}>
          ↗ {shareLabel}
        </button>
      ) : null}
    </div>
  )
}
