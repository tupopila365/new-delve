import type { ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'
import type { ButtonState } from '../../data/authConfig'

export interface PrimaryButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  size?: 'md' | 'lg'
  iconLeft?: ReactNode
  iconRight?: ReactNode
  loadingLabel?: string
  /** Forces a visual state so the design board can show hover/pressed/focus. */
  previewState?: ButtonState
}

export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'lg',
  iconLeft,
  iconRight,
  loadingLabel = 'Working…',
  previewState,
}: PrimaryButtonProps) {
  const isLoading = loading || previewState === 'loading'
  const isDisabled = disabled || previewState === 'disabled'
  // A loading button must never accept a second submit.
  const inactive = isLoading || isDisabled

  const height = size === 'lg' ? 52 : 44
  const hovered = previewState === 'hover'
  const pressed = previewState === 'pressed'

  return (
    <button
      type={type}
      onClick={inactive ? undefined : onClick}
      disabled={inactive}
      aria-busy={isLoading || undefined}
      className={`auth-button auth-button--primary inline-flex items-center justify-center gap-2 font-semibold ${
        fullWidth ? 'w-full' : ''
      }`}
      data-preview-focus={previewState === 'focus' ? 'true' : undefined}
      style={{
        minHeight: height,
        padding: '0 20px',
        borderRadius: 12,
        border: 'none',
        background: pressed ? 'var(--primary-focus)' : 'var(--primary)',
        color: '#FFFFFF',
        fontSize: size === 'lg' ? 16 : 15,
        cursor: inactive ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.45 : 1,
        filter: hovered ? 'brightness(1.08)' : undefined,
        transform: pressed ? 'scale(0.99)' : undefined,
        transition: 'filter 0.15s, transform 0.1s, opacity 0.15s',
      }}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size={17} />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {iconLeft}
          <span>{children}</span>
          {iconRight}
        </>
      )}
    </button>
  )
}
