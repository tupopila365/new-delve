import { useState, type MouseEvent, type ReactNode } from 'react'
import { Share2 } from 'lucide-react'
import type { SharePayload } from '../../lib/shareUrl'
import { ShareSheet } from './ShareSheet'

type Props = {
  share: SharePayload
  className?: string
  /** Visible text next to the icon (e.g. "Share" on cards). */
  label?: string
  ariaLabel?: string
  iconSize?: number
  /** Stop card/link navigation when used inside a clickable parent. */
  stopPropagation?: boolean
  /** Custom trigger contents; defaults to Share icon (+ optional label). */
  children?: ReactNode
}

/** Reusable share trigger + preview sheet for stays, food, posts, profiles, etc. */
export function ShareButton({
  share,
  className = '',
  label,
  ariaLabel = 'Share',
  iconSize = 18,
  stopPropagation = false,
  children,
}: Props) {
  const [open, setOpen] = useState(false)

  const onClick = (e: MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault()
      e.stopPropagation()
    }
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className={`delve-share-btn ${className}`.trim()}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children ?? (
          <>
            <Share2 size={iconSize} strokeWidth={2.25} aria-hidden />
            {label ? <span>{label}</span> : null}
          </>
        )}
      </button>
      <ShareSheet open={open} onClose={() => setOpen(false)} share={share} />
    </>
  )
}
