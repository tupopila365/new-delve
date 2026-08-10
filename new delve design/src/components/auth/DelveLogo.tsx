import delveMark from '../../assets/brand/DELVE.png'

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
  sm: { text: 18, mark: 26 },
  md: { text: 22, mark: 32 },
  lg: { text: 28, mark: 40 },
}

export default function DelveLogo({
  size = 'md',
  tone = 'brand',
  showMark = true,
  showWordmark = true,
  onClick,
  ariaLabel = 'DELVE home',
}: DelveLogoProps) {
  const s = sizes[size]
  const foreground = tone === 'onImage' ? '#FFFAF2' : tone === 'mono' ? 'var(--fg)' : 'var(--primary)'

  const content = (
    <span className="inline-flex items-center gap-2 min-w-0">
      {showMark && (
        <img
          src={delveMark}
          alt=""
          width={s.mark}
          height={s.mark}
          className="rounded-md object-contain shrink-0"
          style={{ width: s.mark, height: s.mark }}
          draggable={false}
        />
      )}
      {showWordmark && (
        <span
          className="font-display font-extrabold tracking-tight uppercase"
          style={{ fontFamily: 'Syne, sans-serif', fontSize: s.text, color: foreground, lineHeight: 1 }}
        >
          DELVE
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
