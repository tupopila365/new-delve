import type { ReactNode } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import DelveLogo from './DelveLogo'

export interface AuthHeaderProps {
  onBack?: () => void
  backLabel?: string
  onClose?: () => void
  onLogoClick?: () => void
  showLogo?: boolean
  /** When false, only the mark image is shown (no DELVE wordmark). */
  showWordmark?: boolean
  /**
   * Where to show the header logo relative to the hero panel.
   * `mobile-only` hides it on lg+ when the split hero panel is visible.
   */
  logoPlacement?: 'always' | 'mobile-only' | 'never'
  /** Slot for the theme toggle or a help link. */
  trailing?: ReactNode
  /** Step progress for multi-step flows such as sign-up. */
  step?: { current: number; total: number; label?: string }
}

export default function AuthHeader({
  onBack,
  backLabel = 'Back',
  onClose,
  onLogoClick,
  showLogo = true,
  showWordmark = true,
  logoPlacement = 'always',
  trailing,
  step,
}: AuthHeaderProps) {
  return (
    <header className="w-full">
      <div className="flex items-center gap-3 min-h-[44px]">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg"
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: '0 10px 0 6px',
              background: 'transparent',
              border: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={17} />
            {backLabel}
          </button>
        )}
        {showLogo && !onBack && logoPlacement !== 'never' && (
          <span className={logoPlacement === 'mobile-only' ? 'lg:hidden' : undefined}>
            <DelveLogo size="sm" showWordmark={showWordmark} onClick={onLogoClick} />
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {trailing}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center rounded-lg"
              style={{
                width: 44,
                height: 44,
                background: 'transparent',
                border: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {step && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
              Step {step.current} of {step.total}
            </span>
            {step.label && (
              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {step.label}
              </span>
            )}
          </div>
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-valuenow={step.current}
            aria-valuemin={1}
            aria-valuemax={step.total}
            aria-label={`Sign-up progress: step ${step.current} of ${step.total}`}
          >
            {Array.from({ length: step.total }, (_, index) => (
              <span
                key={index}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 999,
                  background: index < step.current ? 'var(--primary)' : 'var(--border)',
                  transition: 'background 0.25s',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
