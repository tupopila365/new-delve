import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export interface SectionHeaderProps {
  /** The primary headline for the section */
  title: string
  /** Secondary explanatory text displayed under or alongside the title */
  subtitle?: string
  /** Text for the right-aligned action trigger (e.g. "View all", "Explore") */
  actionLabel?: string
  /** Callback triggered when the action link is pressed */
  onActionClick?: () => void
  /** Optional icon rendered immediately before the title */
  icon?: ReactNode
  /** Optional badge or chip placed next to the title */
  badge?: ReactNode
  /** Optional custom container CSS classes */
  className?: string
}

export default function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionClick,
  icon,
  badge,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 mb-4 ${className}`}
    >
      {/* Title & Subtitle Block */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {icon && (
            <span
              className="flex-shrink-0 inline-flex items-center justify-center text-[var(--primary)]"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          <h2
            className="text-lg sm:text-xl font-bold tracking-tight m-0 truncate"
            style={{
              fontFamily: 'Syne, var(--font-display, sans-serif)',
              color: 'var(--fg)',
            }}
          >
            {title}
          </h2>
          {badge && <span className="flex-shrink-0">{badge}</span>}
        </div>

        {subtitle && (
          <p
            className="text-xs sm:text-sm m-0 mt-1 line-clamp-2"
            style={{ color: 'var(--fg-muted)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Action Button Link */}
      {actionLabel && onActionClick && (
        <button
          type="button"
          onClick={onActionClick}
          className="group inline-flex items-center gap-1 text-xs sm:text-sm font-semibold self-start sm:self-end flex-shrink-0 transition-all duration-150 hover:opacity-85 active:scale-95 cursor-pointer"
          style={{ color: 'var(--primary)' }}
        >
          <span>{actionLabel}</span>
          <ChevronRight
            size={15}
            className="transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  )
}
