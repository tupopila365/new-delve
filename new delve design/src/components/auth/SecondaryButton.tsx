import type { ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'
import type { ButtonState } from '../../data/authConfig'

export interface SecondaryButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  size?: 'md' | 'lg'
  iconLeft?: ReactNode
  iconRight?: ReactNode
  previewState?: ButtonState
}

export default function SecondaryButton({
  children,
  onClick,
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'lg',
  iconLeft,
  iconRight,
  previewState,
}: SecondaryButtonProps) {
  const isLoading = loading || previewState === 'loading'
  const isDisabled = disabled || previewState === 'disabled'
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
      className={`auth-button inline-flex items-center justify-center gap-2 font-semibold ${fullWidth ? 'w-full' : ''}`}
      data-preview-focus={previewState === 'focus' ? 'true' : undefined}
      style={{
        minHeight: height,
        padding: '0 20px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: hovered || pressed ? 'var(--surface-subtle)' : 'var(--surface)',
        color: 'var(--fg)',
        fontSize: size === 'lg' ? 16 : 15,
        cursor: inactive ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.45 : 1,
        transform: pressed ? 'scale(0.99)' : undefined,
        transition: 'background 0.15s, transform 0.1s, opacity 0.15s',
      }}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size={17} />
          <span>Working…</span>
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
