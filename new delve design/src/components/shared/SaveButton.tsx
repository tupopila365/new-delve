import { useState } from 'react'
import { Bookmark, Heart } from 'lucide-react'

export type SaveIconType = 'bookmark' | 'heart'

export interface SaveButtonProps {
  /** Indicates whether the entity is saved / bookmarked */
  isSaved: boolean
  /** Handler fired on click */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Which icon symbol to render: 'bookmark' (default) or 'heart' */
  iconType?: SaveIconType
  /** Size scale of the button */
  size?: 'sm' | 'md' | 'lg'
  /** Button style variant: 'filled' (glass pill for cards) or 'ghost' (minimal) */
  variant?: 'filled' | 'ghost'
  /** Custom accessible label */
  ariaLabel?: string
  /** Whether interactions are disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

const SIZE_CONFIG = {
  sm: { button: 'w-7 h-7 min-w-7 min-h-7', icon: 14 },
  md: { button: 'w-9 h-9 min-w-9 min-h-9', icon: 18 },
  lg: { button: 'w-11 h-11 min-w-11 min-h-11', icon: 22 },
}

export default function SaveButton({
  isSaved,
  onClick,
  iconType = 'bookmark',
  size = 'md',
  variant = 'filled',
  ariaLabel,
  disabled = false,
  className = '',
}: SaveButtonProps) {
  const [animating, setAnimating] = useState(false)
  const config = SIZE_CONFIG[size]

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation()
    if (disabled) return

    setAnimating(true)
    setTimeout(() => setAnimating(false), 250)
    onClick(e)
  }

  const defaultAriaLabel = isSaved
    ? iconType === 'heart'
      ? 'Unlike'
      : 'Remove from saved'
    : iconType === 'heart'
      ? 'Like'
      : 'Save to Delve'

  // Icon coloring & fill rules
  const iconColor = isSaved
    ? iconType === 'heart'
      ? '#EF4444'
      : 'var(--primary)'
    : 'currentColor'

  const iconFill = isSaved
    ? iconType === 'heart'
      ? '#EF4444'
      : 'var(--primary)'
    : 'none'

  const variantClasses =
    variant === 'filled'
      ? 'bg-black/35 hover:bg-black/55 text-white border border-white/20 backdrop-blur-md shadow-sm'
      : 'bg-transparent hover:bg-[var(--surface-subtle)] text-[var(--fg-muted)]'

  return (
    <button
      type="button"
      aria-label={ariaLabel || defaultAriaLabel}
      aria-pressed={isSaved}
      disabled={disabled}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ${
        config.button
      } ${variantClasses} ${className}`}
    >
      <span
        className={`inline-flex items-center justify-center transition-transform duration-200 ${
          animating ? 'scale-125' : isSaved ? 'scale-110' : 'scale-100'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {iconType === 'heart' ? (
          <Heart
            size={config.icon}
            color={iconColor}
            fill={iconFill}
            className="transition-colors duration-200"
            aria-hidden="true"
          />
        ) : (
          <Bookmark
            size={config.icon}
            color={iconColor}
            fill={iconFill}
            className="transition-colors duration-200"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  )
}
