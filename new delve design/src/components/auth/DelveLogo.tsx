import { Compass } from 'lucide-react'

export interface DelveLogoProps {
  size?: 'sm' | 'md' | 'lg'
  /** 'brand' uses Delve Purple, 'onImage' is for the travel panel, 'mono' inherits text. */
  tone?: 'brand' | 'onImage' | 'mono'
  showMark?: boolean
  showWordmark?: boolean
  onClick?: () => void
  ariaLabel?: string
}

const sizes = {
  sm: { text: 18, mark: 26, icon: 14 },
  md: { text: 24, mark: 34, icon: 18 },
  lg: { text: 32, mark: 44, icon: 24 },
}

export default function DelveLogo({
  size = 'md',
  tone = 'brand',
  showMark = true,
  showWordmark = true,
  onClick,
  ariaLabel = 'Delve home',
}: DelveLogoProps) {
  const s = sizes[size]
  const foreground = tone === 'onImage' ? '#FFFAF2' : tone === 'mono' ? 'var(--fg)' : 'var(--primary)'
  const markBackground =
    tone === 'onImage' ? 'rgba(255,250,242,0.18)' : 'rgba(140,82,255,0.12)'

  const content = (
    <span className="inline-flex items-center gap-2">
      {showMark && (
        <span
          className="inline-flex items-center justify-center rounded-xl"
          style={{ width: s.mark, height: s.mark, background: markBackground, color: foreground }}
        >
          <Compass size={s.icon} strokeWidth={2.2} />
        </span>
      )}
      {showWordmark && (
        <span
          className="font-display font-extrabold tracking-tight"
          style={{ fontSize: s.text, color: foreground, lineHeight: 1 }}
        >
          Delve
        </span>
      )}
    </span>
  )

  if (!onClick) return content

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex items-center rounded-xl"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', minHeight: 44 }}
    >
      {content}
    </button>
  )
}
