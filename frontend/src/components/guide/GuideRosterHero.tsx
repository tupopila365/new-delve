import { Link } from 'react-router-dom'
import { Bookmark, ChevronLeft, Share2 } from 'lucide-react'

type Props = {
  displayName: string
  specialityLabel: string
  backTo: string
  backLabel?: string
  saved: boolean
  onSave: () => void
  onShare: () => void
}

/** Compact portrait-forward roster hero when a guide has no gallery media. */
export function GuideRosterHero({
  displayName,
  specialityLabel,
  backTo,
  backLabel = 'Guides',
  saved,
  onSave,
  onShare,
}: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase() || 'G'

  return (
    <div className="jd-hero gd-roster-hero" role="img" aria-label={`${displayName} — ${specialityLabel}`}>
      <Link to={backTo} className="jd-hero__back">
        <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
        {backLabel}
      </Link>

      <div className="jd-hero__acts">
        <button type="button" className="jd-hero__act" onClick={onShare} aria-label="Share guide">
          <Share2 size={16} strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          className={`jd-hero__act jd-hero__act--save${saved ? ' is-active' : ''}`}
          onClick={onSave}
          aria-label={saved ? 'Saved' : 'Save guide'}
          aria-pressed={saved}
        >
          <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>

      <div className="gd-roster-hero__stage">
        <span className="gd-roster-hero__monogram" aria-hidden>
          {initial}
        </span>
        <div className="gd-roster-hero__copy">
          <span className="gd-roster-hero__badge">{specialityLabel}</span>
          <span className="gd-roster-hero__name">{displayName}</span>
        </div>
      </div>
    </div>
  )
}
