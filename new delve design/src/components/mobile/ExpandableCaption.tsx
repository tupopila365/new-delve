import { useState } from 'react'

interface ExpandableCaptionProps {
  authorFirstName?: string
  caption: string
  lines?: number
  className?: string
}

/** Wraps captions inside the card; never clips at the right edge. */
export default function ExpandableCaption({
  authorFirstName,
  caption,
  lines = 3,
  className = '',
}: ExpandableCaptionProps) {
  const [expanded, setExpanded] = useState(false)
  const needsClamp = caption.length > 120

  return (
    <div className={`min-w-0 w-full ${className}`}>
      <p
        className="text-sm leading-relaxed break-words"
        style={{
          color: 'var(--fg)',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          ...(!expanded && needsClamp
            ? {
                display: '-webkit-box',
                WebkitLineClamp: lines,
                WebkitBoxOrient: 'vertical' as const,
                overflow: 'hidden',
              }
            : {}),
        }}
      >
        {authorFirstName && (
          <span className="font-semibold">{authorFirstName}{' '}</span>
        )}
        {caption}
      </p>
      {needsClamp && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-sm font-semibold mt-0.5 min-h-[44px] inline-flex items-center"
          style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'More'}
        </button>
      )}
    </div>
  )
}
