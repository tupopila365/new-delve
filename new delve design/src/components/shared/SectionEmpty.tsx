import type { ReactNode } from 'react'

export interface SectionEmptyProps {
  /** Descriptive icon displayed at the top of the empty state */
  icon: ReactNode
  /** Headline message explaining what is absent (e.g. "No saved items yet") */
  title: string
  /** Subordinate text providing helpful context or prompting next actions */
  description?: string
  /** Backward-compatible alias for description */
  body?: string
  /** Optional interactive CTA button or link element */
  action?: ReactNode
  /** Additional container CSS classes */
  className?: string
}

export default function SectionEmpty({
  icon,
  title,
  description,
  body,
  action,
  className = '',
}: SectionEmptyProps) {
  const resolvedDescription = description || body || ''
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center py-12 sm:py-16 px-6 rounded-3xl transition-all duration-200 ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Icon Capsule */}
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 hover:scale-105"
        style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          color: 'var(--primary)',
        }}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Copy */}
      <h3
        className="text-base sm:text-lg font-bold tracking-tight m-0 mb-1.5"
        style={{
          fontFamily: 'Syne, var(--font-display, sans-serif)',
          color: 'var(--fg)',
        }}
      >
        {title}
      </h3>
      {resolvedDescription && (
        <p
          className="text-xs sm:text-sm m-0 max-w-sm leading-relaxed"
          style={{ color: 'var(--fg-muted)' }}
        >
          {resolvedDescription}
        </p>
      )}

      {/* Optional Action Element */}
      {action && (
        <div className="mt-5 flex items-center justify-center">
          {action}
        </div>
      )}
    </div>
  )
}
