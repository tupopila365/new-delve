import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline'
export type ButtonSize = 'md' | 'lg' | 'sm'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingLabel?: string
  fullWidth?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  /** Supports design-board previews for specific interactive states. */
  previewState?: 'default' | 'hover' | 'pressed' | 'focus' | 'loading' | 'disabled'
}

/**
 * Delve Core Primitive: Button
 *
 * Strict Design System Rules:
 * - Firmly enforces 48px height (`h-12 min-h-[48px]`)
 * - Firmly enforces 12px border radius (`rounded-xl`)
 * - Strictly uses Tailwind utilities and CSS variable tokens (`var(--primary)`, `var(--surface)`, `var(--border)`, `var(--fg)`)
 * - No hardcoded hex values or inline styles
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    fullWidth = false,
    iconLeft,
    iconRight,
    disabled = false,
    type = 'button',
    className = '',
    previewState,
    onClick,
    ...rest
  },
  ref,
) {
  const isLoading = loading || previewState === 'loading'
  const isDisabled = disabled || previewState === 'disabled'
  const isInactive = isLoading || isDisabled

  const isHovered = previewState === 'hover'
  const isPressed = previewState === 'pressed'
  const isFocused = previewState === 'focus'

  // Variant styling using theme tokens via CSS variables
  const variantClasses: Record<ButtonVariant, string> = {
    primary: [
      'bg-[var(--primary)] text-white border border-transparent',
      'hover:brightness-105 active:scale-[0.99] active:brightness-95',
      isHovered ? 'brightness-105' : '',
      isPressed ? 'scale-[0.99] brightness-95' : '',
    ]
      .filter(Boolean)
      .join(' '),
    secondary: [
      'bg-[var(--surface)] text-[var(--fg)] border border-[var(--border)]',
      'hover:bg-[var(--surface-subtle)] active:scale-[0.99]',
      isHovered ? 'bg-[var(--surface-subtle)]' : '',
      isPressed ? 'scale-[0.99] bg-[var(--surface-subtle)]' : '',
    ]
      .filter(Boolean)
      .join(' '),
    outline: [
      'bg-transparent text-[var(--fg)] border border-[var(--border)]',
      'hover:bg-[var(--surface-subtle)] active:scale-[0.99]',
      isHovered ? 'bg-[var(--surface-subtle)]' : '',
      isPressed ? 'scale-[0.99] bg-[var(--surface-subtle)]' : '',
    ]
      .filter(Boolean)
      .join(' '),
  }

  // Base layout enforcing 48px height (h-12 / min-h-[48px]) and 12px border radius (rounded-xl)
  const baseClasses = [
    'inline-flex items-center justify-center gap-2',
    'h-12 min-h-[48px]',
    'rounded-xl px-5 py-3',
    'text-sm font-semibold leading-none select-none',
    'transition-all duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary-focus)]',
    fullWidth ? 'w-full' : 'w-auto',
    isInactive ? 'opacity-45 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type={type}
      disabled={isInactive}
      aria-busy={isLoading || undefined}
      data-preview-focus={isFocused ? 'true' : undefined}
      onClick={isInactive ? undefined : onClick}
      className={baseClasses}
      {...rest}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" aria-hidden="true" />
          <span>{loadingLabel || children}</span>
        </>
      ) : (
        <>
          {iconLeft && <span className="inline-flex shrink-0">{iconLeft}</span>}
          <span>{children}</span>
          {iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  )
})

export default Button
