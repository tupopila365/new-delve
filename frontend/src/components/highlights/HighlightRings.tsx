import { foodCoverSrc } from '../../utils/foodDisplay'

export type HighlightRingItem = {
  id: string
  label: string
  coverSrc: string
  seen?: boolean
  /** Food list fallback when cover fails to load. */
  cuisine?: string
}

type Props = {
  rings: HighlightRingItem[]
  activeId?: string | null
  onSelect: (id: string) => void
  className?: string
  rowClassName?: string
  onImgError?: (e: React.SyntheticEvent<HTMLImageElement>) => void
}

export function HighlightRings({
  rings,
  activeId,
  onSelect,
  className,
  rowClassName,
  onImgError,
}: Props) {
  if (rings.length === 0) return null

  return (
    <div className={className}>
      <div className={rowClassName ?? 'ev-page__story-rings-row fd-venue-stories__rings'}>
        {rings.map((ring) => (
          <button
            key={ring.id}
            type="button"
            className={`ev-story-ring${ring.seen ? ' ev-story-ring--seen' : ''}${activeId === ring.id ? ' ev-story-ring--active' : ''}`}
            onClick={() => onSelect(ring.id)}
            aria-label={`Open ${ring.label} highlight`}
            aria-pressed={activeId === ring.id}
          >
            <span className="ev-story-ring__avatar">
              <img
                src={ring.coverSrc}
                alt=""
                loading="lazy"
                onError={(e) => {
                  if (ring.cuisine) {
                    const fallback = foodCoverSrc(null, ring.cuisine)
                    if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback
                  }
                  onImgError?.(e)
                }}
              />
            </span>
            <span className="ev-story-ring__label">{ring.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
